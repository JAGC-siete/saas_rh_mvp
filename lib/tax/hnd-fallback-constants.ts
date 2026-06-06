import hndFallbackJson from './hnd-fallback-2025.json'
import hndFallback2026Json from './hnd-fallback-2026.json'

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
  medical_deduction_limit?: number
}

function taxConstantsFromHndFallbackJson(j: typeof hndFallbackJson): TaxConstants {
  return {
    minimum_wage: j.minimum_wage,
    ihss_ceiling: j.ihss_ceiling,
    ihss_employee_rate: j.ihss_employee_rate,
    rap_rate: j.rap_rate,
    medical_deduction_limit: j.medical_deduction_limit,
    isr_brackets: j.isr_brackets.map((b) => ({
      limit: b.limit >= 999999999 ? Infinity : b.limit,
      rate: b.rate,
      base: b.base,
      lower: b.lower,
    })),
  }
}

/** Misma fuente que `lib/tax/hnd-fallback-2025.json` (tests leen el JSON). */
export const HND_FALLBACK_2025_CONSTANTS: TaxConstants = taxConstantsFromHndFallbackJson(hndFallbackJson)

/** Salario mínimo promedio 2026 — Acuerdo SETRASS-233-2026 / SAR-19-2026. */
export const HND_FALLBACK_2026_CONSTANTS: TaxConstants = taxConstantsFromHndFallbackJson(hndFallback2026Json)

export function embeddedHndFallbackForYear(year: number): TaxConstants {
  return year >= 2026 ? HND_FALLBACK_2026_CONSTANTS : HND_FALLBACK_2025_CONSTANTS
}
