/**
 * Meta Pixel (navegador) — eventos estándar en formularios públicos.
 *
 * Eventos:
 * - /activar  → StartTrial
 * - /ventas   → Lead
 * - /suscripcion (y otros MailListSubscription) → Subscribe
 *
 * Requiere META_PIXEL_ID cargado en pages/_document.tsx.
 */

type MetaStandardEvent = 'Lead' | 'Subscribe' | 'StartTrial'

interface MetaCustomData {
  content_name?: string
  content_category?: string
  value?: number
  currency?: string
  status?: string
}

function createEventId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function fireMetaPixelEvent(
  eventName: MetaStandardEvent,
  customData?: MetaCustomData,
  eventId?: string
): void {
  if (typeof window === 'undefined') return
  if (typeof window.fbq === 'undefined') {
    console.warn('Meta Pixel: fbq not available')
    return
  }

  const options = eventId ? { eventID: eventId } : undefined
  const payload = customData && Object.keys(customData).length > 0 ? customData : undefined

  if (payload && options) {
    window.fbq('track', eventName, payload, options)
  } else if (payload) {
    window.fbq('track', eventName, payload)
  } else if (options) {
    window.fbq('track', eventName, {}, options)
  } else {
    window.fbq('track', eventName)
  }
}

/** Trial gratuito en /activar */
export function trackActivationTrialSubmit(empleados: number, countryCode?: string): string {
  const eventId = createEventId('activar')
  fireMetaPixelEvent(
    'StartTrial',
    {
      content_name: 'activar',
      content_category: countryCode || 'unknown',
      value: empleados,
      currency: 'USD',
      status: 'submitted',
    },
    eventId
  )
  return eventId
}

/** Cotización comercial en /ventas */
export function trackQuotationSubmit(params: {
  employeesCount: number
  countryCode?: string
  billingModality?: string
  quoteValue?: number
  currency?: string
}): string {
  const eventId = createEventId('ventas')
  fireMetaPixelEvent(
    'Lead',
    {
      content_name: 'ventas',
      content_category: params.countryCode || 'unknown',
      value: params.quoteValue ?? params.employeesCount,
      currency: params.currency || 'USD',
      status: params.billingModality || 'annual',
    },
    eventId
  )
  return eventId
}

/** Suscripción a newsletter (p. ej. /suscripcion) */
export function trackNewsletterSubscribe(source: string): string {
  const eventId = createEventId('subscribe')
  fireMetaPixelEvent(
    'Subscribe',
    {
      content_name: source,
      content_category: 'newsletter',
    },
    eventId
  )
  return eventId
}

declare global {
  interface Window {
    fbq?: (
      command: 'track' | 'init',
      eventName: string,
      customData?: MetaCustomData,
      options?: { eventID?: string }
    ) => void
  }
}
