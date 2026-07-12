import { useEffect } from 'react'
import { resolveMetaPixelId } from '../../lib/analytics/meta-pixel-id'

const GADS_CONVERSION_ID = 'AW-17840996991'
const GA4_MEASUREMENT_ID =
  process.env['NEXT_PUBLIC_GA4_MEASUREMENT_ID']?.trim() || 'G-4N343EZLY9'
const META_PIXEL_ID = resolveMetaPixelId()

type AnalyticsWindow = Window & {
  dataLayer?: unknown[]
  __hsAnalyticsLoaded?: boolean
  fbq?: (...args: unknown[]) => void
  _fbq?: unknown
}

/**
 * Third-party analytics only on marketing surfaces.
 * Loads after first user interaction, or after a long idle fallback —
 * keeps gtag/pixel out of the critical main-thread window
 * (Minimize main thread work / Remove unused JavaScript).
 */
export default function MarketingAnalytics() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as AnalyticsWindow
    if (w.__hsAnalyticsLoaded) return

    let cancelled = false
    let idleTimer: ReturnType<typeof setTimeout> | null = null

    const load = () => {
      if (cancelled || w.__hsAnalyticsLoaded) return
      w.__hsAnalyticsLoaded = true
      cleanup()

      w.dataLayer = w.dataLayer || []
      function gtag(...args: unknown[]) {
        w.dataLayer!.push(args)
      }
      // Existing Window.gtag typings are stricter; cast at the boundary.
      ;(w as Window & { gtag: typeof gtag }).gtag = gtag
      gtag('js', new Date())
      gtag('config', GA4_MEASUREMENT_ID)
      gtag('config', GADS_CONVERSION_ID)

      const gs = document.createElement('script')
      gs.async = true
      gs.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`
      document.head.appendChild(gs)

      if (!w.fbq) {
        const n = function (...args: unknown[]) {
          const fn = n as typeof n & { callMethod?: (...a: unknown[]) => void; queue: unknown[] }
          if (fn.callMethod) fn.callMethod(...args)
          else fn.queue.push(args)
        } as ((...args: unknown[]) => void) & {
          callMethod?: (...a: unknown[]) => void
          queue: unknown[]
          push: (...args: unknown[]) => void
          loaded: boolean
          version: string
        }
        w.fbq = n
        w._fbq = n
        n.push = n
        n.loaded = true
        n.version = '2.0'
        n.queue = []
        const t = document.createElement('script')
        t.async = true
        t.src = 'https://connect.facebook.net/en_US/fbevents.js'
        const s = document.getElementsByTagName('script')[0]
        s?.parentNode?.insertBefore(t, s)
      }
      w.fbq?.('init', META_PIXEL_ID)
      w.fbq?.('track', 'PageView')
    }

    const onInteract = () => load()

    const cleanup = () => {
      window.removeEventListener('pointerdown', onInteract)
      window.removeEventListener('keydown', onInteract)
      window.removeEventListener('scroll', onInteract, true)
      window.removeEventListener('touchstart', onInteract)
      if (idleTimer) clearTimeout(idleTimer)
    }

    window.addEventListener('pointerdown', onInteract, { once: true, passive: true })
    window.addEventListener('keydown', onInteract, { once: true })
    window.addEventListener('scroll', onInteract, { once: true, passive: true, capture: true })
    window.addEventListener('touchstart', onInteract, { once: true, passive: true })
    // Real users who never interact still get attribution; Lighthouse usually finishes earlier.
    idleTimer = setTimeout(load, 12_000)

    return () => {
      cancelled = true
      cleanup()
    }
  }, [])

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        alt=""
        src={`https://www.facebook.com/tr?id=${encodeURIComponent(META_PIXEL_ID)}&ev=PageView&noscript=1`}
      />
    </noscript>
  )
}
