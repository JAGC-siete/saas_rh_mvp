/**
 * Google Ads / gtag (conversiones y engagement)
 *
 * Las conversiones importadas en Google Ads usan `send_to` con el valor completo
 * que muestra la interfaz (p. ej. AW-123456789/xxxx). Configurá cada acción con
 * `NEXT_PUBLIC_GADS_SEND_TO_*` en el entorno; si falta, solo se envían eventos
 * de engagement (no se inflan conversiones).
 *
 * Variables: ver `.env.example` sección Google Ads.
 */

import { trackGA4Event } from './ga4'

const SEND_TO_ACTIVATION = process.env.NEXT_PUBLIC_GADS_SEND_TO_ACTIVATION?.trim()
/** PDF calculadoras, /info y otros leads TOFU/MOFU. */
const SEND_TO_LEAD = process.env.NEXT_PUBLIC_GADS_SEND_TO_LEAD
/** Opcional: conversión secundaria en clic de CTA (por defecto desactivada). */
const SEND_TO_CTA = process.env.NEXT_PUBLIC_GADS_SEND_TO_CTA
const SEND_TO_WHATSAPP = process.env.NEXT_PUBLIC_GADS_SEND_TO_WHATSAPP
const SEND_TO_COMPARISON = process.env.NEXT_PUBLIC_GADS_SEND_TO_COMPARISON
/** Click Contact en /ventas; también fallback page-load en /activar/gracias si no hay ACTIVATION. */
const SEND_TO_CONTACT =
  process.env.NEXT_PUBLIC_GADS_SEND_TO_CONTACT?.trim() ||
  'AW-17840996991/-3XtCO6xydccEP-EoLtC'

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

/** Lead genérico (calculadoras PDF, /info, etc.) si NEXT_PUBLIC_GADS_SEND_TO_LEAD está definido. */
export function fireGoogleAdsLeadConversion(transactionId?: string): void {
  fireGoogleAdsConversion(SEND_TO_LEAD, {
    transaction_id: transactionId,
  })
}

/**
 * Engagement post-submit del trial (GA4 / gtag). La conversión Ads de page-load
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

/**
 * Page-load en /activar/gracias tras trial OK (checklist Google Ads “thank you page”).
 * Usa SEND_TO_ACTIVATION si está definido; si no, Contact (label ya configurado).
 */
export function trackTrialThankYouPageView(transactionId?: string): void {
  if (typeof window !== 'undefined') {
    if (sessionStorage.getItem(TRIAL_THANK_YOU_DEDUPE_KEY)) return
    sessionStorage.setItem(TRIAL_THANK_YOU_DEDUPE_KEY, '1')
  }

  const sendTo = SEND_TO_ACTIVATION || SEND_TO_CONTACT
  fireGoogleAdsConversion(sendTo, {
    transaction_id: transactionId || `trial_ty_${Date.now()}`,
  })

  trackGA4Event('trial_thank_you', {
    event_category: 'Activation',
    event_label: 'Trial Thank You',
  })
}

/**
 * CTA: evento de engagement; conversión Ads solo si NEXT_PUBLIC_GADS_SEND_TO_CTA está definido.
 */
export function trackCTAClick(ctaType: string, location: string): void {
  fireGoogleAdsConversion(SEND_TO_CTA)

  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
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
 * Click en enlace WhatsApp; conversión opcional vía NEXT_PUBLIC_GADS_SEND_TO_WHATSAPP.
 */
export function trackWhatsAppClick(context: string): void {
  fireGoogleAdsConversion(SEND_TO_WHATSAPP)

  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
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
 * Vista de página de comparación; deduplica en la misma pestaña para no duplicar conversión al recargar.
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

  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
    window.gtag('event', 'page_view', {
      event_category: 'Comparison',
      event_label: page,
    })
  }
}

/**
 * Click Contact — equivalente a gtag_report_conversion de Google Ads.
 * Con `url`: llamá preventDefault y dejá que event_callback navegue.
 * Sin `url` (p. ej. target=_blank): solo dispara la conversión.
 * @returns false (mismo contrato que el snippet oficial)
 */
export function reportGoogleAdsContactConversion(url?: string): boolean {
  if (typeof window === 'undefined') return false

  const navigate = () => {
    if (typeof url !== 'undefined') {
      window.location.href = url
    }
  }

  const trimmed = SEND_TO_CONTACT.trim()
  if (!trimmed) {
    navigate()
    return false
  }

  if (typeof window.gtag !== 'function') {
    pendingConversions.push({ send_to: trimmed })
    navigate()
    return false
  }

  window.gtag('event', 'conversion', {
    send_to: trimmed,
    event_callback: navigate,
  })
  return false
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
