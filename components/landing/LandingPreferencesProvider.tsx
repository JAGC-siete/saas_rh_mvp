import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/router'
import {
  applyLandingTone,
  DEFAULT_LANDING_TONE,
  isLandingTone,
  persistLandingTone,
  readStoredLandingTone,
  type LandingTone,
} from '../../lib/landing/theme'
import {
  alternateLocale,
  getLocaleFromAsPath,
  localizedHref,
  LOCALE_HTML_LANG,
  stripLocalePrefix,
  type LandingLocale,
} from '../../lib/i18n/locale'

type LandingPreferencesValue = {
  enabled: boolean
  tone: LandingTone
  setTone: (tone: LandingTone) => void
  toggleTone: () => void
  /** Page-level DOM lock (e.g. /paz light). Survives provider hydrate. */
  setToneLock: (lock: LandingTone | null) => void
  locale: LandingLocale
  href: (path: string) => string
  switchLocaleHref: string
}

const LandingPreferencesContext = createContext<LandingPreferencesValue | null>(null)

function readDomTone(): LandingTone {
  if (typeof document === 'undefined') return DEFAULT_LANDING_TONE
  const fromDom = document.documentElement.dataset.landingTone
  return isLandingTone(fromDom) ? fromDom : DEFAULT_LANDING_TONE
}

export function LandingPreferencesProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [tone, setToneState] = useState<LandingTone>(DEFAULT_LANDING_TONE)
  const [mounted, setMounted] = useState(false)
  /** Sync ref so child layout effects can lock before this provider's hydrate effect runs. */
  const toneLockRef = useRef<LandingTone | null>(null)

  const locale = getLocaleFromAsPath(router.asPath || '/')

  const setToneLock = useCallback((lock: LandingTone | null) => {
    toneLockRef.current = lock
    if (lock) {
      applyLandingTone(lock)
      return
    }
    const restored = readStoredLandingTone() ?? DEFAULT_LANDING_TONE
    applyLandingTone(restored)
  }, [])

  useEffect(() => {
    const stored = readStoredLandingTone()
    const initial = stored ?? readDomTone()
    setToneState(initial)
    // Child shell may have already locked via useLayoutEffect + setToneLock.
    if (!toneLockRef.current) {
      applyLandingTone(initial)
    } else {
      applyLandingTone(toneLockRef.current)
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.lang = LOCALE_HTML_LANG[locale]
  }, [locale, mounted])

  const setTone = useCallback((next: LandingTone) => {
    setToneState(next)
    persistLandingTone(next)
    if (!toneLockRef.current) {
      applyLandingTone(next)
    }
  }, [])

  const toggleTone = useCallback(() => {
    setTone(tone === 'dark' ? 'light' : 'dark')
  }, [setTone, tone])

  const href = useCallback((path: string) => localizedHref(locale, path), [locale])

  const switchLocaleHref = useMemo(() => {
    const other = alternateLocale(locale)
    return localizedHref(other, stripLocalePrefix(router.asPath || '/'))
  }, [locale, router.asPath])

  const value = useMemo<LandingPreferencesValue>(
    () => ({
      enabled: true,
      tone,
      setTone,
      toggleTone,
      setToneLock,
      locale,
      href,
      switchLocaleHref,
    }),
    [tone, setTone, toggleTone, setToneLock, locale, href, switchLocaleHref]
  )

  return (
    <LandingPreferencesContext.Provider value={value}>{children}</LandingPreferencesContext.Provider>
  )
}

const fallback: LandingPreferencesValue = {
  enabled: false,
  tone: DEFAULT_LANDING_TONE,
  setTone: () => {},
  toggleTone: () => {},
  setToneLock: () => {},
  locale: 'es',
  href: (path) => path,
  switchLocaleHref: '/en',
}

export function useLandingPreferences(): LandingPreferencesValue {
  return useContext(LandingPreferencesContext) ?? fallback
}

/** Register a page tone lock before paint when possible (child layout → parent hydrate). */
export function useLandingToneLock(lock: LandingTone | null | undefined): void {
  const { setToneLock } = useLandingPreferences()
  useLayoutEffect(() => {
    if (!lock) return
    setToneLock(lock)
    return () => setToneLock(null)
  }, [lock, setToneLock])
}
