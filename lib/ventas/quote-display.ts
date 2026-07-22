import type { CurrencyCode, QuotationQuote } from './types'
import { formatMoney } from './pricing'
import { hardwareFeeMonthly } from './modality-includes'
import {
  hardwareSaleTotal,
  quoteIncludesBiometricTerminals,
  resolveHardwareMode,
  shouldChargeHardwareContinuity,
  shouldChargeHardwareSale,
  VENTAS_HARDWARE_SALE_UNIT_PRICE,
} from './business-rules'
import {
  convertVentasMoney,
  VENTAS_PRICE_LIST_CURRENCY,
} from './currency'
import {
  computeQuotationUrgencyOffer,
  formatUrgencyOfferExpiryFriendly,
  type QuotationUrgencyBreakdown,
} from './urgency-offer'

export function employeesCountFromQuote(quote: QuotationQuote): number {
  if (Number.isFinite(quote.employees_count) && quote.employees_count > 0) {
    return quote.employees_count
  }
  return quote.tier?.min_employees || 0
}

function resolveListedHardwareFee(quote: QuotationQuote): number {
  if (quote.monthly_hardware_fee > 0) return quote.monthly_hardware_fee
  const hw = hardwareFeeMonthly(quote.terminals_count || 1)
  if (hw.special) return 0
  return convertVentasMoney(hw.fee, VENTAS_PRICE_LIST_CURRENCY, quote.currency)
}

/** Continuity HW fee to show for a given modality. */
export function resolveHardwareFeeForModality(
  quote: QuotationQuote,
  modality: 'annual' | 'monthly'
): number {
  const employees = employeesCountFromQuote(quote)
  if (!shouldChargeHardwareContinuity(modality, employees)) return 0
  return resolveListedHardwareFee(quote)
}

/** One-shot terminal sale total for a given modality. */
export function resolveHardwareSaleForModality(
  quote: QuotationQuote,
  modality: 'annual' | 'monthly'
): number {
  const employees = employeesCountFromQuote(quote)
  if (!shouldChargeHardwareSale(modality, employees)) return 0
  if ((quote.hardware_sale_total || 0) > 0 && modality === quote.billing_modality) {
    return quote.hardware_sale_total
  }
  return convertVentasMoney(
    hardwareSaleTotal(quote.terminals_count || 1).total,
    VENTAS_PRICE_LIST_CURRENCY,
    quote.currency
  )
}

function resolveMonthlyTotal(quote: QuotationQuote): number {
  return quote.monthly_software_total + resolveHardwareFeeForModality(quote, 'monthly')
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
  const mode = resolveHardwareMode(
    isMonthly ? 'monthly' : 'annual',
    employeesCountFromQuote(quote)
  )

  const listPriceLabel = isMonthly
    ? `Precio mensual con ${count} ${terminalWord}`
    : mode === 'included'
      ? count === 1
        ? 'Precio anual con 1 terminal incluida'
        : `Precio anual con ${count} terminales incluidas`
      : count === 1
        ? 'Precio anual (terminal en venta por separado)'
        : `Precio anual (${count} terminales en venta por separado)`

  return {
    listPriceLabel,
    listPriceValue: `${fmt(summary.urgency.quotedTotal)} / ${periodLabel}`,
    investmentLabel: summary.totalLabel,
    totalValue: summary.totalValue,
    savingsText: `Ahorro exclusivo por contratación temprana: ${fmt(summary.urgency.softwareDiscountAmount)}`,
  }
}

export function getContractIncludesLabels(params: {
  isAnnual: boolean
  terminalsCount: number
  includesTerminals: boolean
  hardwareMode?: 'included' | 'sale' | 'continuity'
  currency?: CurrencyCode
}): string[] {
  const { isAnnual, terminalsCount, includesTerminals, hardwareMode } = params
  const currency = params.currency || 'HNL'
  const unitPrice = convertVentasMoney(
    VENTAS_HARDWARE_SALE_UNIT_PRICE,
    VENTAS_PRICE_LIST_CURRENCY,
    currency
  )
  const unitPriceLabel = formatMoney(currency, unitPrice)

  if (isAnnual && includesTerminals) {
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

  if (isAnnual) {
    const saleNote =
      hardwareMode === 'sale' || !hardwareMode
        ? `Terminal biométrica: venta por separado (${unitPriceLabel} c/u, descuento por volumen)`
        : 'Terminal biométrica: Servicio de Continuidad de Hardware (mensual, por separado)'
    return [
      'Subscripción anual de software',
      'Migración y capacitación del personal',
      'Actualizaciones',
      'Impuestos',
      saleNote,
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
  /** When false, always show list price (no 72 h offer). Default false — oferta temprana desactivada. */
  applyUrgencyOffer?: boolean
}): QuotationPlanSummary {
  const { quote, sentAt = new Date(), now, billingModality, applyUrgencyOffer = false } = params
  const fmt = (n: number) => formatMoney(quote.currency, n)
  const resolvedModality = billingModality ?? quote.billing_modality
  const isMonthly = resolvedModality === 'monthly'
  const periodLabel = isMonthly ? 'mes' : 'año'
  const tierLabel = `${quote.tier.min_employees} a ${quote.tier.max_employees} empleados`
  const terminalsLabel = terminalsLabelFromCount(quote.terminals_count)

  const monthlyHardwareFee = resolveHardwareFeeForModality(quote, resolvedModality)
  const saleTotal = resolveHardwareSaleForModality(quote, resolvedModality)

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

    if (monthlyHardwareFee > 0) {
      lines.push({
        label: `Servicio de Continuidad de Hardware (${terminalsLabel})`,
        value: `${fmt(monthlyHardwareFee)} / mes`,
      })
    }
    if (saleTotal > 0) {
      lines.push({
        label: `Terminales biométricas (venta) (${terminalsLabel})`,
        value: fmt(saleTotal),
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
      totalValue: `${fmt(urgency.discountedTotal + saleTotal)} / ${periodLabel}`,
      expiryText: `Esta oferta expira el ${formatUrgencyOfferExpiryFriendly(urgency.expiresAt)} (Hora Honduras).`,
      pdfNote: 'Tienes el PDF adjunto con las especificaciones técnicas completas.',
    }
  }

  const softwareTotal = isMonthly ? resolveMonthlyTotal(quote) : quote.annual_total
  const quotedTotal = isMonthly ? softwareTotal : softwareTotal + saleTotal
  const lines: PlanSummaryLine[] = []

  if (quote.coupon_applied && quote.annual_discount_amount > 0) {
    const pctLabel = Math.round((quote.discount_pct_applied || 0) * 100)
    const couponName = quote.coupon_code_applied?.trim()
    const couponLabel = couponName
      ? `Cupón promocional «${couponName}» (−${pctLabel}%)`
      : `Descuento promocional (−${pctLabel}%)`

    if (isMonthly) {
      lines.push({
        label: 'Precio Software (lista)',
        value: `${fmt(quote.monthly_software_total + quote.annual_discount_amount / 12)} / ${periodLabel}`,
      })
      lines.push({
        label: couponLabel,
        value: `−${fmt(quote.annual_discount_amount / 12)} / ${periodLabel}`,
        variant: 'discount',
      })
    } else {
      lines.push({
        label: 'Precio Software (lista)',
        value: `${fmt(quote.annual_subtotal)} / ${periodLabel}`,
      })
      lines.push({
        label: couponLabel,
        value: `−${fmt(quote.annual_discount_amount)} / ${periodLabel}`,
        variant: 'discount',
      })
    }
  } else {
    lines.push({
      label: 'Precio Software',
      value: `${fmt(isMonthly ? quote.monthly_software_total : quote.annual_total)} / ${periodLabel}`,
    })
  }

  if (monthlyHardwareFee > 0) {
    lines.push({
      label: `Servicio de Continuidad de Hardware (${terminalsLabel})`,
      value: `${fmt(monthlyHardwareFee)} / mes`,
    })
  }

  if (saleTotal > 0) {
    const discPct = Math.round((quote.hardware_sale_discount_pct || 0) * 100)
    const saleLabel =
      !isMonthly && discPct > 0 && modalityMatchesSaleQuote(quote, resolvedModality)
        ? `Terminales biométricas (venta, −${discPct}% volumen) (${terminalsLabel})`
        : `Terminales biométricas (venta) (${terminalsLabel})`
    lines.push({
      label: saleLabel,
      value: fmt(saleTotal),
    })
  }

  return {
    tierLabel,
    terminalsLabel,
    periodLabel,
    isMonthly,
    urgency,
    lines,
    totalLabel: isMonthly
      ? 'Total mensual cotizado'
      : saleTotal > 0
        ? 'Total compromiso (software anual + terminales)'
        : 'Total anual cotizado',
    totalValue: isMonthly
      ? `${fmt(quotedTotal)} / ${periodLabel}`
      : saleTotal > 0
        ? fmt(quotedTotal)
        : `${fmt(quotedTotal)} / ${periodLabel}`,
    expiryText: null,
    pdfNote: 'Tienes el PDF adjunto con las especificaciones técnicas completas.',
  }
}

function modalityMatchesSaleQuote(
  quote: QuotationQuote,
  modality: 'annual' | 'monthly'
): boolean {
  return modality === quote.billing_modality && (quote.hardware_sale_discount_pct || 0) > 0
}
