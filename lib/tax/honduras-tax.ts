/**
 * Honduras Tax Calculation Library
 * 
 * Centralized library for calculating Honduran taxes (ISR, IHSS, RAP)
 * based on year-specific tax brackets stored in database.
 */

import { createAdminClient } from '../supabase/server'

export interface TaxBracket {
  limit: number
  rate: number
  base: number
  lower: number
}

export interface TaxConstants {
  minimum_wage: number
  ihss_ceiling: number
  ihss_employee_rate: number
  rap_rate: number
  isr_brackets: TaxBracket[]
}

// Default constants for 2025 (fallback if DB doesn't have data)
const DEFAULT_2025_CONSTANTS: TaxConstants = {
  minimum_wage: 11903.13,
  ihss_ceiling: 11903.13,
  ihss_employee_rate: 0.05,
  rap_rate: 0.015,
  isr_brackets: [
    { limit: 21457.76, rate: 0.00, base: 0, lower: 0 },
    { limit: 30969.88, rate: 0.15, base: 0, lower: 21457.76 },
    { limit: 67604.36, rate: 0.20, base: 1428.32, lower: 30969.88 },
    { limit: Infinity, rate: 0.25, base: 8734.32, lower: 67604.36 }
  ]
}

/**
 * Get tax brackets and constants for a specific year
 * Falls back to most recent year or default if not found
 */
export async function getTaxBracketsForYear(year: number): Promise<TaxConstants> {
  try {
    const supabase = createAdminClient()
    
    // Try to get the specific year
    let { data, error } = await supabase
      .from('tax_brackets')
      .select('*')
      .eq('year', year)
      .eq('country_code', 'HND')
      .single()
    
    // If not found, get the most recent active year
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
      }
    }
    
    if (data) {
      return {
        minimum_wage: Number(data.minimum_wage),
        ihss_ceiling: Number(data.ihss_ceiling),
        ihss_employee_rate: Number(data.ihss_employee_rate),
        rap_rate: Number(data.rap_rate),
        isr_brackets: (data.isr_brackets as any[]).map(b => ({
          limit: b.limit === 999999999 ? Infinity : Number(b.limit),
          rate: Number(b.rate),
          base: Number(b.base),
          lower: Number(b.lower)
        }))
      }
    }
  } catch (error) {
    console.error('Error fetching tax brackets from DB:', error)
  }
  
  // Fallback to default 2025 constants
  console.warn(`Tax brackets for year ${year} not found, using default 2025 constants`)
  return DEFAULT_2025_CONSTANTS
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
 * Calculate RAP (Régimen de Ahorro para Pensiones) for employee
 */
export function calculateRAP(salary: number, constants: TaxConstants): number {
  return Math.max(0, salary - constants.minimum_wage) * constants.rap_rate
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

