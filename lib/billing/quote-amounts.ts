import { roundMoney } from '../ventas/pricing'

export interface FrozenQuoteAmounts {
  /** Compromiso cotizado usado para cobro (anual: software+venta; mensual: 1.ª cuota). */
  expectedTotalHnl: number
  expectedDepositHnl: number
}

/**
 * Congela montos comerciales al enviar la cotización.
 * - Mensual: depósito = 100% de la primera mensualidad (software + Continuidad HW).
 * - Anual: depósito = 50% de (licencia anual + venta de terminales si aplica).
 */
export function computeFrozenQuoteAmounts(params: {
  billingModality: 'annual' | 'monthly'
  monthlySoftwareTotal: number
  monthlyHardwareFee: number
  annualTotal: number
  hardwareSaleTotal?: number
}): FrozenQuoteAmounts {
  if (params.billingModality === 'monthly') {
    const expectedTotalHnl = roundMoney(params.monthlySoftwareTotal + params.monthlyHardwareFee)
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
