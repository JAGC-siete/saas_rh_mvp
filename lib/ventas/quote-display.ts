import type { QuotationQuote } from './types'
import { formatMoney } from './pricing'
import { hardwareFeeMonthly } from './modality-includes'
import {
  computeQuotationUrgencyOffer,
  formatUrgencyOfferExpiryFriendly,
  type QuotationUrgencyBreakdown,
} from './urgency-offer'

function resolveMonthlyHardwareFee(quote: QuotationQuote): number {
  if (quote.monthly_hardware_fee > 0) return quote.monthly_hardware_fee
  const hw = hardwareFeeMonthly(quote.terminals_count || 1)
  return hw.special ? 0 : hw.fee
}

function resolveMonthlyTotal(quote: QuotationQuote): number {
  return quote.monthly_software_total + resolveMonthlyHardwareFee(quote)
}

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

export type UrgencyPriceDisplay = {
  listPriceLabel: string
  listPriceValue: string
  investmentLabel: string
  totalValue: string
  savingsText: string
}

export function buildUrgencyPriceDisplay(params: {
  quote: QuotationQuote
  summary: QuotationPlanSummary
}): UrgencyPriceDisplay | null {
  const { quote, summary } = params
  if (!summary.urgency.isActive) return null

  const fmt = (n: number) => formatMoney(quote.currency, n)
  const { periodLabel, isMonthly } = summary
  const count = quote.terminals_count
  const terminalWord = count === 1 ? 'terminal' : 'terminales'

  const listPriceLabel = isMonthly
    ? `Precio mensual con ${count} ${terminalWord}`
    : count === 1
      ? 'Precio anual con 1 terminal incluida'
      : `Precio anual con ${count} terminales incluidas`

  return {
    listPriceLabel,
    listPriceValue: `${fmt(summary.urgency.quotedTotal)} / ${periodLabel}`,
    investmentLabel: summary.totalLabel,
    totalValue: summary.totalValue,
    savingsText: `Ahorro exclusivo por contratación temprana: ${fmt(summary.urgency.softwareDiscountAmount)}`,
  }
}

export function getContractIncludesLabels(isAnnual: boolean, terminalsCount: number): string[] {
  if (isAnnual) {
    const terminalPhrase =
      terminalsCount === 1
        ? '1 terminal (sin costo adicional)'
        : `${terminalsCount} terminales (sin costo adicional)`
    return [
      'Subscripción anual de software',
      `Hasta ${terminalPhrase}`,
      'Instalación y sincronización de terminales',
      'Migración y capacitación del personal',
      'Actualizaciones',
      'Impuestos',
    ]
  }

  return [
    'Subscripción mensual de software',
    'Migración y capacitación del personal',
    'Actualizaciones',
    'Impuestos',
  ]
}

function terminalsLabelFromCount(count: number): string {
  return count === 1 ? '1 Terminal' : `${count} Terminales`
}

export function buildQuotationPlanSummary(params: {
  quote: QuotationQuote
  sentAt?: Date
  now?: Date
  /** Override displayed modality (e.g. alternate plan in comparison block). */
  billingModality?: 'annual' | 'monthly'
  /** When false, always show list price (no 72 h offer). Default true. */
  applyUrgencyOffer?: boolean
}): QuotationPlanSummary {
  const { quote, sentAt = new Date(), now, billingModality, applyUrgencyOffer = true } = params
  const fmt = (n: number) => formatMoney(quote.currency, n)
  const resolvedModality = billingModality ?? quote.billing_modality
  const isMonthly = resolvedModality === 'monthly'
  const periodLabel = isMonthly ? 'mes' : 'año'
  const tierLabel = `${quote.tier.min_employees} a ${quote.tier.max_employees} empleados`
  const terminalsLabel = terminalsLabelFromCount(quote.terminals_count)

  const monthlyHardwareFee = resolveMonthlyHardwareFee(quote)

  const urgency = computeQuotationUrgencyOffer({
    billingModality: resolvedModality,
    monthlySoftwareTotal: quote.monthly_software_total,
    monthlyHardwareFee,
    annualTotal: quote.annual_total,
    sentAt,
    now,
  })

  if (applyUrgencyOffer && urgency.isActive) {
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

  const quotedTotal = isMonthly ? resolveMonthlyTotal(quote) : quote.annual_total
  const lines: PlanSummaryLine[] = [
    {
      label: 'Precio Software',
      value: `${fmt(isMonthly ? quote.monthly_software_total : quote.annual_total)} / ${periodLabel}`,
    },
  ]

  if (isMonthly && monthlyHardwareFee > 0) {
    lines.push({
      label: `Servicio de Continuidad de Hardware (${terminalsLabel})`,
      value: `${fmt(monthlyHardwareFee)} / ${periodLabel}`,
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
