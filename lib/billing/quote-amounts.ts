import { roundMoney } from '../ventas/pricing'

export interface FrozenQuoteAmounts {
  expectedTotalHnl: number
  expectedDepositHnl: number
}

/** Congela montos comerciales al enviar la cotización (total cotizado, sin oferta 72h). */
export function computeFrozenQuoteAmounts(params: {
  billingModality: 'annual' | 'monthly'
  monthlySoftwareTotal: number
  monthlyHardwareFee: number
  annualTotal: number
}): FrozenQuoteAmounts {
  const expectedTotalHnl =
    params.billingModality === 'monthly'
      ? roundMoney(params.monthlySoftwareTotal + params.monthlyHardwareFee)
      : roundMoney(params.annualTotal)
  const expectedDepositHnl = roundMoney(expectedTotalHnl * 0.5)

  return { expectedTotalHnl, expectedDepositHnl }
}
