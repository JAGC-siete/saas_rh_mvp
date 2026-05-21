import { formatDateTimeForHonduras, HONDURAS_TIMEZONE } from '../timezone'
import type { CurrencyCode } from './types'
import { formatMoney, roundMoney } from './pricing'

/** 20% de descuento sobre el total cotizado al contratar dentro de la ventana. */
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
  return '⏳ Oferta por tiempo limitado: Reclama un 20% de descuento sobre el total de esta cotización al contratar tu licencia en las próximas 72 horas.'
}
