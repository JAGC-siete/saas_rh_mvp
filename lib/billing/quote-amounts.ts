import { computeQuotationUrgencyOffer } from '../ventas/urgency-offer'
import { roundMoney } from '../ventas/pricing'

export interface FrozenQuoteAmounts {
  expectedTotalHnl: number
  expectedDepositHnl: number
}

/** Congela montos comerciales al enviar la cotización (oferta 72h activa en el momento del envío). */
export function computeFrozenQuoteAmounts(params: {
  billingModality: 'annual' | 'monthly'
  monthlySoftwareTotal: number
  monthlyHardwareFee: number
  annualTotal: number
  sentAt?: Date
}): FrozenQuoteAmounts {
  const sentAt = params.sentAt ?? new Date()
  const urgency = computeQuotationUrgencyOffer({
    billingModality: params.billingModality,
    monthlySoftwareTotal: params.monthlySoftwareTotal,
    monthlyHardwareFee: params.monthlyHardwareFee,
    annualTotal: params.annualTotal,
    sentAt,
    now: sentAt,
  })

  const expectedTotalHnl = urgency.discountedTotal
  const expectedDepositHnl = roundMoney(expectedTotalHnl * 0.5)

  return { expectedTotalHnl, expectedDepositHnl }
}
