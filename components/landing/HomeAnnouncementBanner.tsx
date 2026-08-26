import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getHomeCopy } from '../../lib/i18n/landings/home'
import { useLandingPreferences } from './LandingPreferencesProvider'

export const HOME_CALC_BANNER_STORAGE_KEY = 'hs_home_calc_banner_v1'

type Props = {
  onVisibilityChange?: (visible: boolean) => void
}

export default function HomeAnnouncementBanner({ onVisibilityChange }: Props) {
  const [visible, setVisible] = useState<boolean | null>(null)
  const { locale, href, tone } = useLandingPreferences()
  const copy = getHomeCopy(locale)
  const isLight = tone === 'light'

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(HOME_CALC_BANNER_STORAGE_KEY) === '1'
      setVisible(!dismissed)
    } catch {
      setVisible(true)
    }
  }, [])

  useEffect(() => {
    if (visible === null) return
    onVisibilityChange?.(visible)
  }, [visible, onVisibilityChange])

  const dismiss = () => {
    try {
      window.localStorage.setItem(HOME_CALC_BANNER_STORAGE_KEY, '1')
    } catch {
      // ignore quota / private mode
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label={copy.bannerAria}
      className={
        isLight
          ? 'fixed top-0 inset-x-0 z-[60] border-b border-slate-200/80 bg-white'
          : 'fixed top-0 inset-x-0 z-[60] border-b border-white/10 bg-[#020617]'
      }
    >
      <div className="relative mx-auto flex min-h-9 items-center justify-center px-10 py-2 sm:min-h-10 sm:px-12">
        <p
          className={
            isLight
              ? 'text-center text-xs sm:text-sm text-slate-600 leading-snug'
              : 'text-center text-xs sm:text-sm text-slate-300 leading-snug'
          }
        >
          {copy.bannerText}{' '}
          <Link
            prefetch={false}
            href={href('/paz')}
            className={
              isLight
                ? 'underline underline-offset-2 decoration-slate-400 hover:text-slate-900 transition-colors'
                : 'underline underline-offset-2 decoration-slate-400 hover:text-white transition-colors'
            }
          >
            {copy.bannerCta}
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={copy.bannerClose}
          className={
            isLight
              ? 'absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors'
              : 'absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors'
          }
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M3 3l8 8M11 3L3 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
