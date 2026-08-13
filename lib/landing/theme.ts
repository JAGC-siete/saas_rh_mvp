export type LandingTone = 'dark' | 'light'

export const LANDING_TONE_STORAGE_KEY = 'hs_landing_tone'
export const LANDING_TONE_COOKIE = 'hs_landing_tone'
export const DEFAULT_LANDING_TONE: LandingTone = 'dark'

export function isLandingTone(value: unknown): value is LandingTone {
  return value === 'dark' || value === 'light'
}

/** Apply tone to <html> for CSS tokens + FOUC alignment. */
export function applyLandingTone(tone: LandingTone): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.landingTone = tone
}

export function readStoredLandingTone(): LandingTone | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(LANDING_TONE_STORAGE_KEY)
    return isLandingTone(stored) ? stored : null
  } catch {
    return null
  }
}

export function persistLandingTone(tone: LandingTone): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LANDING_TONE_STORAGE_KEY, tone)
  } catch {
    // private mode / quota
  }
  try {
    document.cookie = `${LANDING_TONE_COOKIE}=${tone};path=/;max-age=31536000;samesite=lax`
  } catch {
    // ignore
  }
}
