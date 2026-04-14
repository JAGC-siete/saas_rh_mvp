/**
 * Google Ads Conversion Tracking
 * Integración con Google Ads para rastrear conversiones desde el landing page
 */

// Google Ads Conversion ID - Reemplazar con tu ID real cuando configures la campaña
// Formato: AW-XXXXXXXXX
const GOOGLE_ADS_CONVERSION_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID || 'AW-17840996991'

// Conversion Labels - Configurar en Google Ads
export const CONVERSION_LABELS = {
  ACTIVATION_FORM: 'activation_form_submit', // Formulario de activación
  CTA_CLICK: 'cta_click', // Click en CTA principal
  WHATSAPP_CLICK: 'whatsapp_click', // Click en WhatsApp
  COMPARISON_VIEW: 'comparison_view', // Vista de página de comparación
  DEMO_REQUEST: 'demo_request', // Solicitud de demo
} as const

export type ConversionLabel = typeof CONVERSION_LABELS[keyof typeof CONVERSION_LABELS]

interface ConversionEvent {
  send_to: string
  value?: number
  currency?: string
  transaction_id?: string
}

/**
 * Track Google Ads conversion
 * @param label - Conversion label from Google Ads
 * @param value - Optional conversion value
 * @param currency - Currency code (default: USD)
 * @param transactionId - Optional transaction ID for deduplication
 */
export function trackGoogleAdsConversion(
  label: ConversionLabel,
  value?: number,
  currency: string = 'USD',
  transactionId?: string
): void {
  if (typeof window === 'undefined') return

  // Check if gtag is available
  if (typeof window.gtag === 'undefined') {
    console.warn('Google Ads: gtag not available')
    return
  }

  const conversionEvent: ConversionEvent = {
    send_to: `${GOOGLE_ADS_CONVERSION_ID}/${label}`,
  }

  if (value !== undefined) {
    conversionEvent.value = value
    conversionEvent.currency = currency
  }

  if (transactionId) {
    conversionEvent.transaction_id = transactionId
  }

  // Send conversion event
  window.gtag('event', 'conversion', conversionEvent)

  console.log('Google Ads conversion tracked:', {
    label,
    value,
    currency,
    transactionId,
  })
}

/**
 * Track activation form submission
 * This is the primary conversion event for lead generation
 */
export function trackActivationFormSubmit(
  email: string,
  empresa: string,
  empleados: number,
  transactionId?: string
): void {
  // Track as conversion
  trackGoogleAdsConversion(
    CONVERSION_LABELS.ACTIVATION_FORM,
    undefined, // Lead value - adjust based on your LTV
    'USD',
    transactionId || `activation_${Date.now()}_${email}`
  )

  // Also track in Google Analytics
  if (typeof window.gtag !== 'undefined') {
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
}

/**
 * Track CTA click
 */
export function trackCTAClick(ctaType: string, location: string): void {
  trackGoogleAdsConversion(CONVERSION_LABELS.CTA_CLICK)

  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'cta_click', {
      event_category: 'Engagement',
      event_label: ctaType,
      location,
    })
  }
}

/**
 * Track WhatsApp click
 */
export function trackWhatsAppClick(context: string): void {
  trackGoogleAdsConversion(CONVERSION_LABELS.WHATSAPP_CLICK)

  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'whatsapp_click', {
      event_category: 'Contact',
      event_label: context,
    })
  }
}

/**
 * Track comparison page view
 */
export function trackComparisonView(page: string): void {
  trackGoogleAdsConversion(CONVERSION_LABELS.COMPARISON_VIEW)

  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'page_view', {
      event_category: 'Comparison',
      event_label: page,
    })
  }
}

/**
 * Get UTM parameters from URL
 * Useful for tracking which ad/campaign brought the user
 */
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

/**
 * Store UTM parameters in sessionStorage for later use
 */
export function storeUTMParameters(): void {
  if (typeof window === 'undefined') return

  const utmParams = getUTMParameters()
  if (Object.keys(utmParams).length > 0) {
    sessionStorage.setItem('utm_params', JSON.stringify(utmParams))
  }
}

/**
 * Get stored UTM parameters
 */
export function getStoredUTMParameters(): ReturnType<typeof getUTMParameters> {
  if (typeof window === 'undefined') return {}

  try {
    const stored = sessionStorage.getItem('utm_params')
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Initialize Google Ads tracking
 * Call this on page load to store UTM parameters
 */
export function initGoogleAdsTracking(): void {
  storeUTMParameters()
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string | ConversionEvent,
      config?: ConversionEvent | Record<string, any>
    ) => void
    dataLayer?: any[]
  }
}





