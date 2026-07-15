/**
 * Net shown on voucher / planilla must match the same total_deductions shown
 * (statutory + custom). Stored `eff_neto` is often bruto − IHSS − RAP − ISR only
 * when customs live in metadata (e.g. adjustment trigger recalculation).
 */

export function resolveDisplayNet(params: {
  bruto: number
  totalDeductions: number
  customDeductions: number
  storedNeto: number
}): number {
  const bruto = Number(params.bruto) || 0
  const totalDeductions = Number(params.totalDeductions) || 0
  const custom = Number(params.customDeductions) || 0
  const stored = Number(params.storedNeto) || 0

  if (custom > 0) {
    return Math.max(0, Math.round((bruto - totalDeductions) * 100) / 100)
  }
  return Math.round(stored * 100) / 100
}
