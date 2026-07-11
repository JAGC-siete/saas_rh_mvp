import Link from 'next/link'
import { useEffect, useState } from 'react'

export const HOME_CALC_BANNER_STORAGE_KEY = 'hs_home_calc_banner_v1'

type Props = {
  onVisibilityChange?: (visible: boolean) => void
}

export default function HomeAnnouncementBanner({ onVisibilityChange }: Props) {
  const [visible, setVisible] = useState<boolean | null>(null)

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
      aria-label="Anuncio"
      className="fixed top-0 inset-x-0 z-[60] border-b border-violet-800/60 bg-violet-950"
    >
      <div className="relative mx-auto flex min-h-9 items-center justify-center px-10 py-2 sm:min-h-10 sm:px-12">
        <p className="text-center text-xs sm:text-sm text-violet-200/90 leading-snug">
          ¿Vienes por la calculadora de deducciones?{' '}
          <Link
            href="/calculadora"
            className="underline underline-offset-2 decoration-violet-300/70 hover:text-white transition-colors"
          >
            Haz click aquí.
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-violet-200/80 hover:text-white hover:bg-white/10 transition-colors"
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
