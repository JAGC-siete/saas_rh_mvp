import { formatDateTimeForHonduras } from '../timezone'
import { roundMoney } from './pricing'

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

export function urgencyOfferCtaText(): string {
  return '⏳ Oferta por tiempo limitado: Reclama un 20% de descuento sobre el total de esta cotización al contratar tu licencia en las próximas 72 horas.'
}
