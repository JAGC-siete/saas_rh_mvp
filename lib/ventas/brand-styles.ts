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
  isAnnual: boolean
}): string {
  const { terminalsCount, isAnnual } = params
  if (isAnnual) {
    return terminalsCount === 1 ? '1 (incluida)' : `${terminalsCount} (incluidas)`
  }
  return `${terminalsCount} · continuidad hardware`
}
