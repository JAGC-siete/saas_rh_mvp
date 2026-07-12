import type { QuotationQuote } from './types'
import { formatMoney } from './pricing'
import {
  buildQuotationPlanSummary,
  employeesCountFromQuote,
  resolveHardwareFeeForModality,
  type PlanSummaryLine,
} from './quote-display'
import { getVentasModalityDefinition } from './modality-includes'
import {
  isMonthlyModalityAvailable,
  quoteIncludesBiometricTerminals,
  ventasMonthlyUnavailableMessage,
} from './business-rules'

export type ModalityComparison = {
  primaryModality: 'annual' | 'monthly'
  alternateModality: 'annual' | 'monthly'
  title: string
  lines: PlanSummaryLine[]
  totalLabel: string
  totalValue: string
  footnote: string
  equivalentNote: string | null
  /** False when monthly is not available for this employee count. */
  available: boolean
}

export function buildModalityComparison(params: {
  quote: QuotationQuote
  sentAt?: Date
  now?: Date
}): ModalityComparison | null {
  const { quote, sentAt = new Date(), now } = params
  const employees = employeesCountFromQuote(quote)
  const primaryModality = quote.billing_modality
  const alternateModality: 'annual' | 'monthly' =
    primaryModality === 'monthly' ? 'annual' : 'monthly'

  if (alternateModality === 'monthly' && !isMonthlyModalityAvailable(employees)) {
    return null
  }

  const summary = buildQuotationPlanSummary({
    quote,
    sentAt,
    now,
    billingModality: alternateModality,
    applyUrgencyOffer: false,
  })

  const def = getVentasModalityDefinition(alternateModality, { employeesCount: employees })

  const listPriceNote =
    primaryModality === 'annual'
      ? 'Montos a precio de lista en esta referencia — la oferta de 72 h aplica solo al plan anual que usted seleccionó.'
      : 'Montos a precio de lista.'

  let footnote: string
  if (alternateModality === 'monthly') {
    footnote = `La terminal biométrica no está incluida en el plan mensual; se cotiza por separado. ${listPriceNote}`
  } else if (quoteIncludesBiometricTerminals('annual', employees)) {
    footnote = `Incluye terminal biométrica en la propuesta. ${listPriceNote}`
  } else {
    footnote = `La terminal biométrica no está incluida en el plan anual de este rango; se cotiza como continuidad de hardware. ${listPriceNote}`
  }

  return {
    primaryModality,
    alternateModality,
    title: `Referencia — ${def.label}`,
    lines: summary.lines,
    totalLabel: summary.totalLabel,
    totalValue: summary.totalValue,
    footnote,
    equivalentNote: null,
    available: true,
  }
}

export function modalityComparisonUnavailableNote(employeesCount: number): string | null {
  if (isMonthlyModalityAvailable(employeesCount)) return null
  return ventasMonthlyUnavailableMessage()
}

export function buildModalityComparisonSnapshot(quote: QuotationQuote) {
  const monthlyHardwareFee = resolveHardwareFeeForModality(quote, 'monthly')
  return {
    primary: quote.billing_modality,
    annual_total: quote.annual_total,
    monthly_total: quote.monthly_software_total + monthlyHardwareFee,
    monthly_software_total: quote.monthly_software_total,
    monthly_hardware_fee: monthlyHardwareFee,
    currency: quote.currency,
  }
}

function escapeHtml(v: string): string {
  return v
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function buildModalityComparisonHtml(comparison: ModalityComparison): string {
  const lineItems = comparison.lines
    .map(
      (line) =>
        `<li style="margin-bottom: 6px;"><strong>${escapeHtml(line.label)}:</strong> ${escapeHtml(line.value)}</li>`
    )
    .join('')

  const equivalentBlock = comparison.equivalentNote
    ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #555;">${escapeHtml(comparison.equivalentNote)}</p>`
    : ''

  return `
    <div style="background: #fff; border: 1px solid #dbe3ea; border-left: 4px solid #64748b; padding: 16px 18px; border-radius: 8px; margin: 18px 0 22px 0;">
      <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: bold; color: #334155;">
        ${escapeHtml(comparison.title)}
      </p>
      <ul style="margin: 0; padding: 0 0 0 18px; color: #444; font-size: 13px; line-height: 1.65;">
        ${lineItems}
      </ul>
      <p style="margin: 10px 0 0 0; font-size: 14px; font-weight: bold; color: #334155;">
        ${escapeHtml(comparison.totalLabel)}: ${escapeHtml(comparison.totalValue)}
      </p>
      ${equivalentBlock}
      <p style="margin: 12px 0 0 0; font-size: 12px; line-height: 1.55; color: #64748b;">
        <em>${escapeHtml(comparison.footnote)}</em>
      </p>
    </div>
  `
}

export function buildModalityComparisonPlainText(comparison: ModalityComparison): string[] {
  const lines: string[] = ['', comparison.title]

  for (const line of comparison.lines) {
    lines.push(`• ${line.label}: ${line.value}`)
  }

  lines.push(`${comparison.totalLabel}: ${comparison.totalValue}`)

  if (comparison.equivalentNote) {
    lines.push(comparison.equivalentNote)
  }

  lines.push(comparison.footnote)

  return lines
}

