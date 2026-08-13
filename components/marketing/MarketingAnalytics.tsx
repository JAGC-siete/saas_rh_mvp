import { useEffect } from 'react'
import { flushPendingGoogleAdsConversions } from '../../lib/analytics/googleAds'
import { resolveMetaPixelId } from '../../lib/analytics/meta-pixel-id'

const GADS_CONVERSION_ID = 'AW-17840996991'
const GA4_MEASUREMENT_ID =
  process.env['NEXT_PUBLIC_GA4_MEASUREMENT_ID']?.trim() || 'G-4N343EZLY9'
const META_PIXEL_ID = resolveMetaPixelId()

/** Delay Meta past typical Lighthouse LCP; interaction still loads sooner. */
const META_IDLE_FALLBACK_MS = 15_000

type AnalyticsWindow = Window & {
  dataLayer?: unknown[]
  __hsGtagLoaded?: boolean
  __hsMetaLoaded?: boolean
  fbq?: (...args: unknown[]) => void
  _fbq?: unknown
}

/**
 * Marketing analytics:
 * - Google tag (GA4 + AW-17840996991) loads immediately so Ads Tag Assistant /
 *   conversion verification sees the tag without waiting for a click.
 * - Meta Pixel stays deferred (interaction or idle) to protect LCP lab scores.
 *
 * Scroll is intentionally omitted for Meta: Lighthouse often synthesizes scroll.
 */
export default function MarketingAnalytics() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as AnalyticsWindow

    let cancelled = false
    let idleTimer: ReturnType<typeof setTimeout> | null = null

    const loadGtag = () => {
      if (cancelled || w.__hsGtagLoaded) return
      w.__hsGtagLoaded = true

      w.dataLayer = w.dataLayer || []
      function gtag(...args: unknown[]) {
        w.dataLayer!.push(args)
      }
      // Existing Window.gtag typings are stricter; cast at the boundary.
      ;(w as Window & { gtag: typeof gtag }).gtag = gtag
      gtag('js', new Date())
      gtag('config', GA4_MEASUREMENT_ID)
      gtag('config', GADS_CONVERSION_ID)
      flushPendingGoogleAdsConversions()

      const gs = document.createElement('script')
      gs.async = true
      // Load by Ads ID so Tag Assistant / Ads crawlers resolve AW first.
      gs.src = `https://www.googletagmanager.com/gtag/js?id=${GADS_CONVERSION_ID}`
      document.head.appendChild(gs)
    }

    const loadMeta = () => {
      if (cancelled || w.__hsMetaLoaded) return
      w.__hsMetaLoaded = true
      cleanupMeta()

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

    const onInteract = () => loadMeta()

    const cleanupMeta = () => {
      window.removeEventListener('pointerdown', onInteract)
      window.removeEventListener('keydown', onInteract)
      if (idleTimer) clearTimeout(idleTimer)
    }

    loadGtag()

    if (w.__hsMetaLoaded) {
      return () => {
        cancelled = true
      }
    }

    window.addEventListener('pointerdown', onInteract, { once: true, passive: true })
    window.addEventListener('keydown', onInteract, { once: true })
    idleTimer = setTimeout(loadMeta, META_IDLE_FALLBACK_MS)

    return () => {
      cancelled = true
      cleanupMeta()
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
