import type { QuotationQuote } from './types'
import { formatMoney } from './pricing'
import {
  computeQuotationUrgencyOffer,
  formatUrgencyOfferExpiryFriendly,
  type QuotationUrgencyBreakdown,
} from './urgency-offer'

export type PlanSummaryLine = {
  label: string
  value: string
  variant?: 'discount' | 'total'
}

export type QuotationPlanSummary = {
  tierLabel: string
  terminalsLabel: string
  periodLabel: string
  isMonthly: boolean
  urgency: QuotationUrgencyBreakdown
  lines: PlanSummaryLine[]
  totalLabel: string
  totalValue: string
  expiryText: string | null
  pdfNote: string
}

function terminalsLabelFromCount(count: number): string {
  return count === 1 ? '1 Terminal' : `${count} Terminales`
}

export function buildQuotationPlanSummary(params: {
  quote: QuotationQuote
  sentAt?: Date
  now?: Date
}): QuotationPlanSummary {
  const { quote, sentAt = new Date(), now } = params
  const fmt = (n: number) => formatMoney(quote.currency, n)
  const isMonthly = quote.billing_modality === 'monthly'
  const periodLabel = isMonthly ? 'mes' : 'año'
  const tierLabel = `${quote.tier.min_employees} a ${quote.tier.max_employees} empleados`
  const terminalsLabel = terminalsLabelFromCount(quote.terminals_count)

  const urgency = computeQuotationUrgencyOffer({
    billingModality: quote.billing_modality,
    monthlySoftwareTotal: quote.monthly_software_total,
    monthlyHardwareFee: quote.monthly_hardware_fee,
    annualTotal: quote.annual_total,
    sentAt,
    now,
  })

  if (urgency.isActive) {
    const lines: PlanSummaryLine[] = [
      {
        label: 'Precio normal Software',
        value: `${fmt(urgency.softwareListTotal)} / ${periodLabel}`,
      },
      {
        label: 'Descuento por contratación en 72 h (20%)',
        value: `−${fmt(urgency.softwareDiscountAmount)} / ${periodLabel}`,
        variant: 'discount',
      },
    ]

    if (isMonthly && urgency.hardwareTotal > 0) {
      lines.push({
        label: `Servicio de Continuidad de Hardware (${terminalsLabel})`,
        value: `${fmt(urgency.hardwareTotal)} / ${periodLabel}`,
      })
    }

    return {
      tierLabel,
      terminalsLabel,
      periodLabel,
      isMonthly,
      urgency,
      lines,
      totalLabel: `Tu inversión ${isMonthly ? 'mensual' : 'anual'} total hoy`,
      totalValue: `${fmt(urgency.discountedTotal)} / ${periodLabel}`,
      expiryText: `Esta oferta expira el ${formatUrgencyOfferExpiryFriendly(urgency.expiresAt)} (Hora Honduras).`,
      pdfNote: 'Tienes el PDF adjunto con las especificaciones técnicas completas.',
    }
  }

  const quotedTotal = isMonthly ? quote.monthly_total : quote.annual_total
  const lines: PlanSummaryLine[] = [
    {
      label: 'Precio Software',
      value: `${fmt(isMonthly ? quote.monthly_software_total : quote.annual_total)} / ${periodLabel}`,
    },
  ]

  if (isMonthly && quote.monthly_hardware_fee > 0) {
    lines.push({
      label: `Servicio de Continuidad de Hardware (${terminalsLabel})`,
      value: `${fmt(quote.monthly_hardware_fee)} / ${periodLabel}`,
    })
  }

  return {
    tierLabel,
    terminalsLabel,
    periodLabel,
    isMonthly,
    urgency,
    lines,
    totalLabel: `Total ${isMonthly ? 'mensual' : 'anual'} cotizado`,
    totalValue: `${fmt(quotedTotal)} / ${periodLabel}`,
    expiryText: null,
    pdfNote: 'Tienes el PDF adjunto con las especificaciones técnicas completas.',
  }
}
