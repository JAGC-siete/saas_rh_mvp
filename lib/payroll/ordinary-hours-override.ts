/**
 * Tope opcional de horas ordinarias por día (antes de HE) en company_payroll_configs.metadata.
 * null = usar solo labor_laws.legal_daily_hours en el RPC.
 */
export function parseOrdinaryHoursOverrideInput(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim().replace(',', '.'))
  if (!Number.isFinite(n) || n < 1 || n > 16) return null
  return n
}
