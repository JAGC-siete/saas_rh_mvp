import type { CurrencyCode, QuotationQuote } from './types'
import { formatMoney, roundMoney } from './pricing'
import { hardwareFeeMonthly } from './modality-includes'
import {
  computeAnnualHardwareCharges,
  formatVentasMembershipDiscountLabel,
  quoteIncludesBiometricTerminals,
  resolveHardwareMode,
  shouldChargeHardwareContinuity,
  VENTAS_HARDWARE_SALE_UNIT_PRICE,
  type VentasTierHardwareHints,
} from './business-rules'
import { VENTAS_BASIC_MODULE_LABELS } from './product-catalog'

export function hardwareOptsFromQuote(quote: QuotationQuote): {
  rules: QuotationQuote['business_rules']
  tier: VentasTierHardwareHints
} {
  return {
    rules: quote.business_rules,
    tier: {
      annual_terminal_mode: quote.tier?.annual_terminal_mode,
      included_terminals_max: quote.tier?.included_terminals_max,
    },
  }
}
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
  const opts = hardwareOptsFromQuote(quote)
  const hw = hardwareFeeMonthly(quote.terminals_count || 1, opts.rules, opts.tier)
  if (hw.special) return 0
  return convertVentasMoney(hw.fee, VENTAS_PRICE_LIST_CURRENCY, quote.currency)
}

/** Continuity HW fee to show for a given modality. */
export function resolveHardwareFeeForModality(
  quote: QuotationQuote,
  modality: 'annual' | 'monthly'
): number {
  const employees = employeesCountFromQuote(quote)
  const opts = hardwareOptsFromQuote(quote)
  if (!shouldChargeHardwareContinuity(modality, employees, opts)) return 0
  return resolveListedHardwareFee(quote)
}

/** One-shot terminal sale total for a given modality (incluye extras sobre cupo incluido). */
export function resolveHardwareSaleForModality(
  quote: QuotationQuote,
  modality: 'annual' | 'monthly'
): number {
  if (modality === 'monthly') return 0
  if ((quote.hardware_sale_total || 0) > 0 && modality === quote.billing_modality) {
    return quote.hardware_sale_total
  }
  const employees = employeesCountFromQuote(quote)
  const opts = hardwareOptsFromQuote(quote)
  const charges = computeAnnualHardwareCharges({
    modality,
    employeesCount: employees,
    terminalsCount: quote.terminals_count || 1,
    rules: opts.rules,
    tier: opts.tier,
  })
  if (!charges.sale) return 0
  return convertVentasMoney(charges.sale.total, VENTAS_PRICE_LIST_CURRENCY, quote.currency)
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
  const mode =
    quote.hardware_mode &&
    (isMonthly ? quote.billing_modality === 'monthly' : quote.billing_modality === 'annual')
      ? quote.hardware_mode
      : resolveHardwareMode(
          isMonthly ? 'monthly' : 'annual',
          employeesCountFromQuote(quote),
          hardwareOptsFromQuote(quote)
        )

  const extras = Number(quote.terminals_extra_count) || 0
  const included = Number(quote.terminals_included_count) || 0
  const listPriceLabel = isMonthly
    ? `Precio mensual con ${count} ${terminalWord}`
    : mode === 'included'
      ? extras > 0 && included > 0
        ? `Precio anual (${included} incluidas + ${extras} adicional${extras === 1 ? '' : 'es'})`
        : count === 1
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
  includedCount?: number
  extraCount?: number
  /** Precio unitario vigente (lista HNL o ya localizado). */
  hardwareSaleUnitPrice?: number
  /** Cupo del rango (Hasta N); si no hay extras, se usa para el copy de inclusión. */
  includedCap?: number
  productKind?: 'basic' | 'regular'
}): string[] {
  if (params.productKind === 'basic') {
    return [...VENTAS_BASIC_MODULE_LABELS, 'Membresía anual, sin reloj']
  }
  const { isAnnual, includesTerminals, hardwareMode } = params
  const currency = params.currency || 'HNL'
  const extras = Math.max(0, Math.floor(Number(params.extraCount) || 0))
  const included = Math.max(0, Math.floor(Number(params.includedCount) || 0))
  const includedCap = Math.max(
    0,
    Math.floor(Number(params.includedCap) || included)
  )
  const unitPrice =
    params.hardwareSaleUnitPrice != null && Number.isFinite(Number(params.hardwareSaleUnitPrice))
      ? Number(params.hardwareSaleUnitPrice)
      : convertVentasMoney(VENTAS_HARDWARE_SALE_UNIT_PRICE, VENTAS_PRICE_LIST_CURRENCY, currency)
  const unitPriceLabel = formatMoney(currency, unitPrice)

  if (isAnnual && includesTerminals) {
    const terminalsLine =
      extras > 0 && included > 0
        ? `${included} terminales incluidas + ${extras} adicional${extras === 1 ? '' : 'es'} (−20% unitario)`
        : includedCap > 0
          ? `Hasta ${includedCap} terminales biométricas incluidas en este rango`
          : 'Terminales incluidas según cupo del plan (extras se venden por separado −20%)'
    return [
      'Subscripción anual de software',
      terminalsLine,
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

/** Copy de pago anual (PDF) alineado con depósito 50% de (licencia + venta de terminales). */
export function annualPaymentIntroText(params: {
  includesTerminals: boolean
  hardwareSaleTotal?: number
  productKind?: 'basic' | 'regular'
}): string {
  if (params.productKind === 'basic') {
    return '50% anticipo de la membresía anual y 50% contra la puesta en marcha de expedientes, marcas a mano y recibos.'
  }
  const hasSale = (Number(params.hardwareSaleTotal) || 0) > 0
  if (hasSale && params.includesTerminals) {
    return 'Anticipo del 50% sobre (licencia anual + terminales adicionales) para programar la instalación. El saldo se cancela contra instalación y enlace efectivos con el sistema.'
  }
  if (hasSale) {
    return 'Anticipo del 50% sobre (licencia anual + terminales en venta) para programar la instalación. El saldo de la licencia se cancela contra instalación.'
  }
  return '50% anticipo (licencia anual) para programar la instalación y enlace de las terminales y 50% únicamente contra la instalación y enlace efectivos con el sistema.'
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

  const enterpriseAmt = quote.include_enterprise ? Number(quote.enterprise_annual_price) || 0 : 0
  const softwareAnnualQuoted = roundMoney((quote.annual_total || 0) - enterpriseAmt)
  const softwareTotal = isMonthly ? resolveMonthlyTotal(quote) : quote.annual_total
  const quotedTotal = isMonthly ? softwareTotal : softwareTotal + saleTotal
  const lines: PlanSummaryLine[] = []
  const membershipAmt = quote.membership_applied ? quote.membership_discount_amount || 0 : 0
  const couponAmt = quote.coupon_applied
    ? Math.max(0, (quote.annual_discount_amount || 0) - membershipAmt)
    : 0
  const hasSoftwareDiscount = membershipAmt > 0 || couponAmt > 0

  if (hasSoftwareDiscount) {
    const pctLabel = Math.round((quote.discount_pct_applied || 0) * 100)
    const couponName = quote.coupon_code_applied?.trim()
    const couponLabel = couponName
      ? `Cupón promocional «${couponName}» (−${pctLabel}%)`
      : `Descuento promocional (−${pctLabel}%)`
    const membershipFee = Number(quote.membership_annual_price) || 0

    lines.push({
      label: 'Precio Software (lista)',
      value: `${fmt(isMonthly ? quote.annual_subtotal / 12 : quote.annual_subtotal)} / ${periodLabel}`,
    })
    if (membershipFee > 0) {
      lines.push({
        label: 'Afiliación anual',
        value: `${fmt(isMonthly ? membershipFee / 12 : membershipFee)} / ${periodLabel}`,
      })
    }
    if (membershipAmt > 0 && quote.include_enterprise) {
      lines.push({
        label: 'Add-on Enterprise',
        value: `${fmt(isMonthly ? enterpriseAmt / 12 : enterpriseAmt)} / ${periodLabel}`,
      })
    }
    if (membershipAmt > 0) {
      lines.push({
        label: formatVentasMembershipDiscountLabel(quote.membership_discount_pct || 0),
        value: `−${fmt(isMonthly ? membershipAmt / 12 : membershipAmt)} / ${periodLabel}`,
        variant: 'discount',
      })
    }
    if (couponAmt > 0) {
      lines.push({
        label: couponLabel,
        value: `−${fmt(isMonthly ? couponAmt / 12 : couponAmt)} / ${periodLabel}`,
        variant: 'discount',
      })
    }
  } else {
    lines.push({
      label: quote.product_kind === 'basic' ? 'Membresía anual' : 'Precio Software',
      value: `${fmt(isMonthly ? softwareAnnualQuoted / 12 : softwareAnnualQuoted)} / ${periodLabel}`,
    })
  }

  if (quote.include_enterprise && membershipAmt <= 0) {
    lines.push({
      label: 'Add-on Enterprise',
      value: `${fmt(isMonthly ? enterpriseAmt / 12 : enterpriseAmt)} / ${periodLabel}`,
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
    const extras =
      resolvedModality === quote.billing_modality
        ? Number(quote.terminals_extra_count) || 0
        : computeAnnualHardwareCharges({
            modality: resolvedModality,
            employeesCount: employeesCountFromQuote(quote),
            terminalsCount: quote.terminals_count || 1,
            rules: quote.business_rules,
            tier: hardwareOptsFromQuote(quote).tier,
          }).extraCount
    const included =
      resolvedModality === quote.billing_modality
        ? Number(quote.terminals_included_count) || 0
        : Math.max(0, (quote.terminals_count || 0) - extras)
    let saleLabel: string
    if (!isMonthly && extras > 0 && included > 0) {
      saleLabel = `Terminales adicionales (${extras} × unitario${discPct > 0 ? `, −${discPct}%` : ''})`
    } else if (!isMonthly && discPct > 0 && modalityMatchesSaleQuote(quote, resolvedModality)) {
      saleLabel = `Terminales biométricas (venta, −${discPct}% volumen) (${terminalsLabel})`
    } else {
      saleLabel = `Terminales biométricas (venta) (${terminalsLabel})`
    }
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
