import type { QuotationQuote, CurrencyCode } from './types'
import { formatMoney, roundMoney } from './pricing'
import {
  mergeVentasBusinessRules,
  quoteIncludesBiometricTerminals,
  resolveFormMaxTerminals,
  resolveIncludedTerminalsCap,
  shouldChargeHardwareSale,
  ventasTooManyTerminalsErrorMessage,
  VENTAS_HARDWARE_BASE_MONTHLY,
  VENTAS_HARDWARE_FLOOR_MONTHLY,
  VENTAS_HARDWARE_INCREMENTAL_DISCOUNT,
  VENTAS_MAX_AUTO_QUOTE_TERMINALS,
  type VentasBillingModality,
  type VentasBusinessRules,
  type VentasTierHardwareHints,
} from './business-rules'
import {
  convertVentasMoney,
  VENTAS_PRICE_LIST_CURRENCY,
} from './currency'

export type { VentasBillingModality }
export {
  VENTAS_HARDWARE_BASE_MONTHLY,
  VENTAS_HARDWARE_FLOOR_MONTHLY,
  VENTAS_HARDWARE_INCREMENTAL_DISCOUNT,
  VENTAS_MAX_AUTO_QUOTE_TERMINALS,
  ventasTooManyTerminalsErrorMessage,
}

const SHARED_SERVICE_INCLUDES = [
  'Instalación de la terminal',
  'Migración y sincronización',
  'Capacitación',
  'Soporte local',
  'Impuestos',
] as const

const TERMINALS_CONTINUITY_NOTES = [
  'La terminal biométrica se vende por separado (no está incluida en el total de software); se cotiza como Servicio de Continuidad de Hardware',
] as const

function hardwareSaleUnitLabel(
  currency: CurrencyCode = 'HNL',
  rules?: Partial<VentasBusinessRules> | null
): string {
  const unitPrice = mergeVentasBusinessRules(rules).hardware_sale_unit_price
  const unit = convertVentasMoney(unitPrice, VENTAS_PRICE_LIST_CURRENCY, currency)
  return formatMoney(currency, unit)
}

function terminalsSaleNotes(
  currency: CurrencyCode = 'HNL',
  rules?: Partial<VentasBusinessRules> | null
): string[] {
  return [
    `La terminal biométrica se vende por separado a ${hardwareSaleUnitLabel(currency, rules)} c/u (descuento por volumen desde 2 unidades)`,
  ]
}

export interface VentasModalityDefinition {
  modality: VentasBillingModality
  label: string
  formHint: string
  includes: readonly string[]
  excludesOrNotes: readonly string[]
  successSummaryLine: string
}

export type VentasModalityContext = {
  employeesCount: number
  currency?: CurrencyCode
  rules?: Partial<VentasBusinessRules> | null
  tier?: VentasTierHardwareHints | null
}

function employeesFromContext(ctx?: VentasModalityContext): number {
  const n = ctx?.employeesCount
  return Number.isFinite(n) ? Number(n) : 0
}

function currencyFromContext(ctx?: VentasModalityContext): CurrencyCode {
  return ctx?.currency || 'HNL'
}

export function getVentasModalityDefinition(
  modality: VentasBillingModality,
  ctx?: VentasModalityContext
): VentasModalityDefinition {
  const employeesCount = employeesFromContext(ctx)
  const currency = currencyFromContext(ctx)
  const ruleOpts = { rules: ctx?.rules, tier: ctx?.tier }
  const includedCap = resolveIncludedTerminalsCap(ctx?.rules, ctx?.tier)

  if (modality === 'monthly') {
    return {
      modality: 'monthly',
      label: 'Plan Mensual',
      formHint:
        'Incluye licencia mensual del software, instalación, migración, capacitación, soporte local e impuestos. La terminal biométrica se vende por separado; en esta cotización se suma el Servicio de Continuidad de Hardware según terminales (cuota decreciente por unidad).',
      includes: ['Licencia mensual de software Humano SISU', ...SHARED_SERVICE_INCLUDES],
      excludesOrNotes: [...TERMINALS_CONTINUITY_NOTES],
      successSummaryLine:
        'Incluye licencia mensual del software y servicios de implementación. La terminal biométrica se vende por separado; continuidad de hardware según terminales indicadas.',
    }
  }

  const includesTerminals = quoteIncludesBiometricTerminals('annual', employeesCount, ruleOpts)

  if (includesTerminals) {
    return {
      modality: 'annual',
      label: 'Plan Anual',
      formHint: `Incluye licencia anual del software, hasta ${includedCap} terminales biométricas sin costo adicional (extras se venden por separado), instalación, migración, capacitación, soporte local e impuestos.`,
      includes: [
        'Licencia anual de software Humano SISU',
        ...SHARED_SERVICE_INCLUDES,
        `Hasta ${includedCap} terminales biométricas incluidas`,
      ],
      excludesOrNotes: [
        `Terminales adicionales (más de ${includedCap}) se venden por separado con −20% sobre el precio unitario`,
      ],
      successSummaryLine: `Incluye licencia anual del software y hasta ${includedCap} terminales biométricas; extras (−20%) se suman al compromiso anual. Incluye instalación, migración, capacitación, soporte local e impuestos.`,
    }
  }

  const unitLabel = hardwareSaleUnitLabel(currency, ctx?.rules)

  return {
    modality: 'annual',
    label: 'Plan Anual',
    formHint: `Incluye licencia anual del software, instalación, migración, capacitación, soporte local e impuestos. La terminal biométrica no está incluida en este rango: se vende por separado a ${unitLabel} c/u (descuento por volumen desde 2 unidades).`,
    includes: ['Licencia anual de software Humano SISU', ...SHARED_SERVICE_INCLUDES],
    excludesOrNotes: terminalsSaleNotes(currency, ctx?.rules),
    successSummaryLine:
      'Incluye licencia anual del software y servicios de implementación. La terminal biométrica se vende por separado según cantidad indicada.',
  }
}

/** Cuota mensual de una terminal según su posición (1 = base, 2+ = decreciente hasta el piso). */
export function hardwareUnitFeeMonthly(
  terminalIndex: number,
  rules?: Partial<VentasBusinessRules> | null
): number {
  if (terminalIndex < 1) return 0
  const c = mergeVentasBusinessRules(rules).hardware_continuity
  const raw = c.base_monthly - (terminalIndex - 1) * c.incremental_discount
  return roundMoney(Math.max(raw, c.floor_monthly))
}

export function hardwareFeeMonthly(
  terminalsCount: number,
  rules?: Partial<VentasBusinessRules> | null,
  _tier?: VentasTierHardwareHints | null
): { fee: number; special: boolean } {
  if (terminalsCount <= 0) return { fee: 0, special: false }
  const max = resolveFormMaxTerminals(rules)
  if (terminalsCount > max) return { fee: 0, special: true }
  let total = 0
  for (let i = 1; i <= terminalsCount; i++) {
    total += hardwareUnitFeeMonthly(i, rules)
  }
  return { fee: roundMoney(total), special: false }
}

export function annualTerminalsSaleFieldHint(
  currency: CurrencyCode = 'HNL',
  rules?: Partial<VentasBusinessRules> | null
): string {
  return `En este rango las terminales se venden por separado (${hardwareSaleUnitLabel(currency, rules)} c/u; descuento por volumen desde 2 unidades).`
}

export function buildTerminalsPricingNote(params: {
  modality: VentasBillingModality
  terminalsCount: number
  employeesCount: number
  currency?: CurrencyCode
  rules?: Partial<VentasBusinessRules> | null
  tier?: VentasTierHardwareHints | null
}): string {
  const n = params.terminalsCount
  const label = n === 1 ? '1 terminal declarada' : `${n} terminales declaradas`
  const ruleOpts = { rules: params.rules, tier: params.tier }
  const includes = quoteIncludesBiometricTerminals(params.modality, params.employeesCount, ruleOpts)
  const currency = params.currency || 'HNL'
  const includedCap = resolveIncludedTerminalsCap(params.rules, params.tier)
  const unitLabel = hardwareSaleUnitLabel(currency, params.rules)
  const extraCount = Math.max(0, n - includedCap)

  if (includes) {
    if (extraCount > 0) {
      return `${label} · ${includedCap} incluidas + ${extraCount} adicional${extraCount === 1 ? '' : 'es'} (−20% sobre unitario ${unitLabel})`
    }
    return `${label} · hasta ${includedCap} terminales incluidas en plan anual sin costo adicional`
  }

  if (shouldChargeHardwareSale(params.modality, params.employeesCount, ruleOpts)) {
    return `${label} · venta por separado (${unitLabel} c/u, descuento por volumen)`
  }

  return `${label} · terminal biométrica vendida por separado; continuidad de hardware`
}

export function buildModalityIncludesPlainLines(
  modality: VentasBillingModality,
  ctx?: VentasModalityContext
): string[] {
  const def = getVentasModalityDefinition(modality, ctx)
  const lines = [`${def.label} — qué incluye:`, ...def.includes.map((item) => `✅ ${item}`)]
  for (const note of def.excludesOrNotes) {
    lines.push(`• ${note}`)
  }
  return lines
}

function escapeHtml(v: string): string {
  return v
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

/** Bloque HTML para email de cotización. */
export function buildModalityIncludesHtml(
  modality: VentasBillingModality,
  ctx?: VentasModalityContext
): string {
  const def = getVentasModalityDefinition(modality, ctx)
  const items = def.includes
    .map((item) => `<li style="margin-bottom: 6px;">✅ ${escapeHtml(item)}</li>`)
    .join('')
  const notes = def.excludesOrNotes
    .map((note) => `<li style="margin-bottom: 6px; color: #555;">${escapeHtml(note)}</li>`)
    .join('')

  return `
    <div style="background: #f0f7ff; padding: 18px 20px; border-radius: 8px; margin: 22px 0; border-left: 4px solid #0b4fa1;">
      <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: bold; color: #111;">${escapeHtml(def.label)} — qué incluye</p>
      <ul style="margin: 0; padding: 0 0 0 18px; color: #333; font-size: 14px; line-height: 1.65;">
        ${items}
        ${notes}
      </ul>
    </div>
  `
}

export function buildMonthlyPricingBreakdownLines(quote: QuotationQuote, fmt: (n: number) => string): string[] {
  const employeesCount = quote.employees_count || quote.tier.min_employees
  const lines: string[] = [
    `- Software (mensual): ${fmt(quote.monthly_software_total)} / mes`,
    `- Continuidad de hardware: ${fmt(quote.monthly_hardware_fee)} / mes`,
  ]
  if (quote.coupon_applied) {
    const couponName = quote.coupon_code_applied?.trim()
    const label = couponName
      ? `Descuento por cupón «${couponName}» (aplicado al software anual, prorrateado al mes)`
      : 'Descuento por cupón (aplicado al software anual, prorrateado al mes)'
    lines.push(`- ${label}: −${fmt(quote.annual_discount_amount / 12)} / mes`)
  }
  lines.push(`- Total mensual cotizado: ${fmt(quote.monthly_total)} / mes`)
  lines.push(
    buildTerminalsPricingNote({
      modality: 'monthly',
      terminalsCount: quote.terminals_count,
      employeesCount,
      currency: quote.currency,
      rules: quote.business_rules,
      tier: {
        annual_terminal_mode: quote.tier?.annual_terminal_mode,
        included_terminals_max: quote.tier?.included_terminals_max,
      },
    })
  )
  return lines
}

/** Párrafo de oferta 72 h (solo cuerpo del correo; el PDF mantiene precio de lista). */
export function buildUrgencyOfferPitchText(_modality: VentasBillingModality): string {
  return 'Si aún haces estos procesos a mano, verdaderamente queremos ayudarte. Te otorgamos un 20% de descuento sobre el total del plan de software que elegiste por contratación temprana.'
}

export function buildModalityPerksSummaryLines(
  modality: VentasBillingModality,
  ctx?: VentasModalityContext
): string[] {
  const def = getVentasModalityDefinition(modality, ctx)
  return [
    ...def.includes.map((item) => `✅ ${item}`),
    ...def.excludesOrNotes.map((note) => `• ${note}`),
  ]
}

export function buildAnnualPricingBreakdownLines(quote: QuotationQuote, fmt: (n: number) => string): string[] {
  const employeesCount = quote.employees_count || quote.tier.min_employees
  const lines: string[] = [`- Subtotal anual (licencia): ${fmt(quote.annual_subtotal)} / año`]
  if (quote.coupon_applied) {
    const couponName = quote.coupon_code_applied?.trim()
    const label = couponName ? `Descuento por cupón «${couponName}»` : 'Descuento por cupón'
    lines.push(`- ${label}: −${fmt(quote.annual_discount_amount)} / año`)
  }
  lines.push(`- Total anual cotizado: ${fmt(quote.annual_total)} / año`)
  if ((quote.hardware_sale_total || 0) > 0) {
    const discPct = Math.round((quote.hardware_sale_discount_pct || 0) * 100)
    const extras = Number(quote.terminals_extra_count) || 0
    const included = Number(quote.terminals_included_count) || 0
    let saleLabel: string
    if (extras > 0 && included > 0) {
      saleLabel = `Terminales adicionales (${extras}${discPct > 0 ? `, −${discPct}%` : ''})`
    } else if (discPct > 0) {
      saleLabel = `Terminales (venta, −${discPct}% volumen)`
    } else {
      saleLabel = 'Terminales (venta)'
    }
    lines.push(`- ${saleLabel}: ${fmt(quote.hardware_sale_total)}`)
  }
  if (quote.monthly_hardware_fee > 0) {
    lines.push(`- Continuidad de hardware: ${fmt(quote.monthly_hardware_fee)} / mes`)
  }
  lines.push(
    buildTerminalsPricingNote({
      modality: 'annual',
      terminalsCount: quote.terminals_count,
      employeesCount,
      currency: quote.currency,
      rules: quote.business_rules,
      tier: {
        annual_terminal_mode: quote.tier?.annual_terminal_mode,
        included_terminals_max: quote.tier?.included_terminals_max,
      },
    })
  )
  return lines
}
