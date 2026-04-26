/**
 * Fachada del motor fiscal por país (nómina): contexto anual con trazabilidad + deducciones.
 */

import type { CountryCode } from '../country/supported'
import { createAdminClient } from '../supabase/server'
import {
  computePayrollEmployeeStatutoryDeductions,
  type ComputePayrollStatutoryInput
} from '../payroll/statutory-deductions-compute'
import {
  getTaxBracketsForYearWithTrace,
  type TaxConstants,
  type TaxBracketsWithTrace
} from './honduras-tax'
import type { PayrollStatutoryTrace } from './statutory-trace'

export type { ComputePayrollStatutoryInput }
export type { PayrollStatutoryTrace } from './statutory-trace'

export type PayrollYearContext = {
  trace: PayrollStatutoryTrace
  /** Solo Honduras; SLV/GTM usan JSON vía compute + loadStatutory interno */
  hndTaxConstants: TaxConstants | null
}

export type PayrollTaxEngine = {
  readonly countryCode: CountryCode
  /** Resuelve parámetros del año y origen de datos (auditoría). */
  loadYearContext(year: number): Promise<PayrollYearContext>
  /** Deducciones de ley por empleado / período. */
  runStatutoryDeductions(
    input: ComputePayrollStatutoryInput
  ): ReturnType<typeof computePayrollEmployeeStatutoryDeductions>
}

function traceForNonHnd(country: CountryCode, year: number, row: { source?: string | null; notes?: string | null } | null): PayrollStatutoryTrace {
  return {
    countryCode: country,
    year,
    requestedYear: year,
    resolvedYear: row ? year : undefined,
    usedFallback: false,
    dataSource: row ? 'payroll_statutory_params' : 'none',
    sourceLabel: row?.source ?? undefined,
    notes: row?.notes ?? undefined
  }
}

export function getTaxEngine(country: CountryCode): PayrollTaxEngine {
  return {
    countryCode: country,
    async loadYearContext(year: number): Promise<PayrollYearContext> {
      if (country === 'HND') {
        const { constants, trace } = await getTaxBracketsForYearWithTrace(year, 'HND')
        return { trace, hndTaxConstants: constants }
      }
      const supabase = createAdminClient()
      const { data: row } = await supabase
        .from('payroll_statutory_params')
        .select('source,notes')
        .eq('country_code', country)
        .eq('year', year)
        .eq('is_active', true)
        .maybeSingle()
      return {
        trace: traceForNonHnd(country, year, row),
        hndTaxConstants: null
      }
    },
    runStatutoryDeductions(input: ComputePayrollStatutoryInput) {
      return computePayrollEmployeeStatutoryDeductions({ ...input, countryCode: country })
    }
  }
}

/** @deprecated Usar getTaxEngine(c).countryCode */
export function getPayrollTaxEngineId(country: CountryCode): CountryCode {
  return country
}

export async function runPayrollStatutoryDeductions(
  input: ComputePayrollStatutoryInput
): ReturnType<typeof computePayrollEmployeeStatutoryDeductions> {
  return computePayrollEmployeeStatutoryDeductions(input)
}

export { getTaxBracketsForYearWithTrace }
export type { TaxBracketsWithTrace }
