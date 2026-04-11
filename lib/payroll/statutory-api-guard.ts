import type { CountryCode } from '../country/supported'
import type { PayrollYearContext } from '../tax/registry'
import { parseStatutoryConfigForPayroll } from '../tax/statutory-config-validate'
import {
  StatutoryParamsMissingError,
  isStatutoryParamsMissingError,
  isStatutoryConfigInvalidError
} from '../tax/statutory-payroll-errors'
import { loadStatutoryConfigExact } from './statutory-deductions-compute'

/** Valida JSON statutory para el año (fail-fast antes del bucle de empleados). */
export async function assertNonHndStatutoryConfigParses(
  countryCode: CountryCode,
  year: number,
  supabase: { from: (t: string) => unknown }
): Promise<void> {
  if (countryCode === 'HND') return
  const raw = await loadStatutoryConfigExact(countryCode as 'SLV' | 'GTM', year, supabase)
  if (!raw) throw new StatutoryParamsMissingError(countryCode, year)
  parseStatutoryConfigForPayroll(countryCode as 'SLV' | 'GTM', raw)
}

export function payrollStatutoryErrorResponse(
  e: unknown
): { status: number; body: Record<string, unknown> } | null {
  if (isStatutoryParamsMissingError(e)) {
    return {
      status: 400,
      body: {
        error: 'Parámetros legales no disponibles',
        code: e.code,
        message: e.message,
        countryCode: e.countryCode,
        year: e.year
      }
    }
  }
  if (isStatutoryConfigInvalidError(e)) {
    return {
      status: 400,
      body: {
        error: 'Configuración legal inválida',
        code: e.code,
        message: e.message,
        countryCode: e.countryCode
      }
    }
  }
  return null
}

/** Respuesta JSON para 400 cuando no hay fila exacta en payroll_statutory_params (no-HND). */
export function payrollStatutoryYearUnavailable(
  yearCtx: PayrollYearContext,
  countryCode: CountryCode,
  requestedYear: number
): { ok: true } | { ok: false; status: 400; body: Record<string, unknown> } {
  if (countryCode === 'HND') return { ok: true }
  if (yearCtx.trace.dataSource !== 'none') return { ok: true }
  return {
    ok: false,
    status: 400,
    body: {
      error: 'Parámetros legales no disponibles',
      code: 'STATUTORY_PARAMS_MISSING_FOR_YEAR',
      message: `No hay parámetros legales activos para ${countryCode} en el año ${requestedYear}.`,
      countryCode,
      year: requestedYear
    }
  }
}
