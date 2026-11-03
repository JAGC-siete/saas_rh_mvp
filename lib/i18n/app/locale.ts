import { isLandingLocale, type LandingLocale } from '../locale'
import type esMessages from './messages/es.json'

/** Admin app (/app) shares the es/en pair with the landings, but the locale lives on the user, not the URL. */
export type AppLocale = LandingLocale
export type AppMessages = typeof esMessages

export const DEFAULT_APP_LOCALE: AppLocale = 'es'
export const APP_ENGLISH_FEATURE = 'app_english'

export const isAppLocale = isLandingLocale

const CACHE_KEY = 'hs_app_locale'

/** Last locale used on this browser, so a reload doesn't flash Spanish before the profile loads. */
export function readCachedAppLocale(): AppLocale | null {
  try {
    const value = localStorage.getItem(CACHE_KEY)
    return isAppLocale(value) ? value : null
  } catch {
    return null
  }
}

export function writeCachedAppLocale(locale: AppLocale): void {
  try {
    localStorage.setItem(CACHE_KEY, locale)
  } catch {
    // private mode / blocked storage: the profile still holds the choice
  }
}

export async function loadAppMessages(locale: AppLocale): Promise<AppMessages> {
  const mod = locale === 'en' ? await import('./messages/en.json') : await import('./messages/es.json')
  return mod.default
}
