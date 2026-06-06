/**
 * Honduras Tax Calculation Library
 * 
 * Centralized library for calculating Honduran taxes (ISR, IHSS, RAP)
 * based on year-specific tax brackets stored in database.
 */

import { createAdminClient } from '../supabase/server'
import { statutoryJsonToHndTaxConstants } from './statutory-config'
import type { PayrollStatutoryTrace } from './statutory-trace'
import {
  embeddedHndFallbackForYear,
  HND_FALLBACK_2025_CONSTANTS,
  HND_FALLBACK_2026_CONSTANTS,
  type TaxBracket,
  type TaxConstants,
} from './hnd-fallback-constants'

export type { TaxBracket, TaxConstants }
export { HND_FALLBACK_2025_CONSTANTS, HND_FALLBACK_2026_CONSTANTS }

const DEFAULT_2025_CONSTANTS = HND_FALLBACK_2025_CONSTANTS

export type TaxBracketsWithTrace = {
  constants: TaxConstants
  trace: PayrollStatutoryTrace
}

/**
 * Honduras: constantes fiscales con trazabilidad (tabla fuente / fallback).
 */
export async function getTaxBracketsForYearWithTrace(
  year: number,
  countryCode: string = 'HND'
): Promise<TaxBracketsWithTrace> {
  if (countryCode !== 'HND') {
    throw new Error(
      `getTaxBracketsForYearWithTrace: solo HND; recibido ${countryCode}. Use getTaxEngine().loadYearContext.`
    )
  }

  const baseTrace = (
    src: PayrollStatutoryTrace['dataSource'],
    opts: {
      resolvedYear: number
      usedFallback: boolean
      sourceLabel?: string
      notes?: string
    }
  ): PayrollStatutoryTrace => ({
    countryCode: 'HND',
    year,
    requestedYear: year,
    resolvedYear: opts.resolvedYear,
    usedFallback: opts.usedFallback,
    dataSource: src,
    sourceLabel: opts.sourceLabel,
    notes: opts.notes
  })

  try {
    const supabase = createAdminClient()

    const { data: statutoryRow } = await supabase
      .from('payroll_statutory_params')
      .select('statutory_config, source, notes')
      .eq('country_code', 'HND')
      .eq('year', year)
      .eq('is_active', true)
      .maybeSingle()

    const fromStatutory = statutoryJsonToHndTaxConstants(statutoryRow?.statutory_config)
    if (fromStatutory) {
      return {
        constants: fromStatutory as TaxConstants,
        trace: baseTrace('payroll_statutory_params', {
          resolvedYear: year,
          usedFallback: false,
          sourceLabel: statutoryRow?.source ?? undefined,
          notes: statutoryRow?.notes ?? undefined
        })
      }
    }

    let { data, error } = await supabase
      .from('tax_brackets')
      .select('*')
      .eq('year', year)
      .eq('country_code', 'HND')
      .eq('is_active', true)
      .single()

    if (error || !data) {
      const { data: recentData, error: recentError } = await supabase
        .from('tax_brackets')
        .select('*')
        .eq('country_code', 'HND')
        .eq('is_active', true)
        .order('year', { ascending: false })
        .limit(1)
        .single()

      if (!recentError && recentData) {
        data = recentData
        console.warn(`Tax bracket for year ${year} not found or inactive, using year ${recentData.year} as fallback`)
      }
    }

    if (data) {
      const usedYear = Number(data.year)
      const isExactYear = usedYear === year
      return {
        constants: {
          minimum_wage: Number(data.minimum_wage),
          ihss_ceiling: Number(data.ihss_ceiling),
          ihss_employee_rate: Number(data.ihss_employee_rate),
          rap_rate: Number(data.rap_rate),
          isr_brackets: (data.isr_brackets as any[]).map(b => ({
            limit: b.limit === 999999999 ? Infinity : Number(b.limit),
            rate: Number(b.rate),
            base: Number(b.base),
            lower: Number(b.lower)
          })),
          medical_deduction_limit: Number((data as any).medical_deduction_limit) || 40000
        },
        trace: baseTrace('tax_brackets', {
          resolvedYear: usedYear,
          usedFallback: !isExactYear,
          sourceLabel: (data as { source?: string }).source ?? 'tax_brackets',
          notes: isExactYear ? `tax_brackets HND year=${year}` : `tax_brackets HND fallback row year=${usedYear} requested=${year}`
        })
      }
    }
  } catch (error) {
    console.error('Error fetching tax brackets from DB:', error)
  }

  console.warn(`Tax brackets for year ${year} not found, using embedded HND fallback`)
  const fallback = embeddedHndFallbackForYear(year)
  const fallbackYear = year >= 2026 ? 2026 : 2025
  return {
    constants: fallback,
    trace: baseTrace('fallback_default', {
      resolvedYear: fallbackYear,
      usedFallback: true,
      sourceLabel: fallbackYear >= 2026 ? 'HND_FALLBACK_2026_CONSTANTS' : 'HND_FALLBACK_2025_CONSTANTS',
      notes: `No DB row; embedded fallback constants for ${fallbackYear}`
    })
  }
}

/**
 * Get tax brackets and constants for a specific year
 * Falls back to most recent active year or default if not found
 *
 * IMPORTANT: is_active controls whether a table can be used:
 * - If is_active = false, the table won't be used even for its specific year
 * - This allows disabling tables with errors without deleting them
 */
export async function getTaxBracketsForYear(
  year: number,
  countryCode: string = 'HND'
): Promise<TaxConstants> {
  const { constants } = await getTaxBracketsForYearWithTrace(year, countryCode)
  return constants
}

export interface ISRProjectedParams {
  monthlyIncome: number
  /** Calendar month (1-12) or months elapsed (e.g. 2.5 for mid-March) */
  month: number
  ytdIncome: number
  ytdWithheld: number
  medicalExpensesUsed?: number
  brackets: TaxBracket[]
  medicalDeductionLimit?: number
}

/**
 * Calculate ISR with annual projection (PAYE)
 * Projects annual income from YTD + current period, applies brackets to annual taxable,
 * then prorates to get withholding for current period.
 */
export function calculateISRProjected(params: ISRProjectedParams): number {
  const {
    monthlyIncome,
    month,
    ytdIncome,
    ytdWithheld,
    medicalExpensesUsed = 0,
    brackets,
    medicalDeductionLimit = 40000
  } = params

  if (month < 0.5 || month > 12) return 0
  const totalIncomeToDate = ytdIncome + monthlyIncome
  if (totalIncomeToDate <= 0) return 0

  const projectedAnnual = (totalIncomeToDate / month) * 12
  const taxableAnnual = Math.max(0, projectedAnnual - Math.min(medicalDeductionLimit, medicalExpensesUsed))
  const annualTax = calculateISR(taxableAnnual, brackets)
  const targetYtdWithheld = (annualTax / 12) * month
  const withheldThisPeriod = Math.max(0, targetYtdWithheld - ytdWithheld)

  return Math.round(withheldThisPeriod * 100) / 100
}

/**
 * Calculate ISR (Impuesto sobre la Renta) for a monthly salary
 */
export function calculateISR(salary: number, brackets: TaxBracket[]): number {
  for (const bracket of brackets) {
    if (salary <= bracket.limit) {
      if (bracket.rate === 0) return 0
      
      if (bracket.base === 0) {
        // First bracket: apply rate from lower limit
        return Math.max(0, (salary - bracket.lower) * bracket.rate)
      } else {
        // Bracket with base: apply base + rate on excess
        return bracket.base + Math.max(0, (salary - bracket.lower) * bracket.rate)
      }
    }
  }
  return 0
}

/**
 * Calculate IHSS (Instituto Hondureño de Seguridad Social) for employee
 */
export function calculateIHSS(salary: number, constants: TaxConstants): number {
  const ihssBase = Math.min(salary, constants.ihss_ceiling)
  return ihssBase * constants.ihss_employee_rate
}

/**
 * Calculate RAP (FOVIIF obrero): 1.5% sobre excedente del techo IHSS IVM.
 */
export function calculateRAP(salary: number, constants: TaxConstants): number {
  return Math.max(0, salary - constants.ihss_ceiling) * constants.rap_rate
}

/**
 * Calculate all taxes for a monthly salary for a specific year
 */
export async function calculateAllTaxes(
  salary: number,
  year: number
): Promise<{
  isr: number
  ihss: number
  rap: number
  totalDeductions: number
}> {
  const constants = await getTaxBracketsForYear(year)
  
  const isr = calculateISR(salary, constants.isr_brackets)
  const ihss = calculateIHSS(salary, constants)
  const rap = calculateRAP(salary, constants)
  
  return {
    isr: Math.round(isr * 100) / 100,
    ihss: Math.round(ihss * 100) / 100,
    rap: Math.round(rap * 100) / 100,
    totalDeductions: Math.round((isr + ihss + rap) * 100) / 100
  }
}

/**
 * Synchronous version using provided constants (for backward compatibility)
 */
export function calculateAllTaxesSync(
  salary: number,
  constants: TaxConstants
): {
  isr: number
  ihss: number
  rap: number
  totalDeductions: number
} {
  const isr = calculateISR(salary, constants.isr_brackets)
  const ihss = calculateIHSS(salary, constants)
  const rap = calculateRAP(salary, constants)
  
  return {
    isr: Math.round(isr * 100) / 100,
    ihss: Math.round(ihss * 100) / 100,
    rap: Math.round(rap * 100) / 100,
    totalDeductions: Math.round((isr + ihss + rap) * 100) / 100
  }
}

