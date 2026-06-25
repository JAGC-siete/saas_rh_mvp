import type { CountryCode } from '../country/supported'

const DEMO_WHATSAPP = '50432226773'

export function calculatorUtmSource(countryCode: CountryCode): string {
  return `calculadora-deducciones-${countryCode.toLowerCase()}`
}

export function appendUtmParams(
  href: string,
  countryCode: CountryCode,
  campaign:
    | 'post-calc'
    | 'footer'
    | 'bridge'
    | 'sticky'
    | 'pdf-email'
    | 'sticky-constancia'
    | 'godfather-email'
    | 'godfather-pdf'
): string {
  const params = new URLSearchParams({
    utm_source: calculatorUtmSource(countryCode),
    utm_medium: 'cta',
    utm_campaign: campaign,
  })
  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}${params.toString()}`
}

export function buildDemoWhatsAppUrl(
  countryCode: CountryCode,
  trackingLabel: string
): string {
  const countryNames: Record<CountryCode, string> = {
    HND: 'Honduras',
    SLV: 'El Salvador',
    GTM: 'Guatemala',
  }
  const message = `Hola, calculé deducciones en Humano SISU (${countryNames[countryCode]}) y me gustaría una demo personalizada. Ref: ${trackingLabel}`
  return `https://wa.me/${DEMO_WHATSAPP}?text=${encodeURIComponent(message)}`
}
