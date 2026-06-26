import type { CountryCode } from '../country/supported'
import type { BenefitTipo } from './benefit-config'

const DEMO_WHATSAPP = '50432226773'

export function calculatorUtmSource(countryCode: CountryCode): string {
  return `calculadora-deducciones-${countryCode.toLowerCase()}`
}

export function benefitCalculatorUtmSource(tipo: BenefitTipo): string {
  return tipo === '13AVO' ? 'calculadora-aguinaldo-hnd' : 'calculadora-catorceavo-hnd'
}

export function prestacionesCalculatorUtmSource(): string {
  return 'calculadora-prestaciones'
}

export function appendPrestacionesUtmParams(
  href: string,
  campaign: 'post-calc' | 'footer' | 'sticky' | 'pdf-email'
): string {
  const params = new URLSearchParams({
    utm_source: prestacionesCalculatorUtmSource(),
    utm_medium: 'cta',
    utm_campaign: campaign,
  })
  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}${params.toString()}`
}

export function buildPrestacionesDemoWhatsAppUrl(trackingLabel: string): string {
  const message = `Hola, calculé mi liquidación de prestaciones en Humano SISU (Honduras) y me gustaría una demo. Ref: ${trackingLabel}`
  return `https://wa.me/${DEMO_WHATSAPP}?text=${encodeURIComponent(message)}`
}

export function appendBenefitUtmParams(
  href: string,
  tipo: BenefitTipo,
  campaign: 'post-calc' | 'footer' | 'sticky' | 'pdf-email'
): string {
  const params = new URLSearchParams({
    utm_source: benefitCalculatorUtmSource(tipo),
    utm_medium: 'cta',
    utm_campaign: campaign,
  })
  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}${params.toString()}`
}

export function buildBenefitDemoWhatsAppUrl(tipo: BenefitTipo, trackingLabel: string): string {
  const label = tipo === '13AVO' ? 'aguinaldo' : 'catorceavo'
  const message = `Hola, calculé mi ${label} en Humano SISU (Honduras) y me gustaría una demo. Ref: ${trackingLabel}`
  return `https://wa.me/${DEMO_WHATSAPP}?text=${encodeURIComponent(message)}`
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
