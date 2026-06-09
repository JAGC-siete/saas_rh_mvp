/** Shared institutional tokens for ventas email + PDF. */
export const VENTAS_BRAND = {
  primary: '#0b4fa1',
  accent: '#25D366',
  accentDark: '#128C7E',
  panelBg: '#f6f8fa',
  panelBgAlt: '#f8fafc',
  panelBorder: '#dbe3ea',
  text: '#1a1a1a',
  textBody: '#333333',
  textMuted: '#64748b',
  urgencyBg: '#fffbeb',
  urgencyBorder: '#fcd34d',
  urgencyText: '#92400e',
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
