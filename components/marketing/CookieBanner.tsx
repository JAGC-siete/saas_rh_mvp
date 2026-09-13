import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLandingPreferences } from '../landing/LandingPreferencesProvider'
import { getCommonCopy } from '../../lib/i18n/landings/common'
import { PRIVACY_PUBLIC_PATH } from '../../lib/marketing/legal-paths'
import {
  COOKIE_BANNER_OFFSET_VAR,
  COOKIE_BANNER_OPEN_EVENT,
  persistCookieConsent,
  readCookieConsent,
  type CookieConsentChoice,
} from '../../lib/analytics/cookie-consent'

export default function CookieBanner() {
  const { locale, href, tone } = useLandingPreferences()
  const copy = getCommonCopy(locale)
  const isLight = tone === 'light'
  const [visible, setVisible] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setVisible(readCookieConsent() === 'unset')
    const onOpen = () => setVisible(true)
    window.addEventListener(COOKIE_BANNER_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(COOKIE_BANNER_OPEN_EVENT, onOpen)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (!visible) {
      root.style.setProperty(COOKIE_BANNER_OFFSET_VAR, '0px')
      return
    }
    const applyOffset = () => {
      const height = bannerRef.current?.offsetHeight ?? 0
      root.style.setProperty(COOKIE_BANNER_OFFSET_VAR, `${height}px`)
    }
    applyOffset()
    window.addEventListener('resize', applyOffset)
    return () => {
      window.removeEventListener('resize', applyOffset)
      root.style.setProperty(COOKIE_BANNER_OFFSET_VAR, '0px')
    }
  }, [visible])

  const choose = (choice: CookieConsentChoice) => {
    const previous = readCookieConsent()
    persistCookieConsent(choice)
    setVisible(false)
    if (choice === 'rejected' && previous === 'accepted') {
      window.location.reload()
    }
  }

  if (!visible) return null

  return (
    <div
      ref={bannerRef}
      role="region"
      aria-label={copy.cookies.aria}
      className={
        isLight
          ? 'fixed inset-x-0 bottom-0 z-[110] border-t border-slate-200 bg-white font-sans'
          : 'fixed inset-x-0 bottom-0 z-[110] border-t border-white/15 bg-slate-950 font-sans'
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-4">
        <p
          className={
            isLight
              ? 'text-sm text-slate-700 sm:max-w-2xl'
              : 'text-sm text-slate-200 sm:max-w-2xl'
          }
        >
          {copy.cookies.message}{' '}
          <Link
            prefetch={false}
            href={href(PRIVACY_PUBLIC_PATH)}
            className={
              isLight
                ? 'underline underline-offset-2 decoration-slate-400 hover:text-slate-900'
                : 'underline underline-offset-2 decoration-slate-400 hover:text-white'
            }
          >
            {copy.cookies.privacyLink}
          </Link>
        </p>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => choose('rejected')}
            className={
              isLight
                ? 'min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100'
                : 'min-h-[44px] rounded-xl border border-white/25 px-4 py-2 text-sm font-medium text-white hover:bg-white/10'
            }
          >
            {copy.cookies.reject}
          </button>
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="min-h-[44px] rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            {copy.cookies.accept}
          </button>
        </div>
      </div>
    </div>
  )
}
