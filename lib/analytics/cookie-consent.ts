/**
 * Opt-in consent for marketing tags (GA4, Google Ads, Meta Pixel).
 * Technical cookies (session, landing tone) do not go through this gate.
 */

export const COOKIE_CONSENT_STORAGE_KEY = 'hs_cookie_consent'
export const COOKIE_CONSENT_COOKIE = 'hs_cookie_consent'
export const COOKIE_CONSENT_EVENT = 'hs-cookie-consent'
export const COOKIE_BANNER_OPEN_EVENT = 'hs-cookie-banner-open'
export const COOKIE_CONSENT_MAX_AGE_SEC = 365 * 24 * 60 * 60
export const COOKIE_BANNER_OFFSET_VAR = '--hs-cookie-offset'

export type CookieConsentChoice = 'accepted' | 'rejected'
export type CookieConsentStatus = CookieConsentChoice | 'unset'

export function isCookieConsentChoice(value: unknown): value is CookieConsentChoice {
  return value === 'accepted' || value === 'rejected'
}

export function parseCookieConsentStatus(value: unknown): CookieConsentStatus {
  return isCookieConsentChoice(value) ? value : 'unset'
}

export function analyticsAllowed(status: CookieConsentStatus): boolean {
  return status === 'accepted'
}

export function cookieConsentSetCookieString(choice: CookieConsentChoice): string {
  return `${COOKIE_CONSENT_COOKIE}=${choice};path=/;max-age=${COOKIE_CONSENT_MAX_AGE_SEC};samesite=lax`
}

function readConsentCookie(): CookieConsentStatus {
  if (typeof document === 'undefined') return 'unset'
  const match = document.cookie.match(/(?:^|; )hs_cookie_consent=([^;]*)/)
  if (!match?.[1]) return 'unset'
  try {
    return parseCookieConsentStatus(decodeURIComponent(match[1]))
  } catch {
    return parseCookieConsentStatus(match[1])
  }
}

export function readCookieConsent(): CookieConsentStatus {
  if (typeof window === 'undefined') return 'unset'
  try {
    const stored = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
    const fromStorage = parseCookieConsentStatus(stored)
    if (fromStorage !== 'unset') return fromStorage
  } catch {
    // private mode / quota
  }
  return readConsentCookie()
}

export function persistCookieConsent(choice: CookieConsentChoice): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, choice)
  } catch {
    // private mode / quota
  }
  try {
    document.cookie = cookieConsentSetCookieString(choice)
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: choice }))
}

export function openCookieBanner(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(COOKIE_BANNER_OPEN_EVENT))
}

export function subscribeCookieConsent(listener: (choice: CookieConsentStatus) => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  const onChange = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail
    listener(parseCookieConsentStatus(detail))
  }
  window.addEventListener(COOKIE_CONSENT_EVENT, onChange)
  return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onChange)
}
