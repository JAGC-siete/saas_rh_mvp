import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { useAuth } from '../lib/auth'
import {
  DEFAULT_APP_LOCALE,
  isAppLocale,
  loadAppMessages,
  readCachedAppLocale,
  writeCachedAppLocale,
  type AppLocale,
  type AppMessages,
} from '../lib/i18n/app/locale'
import esMessages from '../lib/i18n/app/messages/es.json'

type AppLocaleContextValue = {
  locale: AppLocale
  /** Persists on the user profile; throws if the API rejects it. */
  // eslint-disable-next-line no-unused-vars
  setLocale: (locale: AppLocale) => Promise<void>
}

const AppLocaleContext = createContext<AppLocaleContextValue>({
  locale: DEFAULT_APP_LOCALE,
  setLocale: async () => {},
})

export const useAppLocale = () => useContext(AppLocaleContext)

// TODO: use the company timezone once dates are formatted through next-intl.
const TIME_ZONE = 'America/Tegucigalpa'

export function AppLocaleProvider({ children }: { children: ReactNode }) {
  const { userProfile, refreshUserProfile } = useAuth()
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_APP_LOCALE)
  const [messages, setMessages] = useState<AppMessages>(esMessages)

  // Spanish is bundled so SSR'd routes (login) render without waiting; English loads on demand.
  useEffect(() => {
    const cached = readCachedAppLocale()
    if (cached) setLocaleState(cached)
  }, [])

  const profileLocale = userProfile?.locale
  useEffect(() => {
    if (isAppLocale(profileLocale)) {
      setLocaleState(profileLocale)
      writeCachedAppLocale(profileLocale)
    }
  }, [profileLocale])

  useEffect(() => {
    let cancelled = false
    loadAppMessages(locale).then((m) => {
      if (!cancelled) setMessages(m)
    })
    document.documentElement.lang = locale
    return () => {
      cancelled = true
    }
  }, [locale])

  const setLocale = useCallback(
    async (next: AppLocale) => {
      const res = await fetch('/api/me/locale', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      })
      if (!res.ok) throw new Error(`locale update failed: ${res.status}`)
      setLocaleState(next)
      writeCachedAppLocale(next)
      await refreshUserProfile()
    },
    [refreshUserProfile]
  )

  return (
    <AppLocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone={TIME_ZONE}>
        {children}
      </NextIntlClientProvider>
    </AppLocaleContext.Provider>
  )
}
