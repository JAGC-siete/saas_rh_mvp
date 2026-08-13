/**
 * Thank-you UI context via sessionStorage — never put PII in URL query strings.
 * GA4/Ads capture full page URLs; email/name in query violates Google policies.
 */

export type ThankYouKind = 'activar' | 'ventas'

export type ThankYouContext = {
  displayName?: string
  empresa?: string
  empleados?: number
  countryCode?: string
  /** Masked only, e.g. j***@dominio.com — never put full email in page URLs. */
  emailHintMasked?: string
  /** Prebuilt wa.me URL for success CTA (session only). */
  whatsappUrl?: string
}

const STORAGE_PREFIX = 'hs_ty_'

function storageKey(kind: ThankYouKind): string {
  return `${STORAGE_PREFIX}${kind}`
}

/** Mask email for UI copy: j***@dominio.com */
export function maskEmailForHint(email: string): string {
  const trimmed = email.trim()
  const at = trimmed.indexOf('@')
  if (at <= 0) return 'tu correo'
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  const visible = local.slice(0, 1)
  return `${visible}***@${domain}`
}

export function writeThankYouContext(kind: ThankYouKind, payload: ThankYouContext): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(storageKey(kind), JSON.stringify(payload))
  } catch {
    // quota / private mode — TY page falls back to generic copy
  }
}

export function readThankYouContext(kind: ThankYouKind, opts?: { clear?: boolean }): ThankYouContext | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(storageKey(kind))
    if (!raw) return null
    if (opts?.clear !== false) {
      sessionStorage.removeItem(storageKey(kind))
    }
    const parsed = JSON.parse(raw) as ThankYouContext
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}
