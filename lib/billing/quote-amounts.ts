import { roundMoney } from '../ventas/pricing'

export interface FrozenQuoteAmounts {
  /** Compromiso cotizado usado para cobro (anual: software+venta; mensual: 1.ª cuota). */
  expectedTotalHnl: number
  expectedDepositHnl: number
}

/**
 * Congela montos comerciales al enviar la cotización.
 * - Mensual: depósito = 100% del primer pago (mensualidad + Continuidad HW, y en la
 *   escalera también los relojes comprados y el arranque asistido).
 * - Anual: depósito = 50% de (licencia anual + venta de terminales si aplica).
 */
export function computeFrozenQuoteAmounts(params: {
  billingModality: 'annual' | 'monthly'
  monthlySoftwareTotal: number
  monthlyHardwareFee: number
  annualTotal: number
  hardwareSaleTotal?: number
  /** Escalera: arranque asistido (pago único, solo mensual). */
  onboardingFee?: number
}): FrozenQuoteAmounts {
  if (params.billingModality === 'monthly') {
    const expectedTotalHnl = roundMoney(
      params.monthlySoftwareTotal +
        params.monthlyHardwareFee +
        (Number(params.hardwareSaleTotal) || 0) +
        (Number(params.onboardingFee) || 0)
    )
    return {
      expectedTotalHnl,
      expectedDepositHnl: expectedTotalHnl,
    }
  }

  const hardwareSale = roundMoney(Number(params.hardwareSaleTotal) || 0)
  const expectedTotalHnl = roundMoney(params.annualTotal + hardwareSale)
  const expectedDepositHnl = roundMoney(expectedTotalHnl * 0.5)

  return { expectedTotalHnl, expectedDepositHnl }
}
