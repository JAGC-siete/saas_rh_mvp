import type { QuotationQuote } from './types'
import type { PlanSummaryLine, QuotationPlanSummary } from './quote-display'
import type { ModalityComparison } from './modality-comparison'
import { formatMoney, roundMoney } from './pricing'
import { computeQuotationUrgencyOffer } from './urgency-offer'
import {
  isLadderPlanKey,
  LADDER_PLAN_MODULES,
  LADDER_PLAN_NAMES,
  ladderOnboardingFee,
  ladderOnboardingFeeApplies,
  type LadderPlanKey,
} from './ladder'

type Modality = 'annual' | 'monthly'

function planKeyOf(quote: QuotationQuote): LadderPlanKey {
  return isLadderPlanKey(quote.plan_key) ? quote.plan_key : 'basic'
}

function planNameOf(quote: QuotationQuote): string {
  return quote.plan_name?.trim() || LADDER_PLAN_NAMES[planKeyOf(quote)]
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many
}

/** Cómo se reparten y cobran los relojes si el cliente eligiera esta modalidad. */
function breakdownFor(quote: QuotationQuote, modality: Modality) {
  const plan = planKeyOf(quote)
  const terminals = Math.max(0, Math.trunc(Number(quote.terminals_count) || 0))
  const includedCap = Math.max(0, Math.trunc(Number(quote.tier?.included_terminals_max ?? 1)))
  const included = modality === 'annual' ? Math.min(terminals, includedCap) : 0
  const extra = terminals - included
  const unitPrice = Number(quote.hardware_sale_unit_price) || 0
  const onboarding = ladderOnboardingFeeApplies(plan, modality)
    ? ladderOnboardingFee(quote.currency, quote.business_rules)
    : 0
  const price = modality === 'monthly' ? quote.monthly_software_total : quote.annual_total
  return {
    plan,
    terminals,
    includedCap,
    included,
    extra,
    unitPrice,
    hardwareTotal: roundMoney(extra * unitPrice),
    onboarding,
    price,
  }
}

export function ladderModalityLabel(modality: Modality): string {
  return modality === 'monthly' ? 'Plan mensual' : 'Plan anual'
}

export function ladderScopeLabel(quote: QuotationQuote): string {
  const n = Math.max(1, Math.trunc(Number(quote.employees_count) || 1))
  return `Plan ${planNameOf(quote)} · ${n} ${plural(n, 'colaborador', 'colaboradores')}`
}

export function ladderTerminalsLabel(quote: QuotationQuote, modality: Modality = quote.billing_modality): string {
  const b = breakdownFor(quote, modality)
  if (b.terminals === 0) return 'Sin reloj biométrico'
  if (b.included > 0 && b.extra > 0) {
    return `${b.terminals} (${b.included} incluido + ${b.extra} ${plural(b.extra, 'adicional', 'adicionales')})`
  }
  if (b.included > 0) return b.terminals === 1 ? '1 (incluido)' : `${b.terminals} (incluidos)`
  return `${b.terminals} · compra`
}

/** Lista "Incluido en su contratación" del PDF. */
export function ladderIncludesLabels(quote: QuotationQuote): string[] {
  const b = breakdownFor(quote, quote.billing_modality)
  const labels = [...LADDER_PLAN_MODULES[b.plan], 'Colaboradores ilimitados']

  if (b.terminals === 0) {
    labels.push('Sin reloj biométrico (pueden agregarlo después)')
  } else if (b.included > 0) {
    labels.push(
      b.extra > 0
        ? `${b.included} reloj biométrico incluido + ${b.extra} ${plural(b.extra, 'adicional', 'adicionales')}`
        : `${b.included} reloj biométrico incluido`
    )
  } else {
    labels.push(`${b.terminals} ${plural(b.terminals, 'reloj biométrico', 'relojes biométricos')} en compra`)
  }
  if (b.terminals > 0) labels.push('Instalación y sincronización de relojes')

  labels.push(
    b.onboarding > 0
      ? 'Arranque asistido: migración y capacitación (pago único)'
      : 'Arranque asistido: migración y capacitación incluidas'
  )
  labels.push('Actualizaciones normativas sin costo', 'Impuestos incluidos')
  return labels
}

export function buildLadderPlanSummary(params: {
  quote: QuotationQuote
  sentAt?: Date
  now?: Date
  billingModality?: Modality
}): QuotationPlanSummary {
  const { quote, sentAt = new Date(), now } = params
  const modality = params.billingModality ?? quote.billing_modality
  const isMonthly = modality === 'monthly'
  const periodLabel = isMonthly ? 'mes' : 'año'
  const fmt = (n: number) => formatMoney(quote.currency, n)
  const b = breakdownFor(quote, modality)

  const lines: PlanSummaryLine[] = [
    {
      label: `Plan ${planNameOf(quote)} · ${isMonthly ? 'mensual' : 'anual'}`,
      value: `${fmt(b.price)} / ${periodLabel}`,
    },
  ]
  if (b.hardwareTotal > 0) {
    const what = b.included > 0 ? 'Relojes adicionales' : 'Relojes biométricos'
    lines.push({ label: `${what} (${b.extra} × ${fmt(b.unitPrice)})`, value: fmt(b.hardwareTotal) })
  }
  if (b.onboarding > 0) {
    lines.push({ label: 'Arranque asistido (pago único)', value: fmt(b.onboarding) })
  }

  let totalLabel: string
  let totalValue: string
  if (isMonthly) {
    const first = roundMoney(b.price + b.hardwareTotal + b.onboarding)
    if (first === b.price) {
      totalLabel = 'Total mensual, sin permanencia'
      totalValue = `${fmt(b.price)} / mes`
    } else {
      totalLabel = `Primer pago para arrancar. Luego ${fmt(b.price)} / mes, sin permanencia`
      totalValue = fmt(first)
    }
  } else if (b.hardwareTotal > 0) {
    totalLabel = 'Total del primer año (plan anual + relojes adicionales)'
    totalValue = fmt(roundMoney(b.price + b.hardwareTotal))
  } else {
    totalLabel = 'Total anual'
    totalValue = `${fmt(b.price)} / año`
  }

  return {
    tierLabel: ladderScopeLabel(quote),
    terminalsLabel: ladderTerminalsLabel(quote, modality),
    periodLabel,
    isMonthly,
    urgency: computeQuotationUrgencyOffer({
      billingModality: modality,
      monthlySoftwareTotal: quote.monthly_software_total,
      monthlyHardwareFee: 0,
      annualTotal: quote.annual_total,
      sentAt,
      now,
    }),
    lines,
    totalLabel,
    totalValue,
    expiryText: null,
    pdfNote: 'Tienes el PDF adjunto con las especificaciones técnicas completas.',
  }
}

/** Referencia de la otra modalidad para que el cliente compare. */
export function buildLadderModalityComparison(params: {
  quote: QuotationQuote
  sentAt?: Date
  now?: Date
}): ModalityComparison {
  const { quote, sentAt, now } = params
  const primaryModality = quote.billing_modality
  const alternateModality: Modality = primaryModality === 'monthly' ? 'annual' : 'monthly'
  const summary = buildLadderPlanSummary({ quote, sentAt, now, billingModality: alternateModality })
  const b = breakdownFor(quote, alternateModality)
  const fmt = (n: number) => formatMoney(quote.currency, n)

  let footnote: string
  if (alternateModality === 'annual') {
    footnote =
      b.includedCap > 0
        ? `Incluye ${b.includedCap} ${plural(b.includedCap, 'reloj biométrico', 'relojes biométricos')} y el arranque asistido. 12 meses de servicio.`
        : 'Incluye el arranque asistido. 12 meses de servicio.'
  } else {
    footnote = `Sin reloj incluido: cada uno se compra aparte (${fmt(b.unitPrice)}).`
    if (b.onboarding > 0) footnote += ` El arranque asistido se paga una vez (${fmt(b.onboarding)}).`
    footnote += ' Sin permanencia mínima.'
  }

  return {
    primaryModality,
    alternateModality,
    title: `Referencia — ${ladderModalityLabel(alternateModality)}`,
    lines: summary.lines,
    totalLabel: summary.totalLabel,
    totalValue: summary.totalValue,
    footnote,
    equivalentNote: null,
    available: true,
  }
}

/** Texto "Modalidad de pago" del PDF. */
export function ladderPaymentIntroText(quote: QuotationQuote): string {
  if (quote.billing_modality === 'annual') {
    return '50 % al confirmar para programar la instalación y 50 % contra la puesta en marcha. Cubre 12 meses de servicio.'
  }
  const b = breakdownFor(quote, 'monthly')
  const parts = ['el primer mes']
  if (b.hardwareTotal > 0) parts.push(b.extra === 1 ? 'el reloj' : 'los relojes')
  if (b.onboarding > 0) parts.push('el arranque asistido')
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}` : parts[0]
  return `Para arrancar se paga ${joined}. Después, cada mes por adelantado, sin permanencia mínima.`
}

export function buildLadderComparisonSnapshot(quote: QuotationQuote) {
  return {
    pricing_model: 'ladder' as const,
    plan_key: quote.plan_key,
    primary: quote.billing_modality,
    annual_total: quote.annual_total,
    monthly_total: quote.monthly_total,
    hardware_sale_total: quote.hardware_sale_total || 0,
    onboarding_fee: quote.onboarding_fee || 0,
    currency: quote.currency,
  }
}
