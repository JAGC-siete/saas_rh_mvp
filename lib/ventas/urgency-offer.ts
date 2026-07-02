import { formatDateTimeForHonduras, HONDURAS_TIMEZONE } from '../timezone'
import type { CurrencyCode } from './types'
import { formatMoney, roundMoney } from './pricing'

/** 20% de descuento sobre el software al contratar dentro de la ventana (hardware sin descuento). */
export const URGENCY_OFFER_DISCOUNT_PCT = 0.2

/** Ventana de validez de la oferta desde el envío de la cotización. */
export const URGENCY_OFFER_DURATION_MS = 72 * 60 * 60 * 1000

export interface UrgencyOffer {
  isActive: boolean
  /** Total cotizado antes del descuento por pronta contratación. */
  quotedTotal: number
  discountAmount: number
  discountedTotal: number
  expiresAt: Date
  sentAt: Date
}

export function computeUrgencyOffer(params: {
  quotedTotal: number
  sentAt?: Date
  now?: Date
}): UrgencyOffer {
  const sentAt = params.sentAt ?? new Date()
  const now = params.now ?? new Date()
  const expiresAt = new Date(sentAt.getTime() + URGENCY_OFFER_DURATION_MS)
  const quotedTotal = roundMoney(params.quotedTotal)
  const discountAmount = roundMoney(quotedTotal * URGENCY_OFFER_DISCOUNT_PCT)
  const discountedTotal = roundMoney(quotedTotal - discountAmount)

  return {
    isActive: now.getTime() < expiresAt.getTime(),
    quotedTotal,
    discountAmount,
    discountedTotal,
    expiresAt,
    sentAt,
  }
}

export interface QuotationUrgencyBreakdown extends UrgencyOffer {
  softwareListTotal: number
  hardwareTotal: number
  softwareDiscountAmount: number
  softwareOfferTotal: number
}

/** Oferta 72 h desactivada — conservamos el tipo por compatibilidad interna. */
export function computeQuotationUrgencyOffer(params: {
  billingModality: 'annual' | 'monthly'
  monthlySoftwareTotal: number
  monthlyHardwareFee: number
  annualTotal: number
  sentAt?: Date
  now?: Date
}): QuotationUrgencyBreakdown {
  const sentAt = params.sentAt ?? new Date()
  const expiresAt = new Date(sentAt.getTime() + URGENCY_OFFER_DURATION_MS)
  const isMonthly = params.billingModality === 'monthly'
  const softwareListTotal = roundMoney(
    isMonthly ? params.monthlySoftwareTotal : params.annualTotal
  )
  const hardwareTotal = roundMoney(isMonthly ? params.monthlyHardwareFee : 0)
  const quotedTotal = roundMoney(softwareListTotal + hardwareTotal)

  return {
    isActive: false,
    quotedTotal,
    discountAmount: 0,
    discountedTotal: quotedTotal,
    expiresAt,
    sentAt,
    softwareListTotal,
    hardwareTotal,
    softwareDiscountAmount: 0,
    softwareOfferTotal: softwareListTotal,
  }
}

export function formatUrgencyOfferExpiry(expiresAt: Date): string {
  return formatDateTimeForHonduras(expiresAt)
}

/** Ej. "23 de mayo a las 06:17 p. m." */
export function formatUrgencyOfferExpiryFriendly(expiresAt: Date): string {
  const day = new Intl.DateTimeFormat('es-HN', { timeZone: HONDURAS_TIMEZONE, day: 'numeric' }).format(expiresAt)
  const month = new Intl.DateTimeFormat('es-HN', { timeZone: HONDURAS_TIMEZONE, month: 'long' }).format(expiresAt)
  const time = new Intl.DateTimeFormat('es-HN', {
    timeZone: HONDURAS_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(expiresAt)
  return `${day} de ${month} a las ${time}`
}

export function formatUrgencyOfferSavings(currency: CurrencyCode, amount: number): string {
  return formatMoney(currency, roundMoney(amount))
}

export function urgencyOfferCtaText(): string {
  return '⏳ Oferta por tiempo limitado: 20% de descuento sobre el plan de software al contratar en las próximas 72 horas.'
}
