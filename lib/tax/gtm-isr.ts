/** Proyección anual simplificada SAT-style → retención mensual (GTQ). Revisar con contador antes de producción. */

export type GtmIsrAnnualConfig = {
  up_to: number
  rate: number
  over: { fixed: number; rate: number }
}

export function calculateGtmMonthlyIsrFromAnnualConfig(
  monthlyTaxableGtq: number,
  cfg: GtmIsrAnnualConfig
): number {
  if (!Number.isFinite(monthlyTaxableGtq) || monthlyTaxableGtq <= 0) return 0
  const annual = monthlyTaxableGtq * 12
  let annualTax = 0
  if (annual <= cfg.up_to) {
    annualTax = annual * cfg.rate
  } else {
    annualTax = cfg.over.fixed + (annual - cfg.up_to) * cfg.over.rate
  }
  return Math.max(0, annualTax / 12)
}
