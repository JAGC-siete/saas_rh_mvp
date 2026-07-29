/**
 * Google Ads / gtag (conversiones y engagement)
 *
 * Taxonomía (1B + 2A):
 * - Primary page-load: ACTIVATION (/activar/gracias), QUOTE (/ventas/gracias)
 * - Secondary: LEAD, WHATSAPP, COMPARISON
 * - CTAs internos: solo engagement GA4 (nunca conversión Ads)
 *
 * Variables: ver `.env.example` sección Google Ads.
 */

import { trackGA4Event } from './ga4'

/** Primary — trial thank-you */
const SEND_TO_ACTIVATION = process.env.NEXT_PUBLIC_GADS_SEND_TO_ACTIVATION?.trim()
/**
 * Primary — quote thank-you.
 * Fallback temporal al label Contact ya creado en Ads (migrar a QUOTE dedicado).
 */
const SEND_TO_QUOTE =
  process.env.NEXT_PUBLIC_GADS_SEND_TO_QUOTE?.trim() ||
  process.env.NEXT_PUBLIC_GADS_SEND_TO_CONTACT?.trim() ||
  'AW-17840996991/-3XtCO6xydccEP-EoLtC'
/** Secondary — PDF calculadoras, /info, newsletter */
const SEND_TO_LEAD = process.env.NEXT_PUBLIC_GADS_SEND_TO_LEAD?.trim()
const SEND_TO_WHATSAPP = process.env.NEXT_PUBLIC_GADS_SEND_TO_WHATSAPP?.trim()
const SEND_TO_COMPARISON = process.env.NEXT_PUBLIC_GADS_SEND_TO_COMPARISON?.trim()

/** Paths where gtag must load immediately (page-load conversion). */
export const THANK_YOU_PATHS = ['/activar/gracias', '/ventas/gracias', '/gracias'] as const

interface ConversionPayload {
  send_to: string
  value?: number
  currency?: string
  transaction_id?: string
  event_callback?: () => void
}

/** gtag carga diferido en marketing; encolar hasta que MarketingAnalytics lo monte. */
const pendingConversions: ConversionPayload[] = []

function fireGoogleAdsConversion(
  sendTo: string | undefined,
  extra?: { value?: number; currency?: string; transaction_id?: string }
): void {
  if (typeof window === 'undefined') return
  const trimmed = sendTo?.trim()
  if (!trimmed) return
  const conversionEvent: ConversionPayload = { send_to: trimmed }
  if (extra?.value !== undefined) {
    conversionEvent.value = extra.value
    conversionEvent.currency = extra.currency ?? 'USD'
  }
  if (extra?.transaction_id) {
    conversionEvent.transaction_id = extra.transaction_id
  }
  if (typeof window.gtag !== 'function') {
    pendingConversions.push(conversionEvent)
    return
  }
  window.gtag('event', 'conversion', conversionEvent)
}

/** Disparar conversiones encoladas cuando el stub gtag ya está disponible. */
export function flushPendingGoogleAdsConversions(): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  while (pendingConversions.length > 0) {
    const event = pendingConversions.shift()
    if (!event) break
    window.gtag('event', 'conversion', event)
  }
}

function comparisonSessionKey(page: string): string {
  return `gads_dedupe_comparison_${page.replace(/[^a-z0-9]+/gi, '_')}`
}

/** Lead Secondary (calculadoras PDF, /info, newsletter) si SEND_TO_LEAD está definido. */
export function fireGoogleAdsLeadConversion(transactionId?: string): void {
  fireGoogleAdsConversion(SEND_TO_LEAD, {
    transaction_id: transactionId,
  })
}

/**
 * Engagement post-submit del trial (GA4 / gtag). La conversión Ads Primary
 * vive en `trackTrialThankYouPageView` (/activar/gracias).
 */
export function trackActivationFormSubmit(
  email: string,
  empresa: string,
  empleados: number,
  _transactionId?: string
): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'form_submit', {
      event_category: 'Activation',
      event_label: 'Activation Form',
      value: empleados,
      custom_parameters: {
        empresa,
        empleados,
      },
    })
  }

  trackGA4Event('activation_submit', {
    event_category: 'Activation',
    event_label: 'Activation Form',
    value: empleados,
  })
}

const TRIAL_THANK_YOU_DEDUPE_KEY = 'gads_dedupe_trial_thank_you'
const QUOTE_THANK_YOU_DEDUPE_KEY = 'gads_dedupe_quote_thank_you'

/**
 * Primary page-load en /activar/gracias.
 * Requiere NEXT_PUBLIC_GADS_SEND_TO_ACTIVATION (sin fallback Contact).
 */
export function trackTrialThankYouPageView(transactionId?: string): void {
  if (typeof window !== 'undefined') {
    if (sessionStorage.getItem(TRIAL_THANK_YOU_DEDUPE_KEY)) return
    sessionStorage.setItem(TRIAL_THANK_YOU_DEDUPE_KEY, '1')
  }

  fireGoogleAdsConversion(SEND_TO_ACTIVATION, {
    transaction_id: transactionId || `trial_ty_${Date.now()}`,
  })

  trackGA4Event('trial_thank_you', {
    event_category: 'Activation',
    event_label: 'Trial Thank You',
  })
}

/**
 * Primary page-load en /ventas/gracias.
 */
export function trackQuoteThankYouPageView(transactionId?: string): void {
  if (typeof window !== 'undefined') {
    if (sessionStorage.getItem(QUOTE_THANK_YOU_DEDUPE_KEY)) return
    sessionStorage.setItem(QUOTE_THANK_YOU_DEDUPE_KEY, '1')
  }

  fireGoogleAdsConversion(SEND_TO_QUOTE, {
    transaction_id: transactionId || `quote_ty_${Date.now()}`,
  })

  trackGA4Event('quote_thank_you', {
    event_category: 'Ventas',
    event_label: 'Quote Thank You',
  })
}

/**
 * CTA interno: solo engagement GA4. Nunca dispara conversión Ads (política 2A).
 */
export function trackCTAClick(ctaType: string, location: string): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'cta_click', {
      event_category: 'Engagement',
      event_label: ctaType,
      location,
    })
  }

  trackGA4Event('cta_click', {
    event_category: 'Engagement',
    event_label: ctaType,
    location,
  })
}

/**
 * WhatsApp Secondary; conversión opcional vía NEXT_PUBLIC_GADS_SEND_TO_WHATSAPP.
 */
export function trackWhatsAppClick(context: string): void {
  fireGoogleAdsConversion(SEND_TO_WHATSAPP)

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'whatsapp_click', {
      event_category: 'Contact',
      event_label: context,
    })
  }

  trackGA4Event('whatsapp_click', {
    event_category: 'Contact',
    event_label: context,
  })
}

/**
 * Vista de comparación Secondary; deduplica en la misma pestaña.
 */
export function trackComparisonView(page: string): void {
  if (typeof window !== 'undefined') {
    const key = comparisonSessionKey(page)
    if (sessionStorage.getItem(key)) {
      return
    }
    sessionStorage.setItem(key, '1')
  }

  fireGoogleAdsConversion(SEND_TO_COMPARISON)

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      event_category: 'Comparison',
      event_label: page,
    })
  }
}

export function getUTMParameters(): {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
} {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_term: params.get('utm_term') || undefined,
    utm_content: params.get('utm_content') || undefined,
  }
}

export function storeUTMParameters(): void {
  if (typeof window === 'undefined') return

  const utmParams = getUTMParameters()
  if (Object.keys(utmParams).length > 0) {
    sessionStorage.setItem('utm_params', JSON.stringify(utmParams))
  }
}

export function getStoredUTMParameters(): ReturnType<typeof getUTMParameters> {
  if (typeof window === 'undefined') return {}

  try {
    const stored = sessionStorage.getItem('utm_params')
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export function initGoogleAdsTracking(): void {
  storeUTMParameters()
}

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string | ConversionPayload,
      config?: ConversionPayload | Record<string, unknown>
    ) => void
    dataLayer?: unknown[]
  }
}
