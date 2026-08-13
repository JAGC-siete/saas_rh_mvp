/**
 * Google Analytics 4 — eventos de conversión y engagement.
 * Override opcional con NEXT_PUBLIC_GA4_MEASUREMENT_ID en el entorno.
 */

export const GA4_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() || 'G-4N343EZLY9'

export type GA4ConversionEvent =
  | 'activation_submit'
  | 'quotation_submit'
  | 'whatsapp_click'
  | 'cta_click'
  | 'info_lead_submit'
  | 'calc_audience_select'
  | 'calc_digital_health_view'
  | 'calc_trojan_share'
  | 'calc_sticky_constancia_click'
  | 'calc_complete'
  | 'calc_lead_submit'
  | 'godfather_reply_sent'

interface GA4EventParams {
  event_category?: string
  event_label?: string
  location?: string
  value?: number
  [key: string]: string | number | boolean | undefined
}

export function trackGA4Event(eventName: GA4ConversionEvent | string, params?: GA4EventParams): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  if (!GA4_MEASUREMENT_ID) return

  window.gtag('event', eventName, params)
}

export function trackGA4PageView(path: string): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  if (!GA4_MEASUREMENT_ID) return

  window.gtag('config', GA4_MEASUREMENT_ID, {
    page_path: path,
  })
}
