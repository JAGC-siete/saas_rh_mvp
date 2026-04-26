import type { CountryCode } from '../country/supported'
import { createAdminClient } from '../supabase/server'
import { parseStatutoryConfigForPayroll } from '../tax/statutory-config-validate'
import { StatutoryParamsMissingError } from '../tax/statutory-payroll-errors'
import {
  calculateIHSS,
  calculateISR,
  calculateRAP,
  getTaxBracketsForYear,
  type TaxBracket,
  type TaxConstants
} from '../tax/honduras-tax'
import { calculateSlvMonthlyIsrUsd, normalizeSlvMonthlyBrackets } from '../tax/slv-isr'
import { calculateGtmMonthlyIsrFromAnnualConfig, type GtmIsrAnnualConfig } from '../tax/gtm-isr'

export type ComputePayrollStatutoryInput = {
  countryCode: CountryCode
  year: number
  baseMonthlySalary: number
  factor2Pagos: number
  legalDeductions: { ihss: boolean; rap: boolean; isr: boolean }
  /** Base mensual para ISR sin proyección (p. ej. hourly → total del período) */
  simpleIsrMonthlyBase: number
  useIsrProjection: boolean
  runIsrProjection?: () => Promise<number>
  /** Guatemala: base sujeta a IGSS (sin bonificación incentivo, etc.) */
  igssTaxableMonthly?: number
  /** Evita N+1 queries si ya cargaste constantes HND */
  hndTaxConstants?: TaxConstants
  supabase?: any
  /**
   * SLV/GTM: `exact` exige fila para `year` (sin año sustituto). `fallback` solo para herramientas internas.
   * @default 'exact'
   */
  statutoryYearResolution?: 'exact' | 'fallback'
}

type StatutoryCountry = Extract<CountryCode, 'SLV' | 'GTM'>

/** Fila exacta país/año en payroll_statutory_params (tests y admin). */
export async function loadStatutoryConfigExact(
  countryCode: StatutoryCountry,
  year: number,
  supabase: { from: (t: string) => unknown }
): Promise<Record<string, unknown> | null> {
  const { data, error } = await (supabase as any)
    .from('payroll_statutory_params')
    .select('statutory_config')
    .eq('country_code', countryCode)
    .eq('year', year)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data?.statutory_config) return null
  return data.statutory_config as Record<string, unknown>
}

/** Último año activo si no hay fila exacta (solo uso interno / resolución fallback). */
export async function loadStatutoryConfigWithFallbackMeta(
  countryCode: StatutoryCountry,
  year: number,
  supabase: { from: (t: string) => unknown }
): Promise<{ config: Record<string, unknown> | null; resolvedYear: number; usedFallback: boolean }> {
  const exact = await loadStatutoryConfigExact(countryCode, year, supabase)
  if (exact) return { config: exact, resolvedYear: year, usedFallback: false }

  const { data: recent } = await (supabase as any)
    .from('payroll_statutory_params')
    .select('statutory_config,year')
    .eq('country_code', countryCode)
    .eq('is_active', true)
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!recent?.statutory_config) return { config: null, resolvedYear: year, usedFallback: false }
  return {
    config: recent.statutory_config as Record<string, unknown>,
    resolvedYear: Number(recent.year),
    usedFallback: true
  }
}

async function loadValidatedStatutoryConfig(
  countryCode: StatutoryCountry,
  year: number,
  supabase: { from: (t: string) => unknown },
  resolution: 'exact' | 'fallback'
): Promise<Record<string, unknown>> {
  if (resolution === 'exact') {
    const raw = await loadStatutoryConfigExact(countryCode, year, supabase)
    if (!raw) throw new StatutoryParamsMissingError(countryCode, year)
    return parseStatutoryConfigForPayroll(countryCode, raw)
  }
  const fb = await loadStatutoryConfigWithFallbackMeta(countryCode, year, supabase)
  if (!fb.config) throw new StatutoryParamsMissingError(countryCode, year)
  return parseStatutoryConfigForPayroll(countryCode, fb.config)
}

function normalizeIsrBracketsFromJson(raw: unknown): TaxBracket[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  return raw.map((b: any) => ({
    limit: b.limit === 999999999 ? Infinity : Number(b.limit),
    rate: Number(b.rate),
    base: Number(b.base),
    lower: Number(b.lower)
  }))
}

/**
 * Deducciones de ley por empleado para un período (IHSS/RAP/ISR en HN; ISSS/AFP/ISR en SV; IGSS en GT).
 * Los campos de retorno mantienen nombres legacy ihss/rap/isr para compatibilidad con planilla y DB.
 */
export async function computePayrollEmployeeStatutoryDeductions(
  input: ComputePayrollStatutoryInput
): Promise<{ ihss: number; rap: number; isr: number }> {
  const {
    countryCode,
    year,
    baseMonthlySalary,
    factor2Pagos,
    legalDeductions,
    simpleIsrMonthlyBase,
    useIsrProjection,
    runIsrProjection,
    igssTaxableMonthly,
    hndTaxConstants,
    supabase: sb,
    statutoryYearResolution = 'exact'
  } = input

  const supabase = sb ?? createAdminClient()

  if (countryCode === 'HND') {
    const taxConstants = hndTaxConstants ?? (await getTaxBracketsForYear(year, 'HND'))
    let ihss = 0
    let rap = 0
    let isr = 0
    if (legalDeductions.ihss) {
      ihss = calculateIHSS(baseMonthlySalary, taxConstants) * factor2Pagos
    }
    if (legalDeductions.rap) {
      rap = calculateRAP(baseMonthlySalary, taxConstants) * factor2Pagos
    }
    if (legalDeductions.isr) {
      isr =
        useIsrProjection && runIsrProjection
          ? await runIsrProjection()
          : calculateISR(simpleIsrMonthlyBase, taxConstants.isr_brackets) * factor2Pagos
    }
    return {
      ihss: Math.round(ihss * 100) / 100,
      rap: Math.round(rap * 100) / 100,
      isr: Math.round(isr * 100) / 100
    }
  }

  if (countryCode === 'SLV') {
    // INSAFORP (statutory_config.insafrop) es aporte patronal condicional; no va en deducción obrero ihss/rap aquí.
    const cfg = await loadValidatedStatutoryConfig('SLV', year, supabase, statutoryYearResolution)
    const isss = (cfg?.isss as Record<string, number> | undefined) ?? {}
    const afp = (cfg?.afp as Record<string, number> | undefined) ?? {}
    const isssRate = Number(isss.employeeRate ?? 0.03)
    const ceiling = Number(isss.monthlyCeiling ?? 1000)
    const afpRate = Number(afp.employeeRate ?? 0.0725)

    let ihss = 0
    let rap = 0
    if (legalDeductions.ihss) {
      ihss = Math.min(baseMonthlySalary, ceiling) * isssRate * factor2Pagos
    }
    if (legalDeductions.rap) {
      rap = baseMonthlySalary * afpRate * factor2Pagos
    }

    const slvMonthly = normalizeSlvMonthlyBrackets(cfg?.isr_monthly_brackets_usd)
    const brackets = normalizeIsrBracketsFromJson(cfg?.isr_brackets)
    let isr = 0
    if (legalDeductions.isr) {
      const monthlyIsss = legalDeductions.ihss ? Math.min(baseMonthlySalary, ceiling) * isssRate : 0
      const monthlyAfp = legalDeductions.rap ? baseMonthlySalary * afpRate : 0
      const taxable = Math.max(0, simpleIsrMonthlyBase - monthlyIsss - monthlyAfp)
      if (slvMonthly.length > 0) {
        isr = calculateSlvMonthlyIsrUsd(taxable, slvMonthly) * factor2Pagos
      } else if (brackets.length > 0) {
        isr = calculateISR(taxable, brackets) * factor2Pagos
      }
    }

    return {
      ihss: Math.round(ihss * 100) / 100,
      rap: Math.round(rap * 100) / 100,
      isr: Math.round(isr * 100) / 100
    }
  }

  // Guatemala — IGSS obrero; ISR placeholder (0 hasta motor anual)
  const cfg = await loadValidatedStatutoryConfig('GTM', year, supabase, statutoryYearResolution)
  const igss = (cfg?.igss as Record<string, number> | undefined) ?? {}
  const rate = Number(igss.employeeRate ?? 0.0483)
  const baseIgss = igssTaxableMonthly ?? baseMonthlySalary
  let ihss = 0
  if (legalDeductions.ihss) {
    ihss = Math.max(0, baseIgss) * rate * factor2Pagos
  }
  const brackets = normalizeIsrBracketsFromJson(cfg?.isr_brackets)
  const isrAnnual = cfg?.isr_annual as GtmIsrAnnualConfig | undefined
  let isr = 0
  if (legalDeductions.isr) {
    const monthlyIgss = legalDeductions.ihss ? Math.max(0, baseIgss) * rate : 0
    const taxable = Math.max(0, simpleIsrMonthlyBase - monthlyIgss)
    if (
      isrAnnual &&
      typeof isrAnnual.up_to === 'number' &&
      typeof isrAnnual.rate === 'number' &&
      isrAnnual.over &&
      typeof isrAnnual.over.fixed === 'number' &&
      typeof isrAnnual.over.rate === 'number'
    ) {
      isr = calculateGtmMonthlyIsrFromAnnualConfig(taxable, isrAnnual) * factor2Pagos
    } else if (brackets.length > 0) {
      isr = calculateISR(taxable, brackets) * factor2Pagos
    }
  }

  return {
    ihss: Math.round(ihss * 100) / 100,
    rap: 0,
    isr: Math.round(isr * 100) / 100
  }
}
