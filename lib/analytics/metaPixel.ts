/**
 * Meta Pixel (navegador) — eventos estándar en formularios públicos.
 *
 * Eventos:
 * - /activar  → StartTrial
 * - /ventas   → SubmitApplication
 * - /suscripcion → CompleteRegistration
 * - /info       → Lead
 *
 * Píxel base en pages/_document.tsx.
 */

export const META_PIXEL_ID = '833142547420951'

type MetaStandardEvent = 'SubmitApplication' | 'CompleteRegistration' | 'StartTrial' | 'Lead'

interface MetaAdvancedMatching {
  em?: string
  ph?: string
  fn?: string
  ln?: string
}

interface MetaCustomData {
  content_name?: string
  content_category?: string
  value?: number
  currency?: string
  status?: boolean | string
}

export function createMetaEventId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function readMetaCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  if (!match?.[1]) return undefined
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

/** Cookies _fbc / _fbp para deduplicación CAPI + match. */
export function getMetaBrowserCookies(): { fbc?: string; fbp?: string } {
  return {
    fbc: readMetaCookie('_fbc'),
    fbp: readMetaCookie('_fbp'),
  }
}

/** Campos para enviar al API y correlacionar Pixel + CAPI. */
export function buildMetaApiTrackingFields(eventId: string): {
  meta_event_id: string
  meta_event_source_url: string
  meta_fbc?: string
  meta_fbp?: string
} {
  const cookies = getMetaBrowserCookies()
  return {
    meta_event_id: eventId,
    meta_event_source_url: typeof window !== 'undefined' ? window.location.href : '',
    ...(cookies.fbc ? { meta_fbc: cookies.fbc } : {}),
    ...(cookies.fbp ? { meta_fbp: cookies.fbp } : {}),
  }
}

function normalizePhoneForMeta(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 7 ? digits : undefined
}

function applyMetaAdvancedMatching(data: MetaAdvancedMatching): void {
  if (typeof window === 'undefined' || typeof window.fbq === 'undefined') return

  const payload: MetaAdvancedMatching = {}
  if (data.em?.trim()) payload.em = data.em.trim().toLowerCase()
  if (data.ph) {
    const normalized = normalizePhoneForMeta(data.ph)
    if (normalized) payload.ph = normalized
  }
  if (data.fn?.trim()) payload.fn = data.fn.trim().toLowerCase()
  if (data.ln?.trim()) payload.ln = data.ln.trim().toLowerCase()

  if (Object.keys(payload).length === 0) return
  window.fbq('init', META_PIXEL_ID, payload)
}

function fireMetaPixelEvent(
  eventName: MetaStandardEvent,
  customData?: MetaCustomData,
  eventId?: string,
  advancedMatching?: MetaAdvancedMatching
): void {
  if (typeof window === 'undefined') return
  if (typeof window.fbq === 'undefined') {
    console.warn('Meta Pixel: fbq not available')
    return
  }

  if (advancedMatching) {
    applyMetaAdvancedMatching(advancedMatching)
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
export function trackActivationTrialSubmit(params: {
  eventId: string
  email?: string
  phone?: string
  firstName?: string
  countryCode?: string
}): void {
  fireMetaPixelEvent(
    'StartTrial',
    {
      content_name: 'activar',
      content_category: params.countryCode || 'unknown',
      value: 0,
      currency: 'USD',
      status: true,
    },
    params.eventId,
    {
      em: params.email,
      ph: params.phone,
      fn: params.firstName,
    }
  )
}

/** Solicitud de cotización / acceso al servicio en /ventas */
export function trackQuotationSubmit(params: {
  eventId: string
  email?: string
  phone?: string
  firstName?: string
  employeesCount: number
  countryCode?: string
  billingModality?: string
  quoteValue?: number
  currency?: string
}): void {
  fireMetaPixelEvent(
    'SubmitApplication',
    {
      content_name: 'ventas',
      content_category: params.countryCode || 'unknown',
      value: params.quoteValue ?? params.employeesCount,
      currency: params.currency || 'USD',
      status: params.billingModality || 'annual',
    },
    params.eventId,
    {
      em: params.email,
      ph: params.phone,
      fn: params.firstName,
    }
  )
}

/** Suscripción newsletter en /suscripcion */
export function trackNewsletterCompleteRegistration(params: {
  eventId: string
  email: string
  source: string
}): void {
  fireMetaPixelEvent(
    'CompleteRegistration',
    {
      content_name: params.source,
      content_category: 'newsletter',
      value: 0,
      currency: 'USD',
      status: true,
    },
    params.eventId,
    { em: params.email }
  )
}

/** Solicitud de información en /info (TOFU) */
export function trackInfoLeadSubmit(params: {
  eventId: string
  email: string
  phone?: string
  firstName?: string
}): void {
  fireMetaPixelEvent(
    'Lead',
    {
      content_name: 'info',
      content_category: 'tofu',
      value: 0,
      currency: 'USD',
      status: true,
    },
    params.eventId,
    {
      em: params.email,
      ph: params.phone,
      fn: params.firstName,
    }
  )
}

declare global {
  interface Window {
    fbq?: (
      command: 'track' | 'init',
      eventName: string,
      customData?: MetaCustomData | MetaAdvancedMatching,
      options?: { eventID?: string }
    ) => void
  }
}
