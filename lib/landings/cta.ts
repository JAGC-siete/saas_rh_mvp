/**
 * Resuelve el destino de un CTA a partir de los datos del negocio.
 * El JSON guarda la intención ('whatsapp', 'call', 'maps'...) y no una URL duplicada,
 * así cambiar el número del negocio actualiza todos los botones de la página.
 */

import type { LandingCta, LandingPageBusiness } from '../../types/landing'

export interface ResolvedCta {
  label: string
  href: string
  /** true cuando apunta fuera del sitio y conviene rel="noopener". */
  external: boolean
}

function digitsOnly(value: string | undefined): string {
  return (value || '').replace(/\D/g, '')
}

/** wa.me exige el número con código de país y sin signos. Honduras: 504. */
export function whatsappHref(business: LandingPageBusiness, message?: string): string | null {
  const raw = digitsOnly(business.whatsapp || business.phone)
  if (raw.length < 8) return null
  const withCountry = raw.length === 8 ? `504${raw}` : raw
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${withCountry}${text}`
}

export function callHref(business: LandingPageBusiness): string | null {
  const raw = digitsOnly(business.phone || business.whatsapp)
  return raw.length >= 8 ? `tel:+${raw.length === 8 ? `504${raw}` : raw}` : null
}

export function mapsHref(business: LandingPageBusiness): string | null {
  const query = business.mapsQuery || business.address || business.name
  if (!query) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/**
 * Devuelve null cuando el CTA no se puede cumplir (por ejemplo WhatsApp sin número).
 * El renderer omite el botón en vez de pintar un enlace muerto.
 */
export function resolveCta(
  cta: LandingCta,
  business: LandingPageBusiness,
  leadFormAnchor: string | null
): ResolvedCta | null {
  switch (cta.action) {
    case 'whatsapp': {
      const href = whatsappHref(
        business,
        cta.message || `Hola ${business.name}, vi su página y quiero información.`
      )
      return href ? { label: cta.label, href, external: true } : null
    }
    case 'call': {
      const href = callHref(business)
      return href ? { label: cta.label, href, external: false } : null
    }
    case 'maps': {
      const href = mapsHref(business)
      return href ? { label: cta.label, href, external: true } : null
    }
    case 'lead-form':
      return leadFormAnchor ? { label: cta.label, href: `#${leadFormAnchor}`, external: false } : null
    case 'link':
      return cta.href ? { label: cta.label, href: cta.href, external: cta.href.startsWith('https://') } : null
    default:
      return null
  }
}
