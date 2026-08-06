import { LIQUID } from '../brand/liquid-tokens'

/** Shared institutional tokens for ventas email + PDF (Infraestructura Líquida). */
export const VENTAS_BRAND = {
  primary: LIQUID.brand900,
  accent: LIQUID.accentWhatsApp,
  accentDark: LIQUID.accentWhatsAppDark,
  panelBg: LIQUID.panelBg,
  panelBgAlt: LIQUID.panelBgAlt,
  panelBorder: LIQUID.panelBorder,
  text: LIQUID.ink,
  textBody: LIQUID.inkBody,
  textMuted: LIQUID.inkMuted,
  urgencyBg: LIQUID.urgencyBg,
  urgencyBorder: LIQUID.urgencyBorder,
  urgencyText: LIQUID.urgencyText,
  /** Dark glass tokens for ventas emails on liquid background */
  emailText: LIQUID.text,
  emailTextSoft: LIQUID.textSoft,
  emailTextMuted: LIQUID.textMuted,
  emailGlassBg: LIQUID.glassBgLight,
  emailGlassBorder: LIQUID.glassBorderLight,
  emailAccent: LIQUID.brand500,
} as const

export function buildVentasRefLabel(companyName?: string, contactName?: string): string {
  const raw = (companyName || contactName || 'SISU').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
  return raw.toUpperCase() || 'SISU'
}

export function buildTerminalsDisplayLabel(params: {
  terminalsCount: number
  /** When true, terminals are included in the plan (no extra charge). */
  includesTerminals: boolean
  /** sale = one-shot purchase; continuity = monthly HW fee. Ignored if includesTerminals. */
  hardwareMode?: 'included' | 'sale' | 'continuity'
  /** Cupo incluido sin cargo (plan anual). */
  includedCount?: number
  /** Terminales adicionales cobradas. */
  extraCount?: number
}): string {
  const { terminalsCount, includesTerminals, hardwareMode, includedCount, extraCount } = params
  const extras = Math.max(0, Math.floor(Number(extraCount) || 0))
  const included = Math.max(0, Math.floor(Number(includedCount) || 0))

  if ((includesTerminals || hardwareMode === 'included') && extras > 0 && included > 0) {
    return `${terminalsCount} (${included} incluidas + ${extras} adicional${extras === 1 ? '' : 'es'})`
  }
  if (includesTerminals || hardwareMode === 'included') {
    return terminalsCount === 1 ? '1 (incluida)' : `${terminalsCount} (incluidas)`
  }
  if (hardwareMode === 'sale') {
    return terminalsCount === 1 ? '1 · venta' : `${terminalsCount} · venta`
  }
  return `${terminalsCount} · continuidad hardware`
}
