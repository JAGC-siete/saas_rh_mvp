import type { QuotationQuote } from './types'
import { roundMoney } from './pricing'
import {
  quoteIncludesBiometricTerminals,
  shouldChargeHardwareSale,
  VENTAS_HARDWARE_SALE_UNIT_PRICE,
  type VentasBillingModality,
} from './business-rules'

export type { VentasBillingModality }

/** Cuota mensual de la primera terminal (base). */
export const VENTAS_HARDWARE_BASE_MONTHLY = 958.33
/** Descuento incremental por cada terminal adicional (hasta el piso). */
export const VENTAS_HARDWARE_INCREMENTAL_DISCOUNT = 95
/** Piso de cuota mensual por terminal (desde la 4.ª en adelante). */
export const VENTAS_HARDWARE_FLOOR_MONTHLY = 673.33

/** Máximo de terminales en cotización automática del formulario web. */
export const VENTAS_MAX_AUTO_QUOTE_TERMINALS = 10

const SHARED_SERVICE_INCLUDES = [
  'Instalación de la terminal',
  'Migración y sincronización',
  'Capacitación',
  'Soporte local',
  'Impuestos',
] as const

const TERMINALS_INCLUDED_LINE = 'Terminal biométrica incluida en la propuesta' as const

const TERMINALS_CONTINUITY_NOTES = [
  'La terminal biométrica se vende por separado (no está incluida en el total de software); se cotiza como Servicio de Continuidad de Hardware',
] as const

const TERMINALS_SALE_NOTES = [
  'La terminal biométrica se vende por separado a L. 6,500 c/u (descuento por volumen desde 2 unidades)',
] as const

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
}

function employeesFromContext(ctx?: VentasModalityContext): number {
  const n = ctx?.employeesCount
  return Number.isFinite(n) ? Number(n) : 0
}

export function getVentasModalityDefinition(
  modality: VentasBillingModality,
  ctx?: VentasModalityContext
): VentasModalityDefinition {
  const employeesCount = employeesFromContext(ctx)

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

  const includesTerminals = quoteIncludesBiometricTerminals('annual', employeesCount)

  if (includesTerminals) {
    return {
      modality: 'annual',
      label: 'Plan Anual',
      formHint: `Incluye licencia anual del software, terminal biométrica incluida (hasta ${VENTAS_MAX_AUTO_QUOTE_TERMINALS} en cotización automática), instalación, migración, capacitación, soporte local e impuestos.`,
      includes: [
        'Licencia anual de software Humano SISU',
        ...SHARED_SERVICE_INCLUDES,
        TERMINALS_INCLUDED_LINE,
      ],
      excludesOrNotes: [],
      successSummaryLine: `Incluye licencia anual del software, terminal biométrica (hasta ${VENTAS_MAX_AUTO_QUOTE_TERMINALS} en esta propuesta), instalación, migración, capacitación, soporte local e impuestos.`,
    }
  }

  return {
    modality: 'annual',
    label: 'Plan Anual',
    formHint: `Incluye licencia anual del software, instalación, migración, capacitación, soporte local e impuestos. La terminal biométrica no está incluida en este rango: se vende por separado a L. ${VENTAS_HARDWARE_SALE_UNIT_PRICE.toLocaleString('es-HN')} c/u (descuento por volumen desde 2 unidades).`,
    includes: ['Licencia anual de software Humano SISU', ...SHARED_SERVICE_INCLUDES],
    excludesOrNotes: [...TERMINALS_SALE_NOTES],
    successSummaryLine:
      'Incluye licencia anual del software y servicios de implementación. La terminal biométrica se vende por separado según cantidad indicada.',
  }
}

export function ventasTooManyTerminalsErrorMessage(): string {
  return `Para más de ${VENTAS_MAX_AUTO_QUOTE_TERMINALS} terminales cotizamos aparte. Escríbenos y te confirmamos el monto de terminales y continuidad de hardware.`
}

/** Cuota mensual de una terminal según su posición (1 = base, 2+ = decreciente hasta el piso). */
export function hardwareUnitFeeMonthly(terminalIndex: number): number {
  if (terminalIndex < 1) return 0
  const raw =
    VENTAS_HARDWARE_BASE_MONTHLY - (terminalIndex - 1) * VENTAS_HARDWARE_INCREMENTAL_DISCOUNT
  return roundMoney(Math.max(raw, VENTAS_HARDWARE_FLOOR_MONTHLY))
}

export function hardwareFeeMonthly(terminalsCount: number): { fee: number; special: boolean } {
  if (terminalsCount <= 0) return { fee: 0, special: false }
  if (terminalsCount > VENTAS_MAX_AUTO_QUOTE_TERMINALS) return { fee: 0, special: true }
  let total = 0
  for (let i = 1; i <= terminalsCount; i++) {
    total += hardwareUnitFeeMonthly(i)
  }
  return { fee: roundMoney(total), special: false }
}

export function buildTerminalsPricingNote(params: {
  modality: VentasBillingModality
  terminalsCount: number
  employeesCount: number
}): string {
  const n = params.terminalsCount
  const label = n === 1 ? '1 terminal declarada' : `${n} terminales declaradas`
  const includes = quoteIncludesBiometricTerminals(params.modality, params.employeesCount)

  if (includes) {
    return `${label} · terminal biométrica incluida en plan anual (hasta ${VENTAS_MAX_AUTO_QUOTE_TERMINALS} en cotización automática)`
  }

  if (shouldChargeHardwareSale(params.modality, params.employeesCount)) {
    return `${label} · venta por separado (L. ${VENTAS_HARDWARE_SALE_UNIT_PRICE.toLocaleString('es-HN')} c/u, descuento por volumen)`
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
    const saleLabel =
      discPct > 0
        ? `Terminales (venta, −${discPct}% volumen)`
        : 'Terminales (venta)'
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
    })
  )
  return lines
}
