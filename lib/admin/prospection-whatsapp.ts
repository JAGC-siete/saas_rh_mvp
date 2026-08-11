/**
 * Phone / WhatsApp helpers for B2B prospection (HN-focused).
 */

import { renderOutreachBody } from './prospection'

/** Digits only. Accepts HN local 8-digit or +504XXXXXXXX. */
export function normalizeHnPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null

  if (digits.length === 8) return `504${digits}`
  if (digits.length === 11 && digits.startsWith('504')) return digits
  if (digits.length === 12 && digits.startsWith('0504')) return digits.slice(1)
  // Allow other country codes only if 10–15 digits (international)
  if (digits.length >= 10 && digits.length <= 15) return digits
  return null
}

export function formatPhoneDisplay(e164Digits: string | null): string {
  if (!e164Digits) return ''
  if (e164Digits.startsWith('504') && e164Digits.length === 11) {
    return `+504 ${e164Digits.slice(3, 7)}-${e164Digits.slice(7)}`
  }
  return `+${e164Digits}`
}

export const DEFAULT_WHATSAPP_TEMPLATE = `Hola, espero que estén teniendo una buena semana.

Encontré su ferretería buscando comercios en {{ciudad}} y quería presentarme.

Tenemos un sistema simple de RRHH para ferreterías: asistencia, vacaciones y nómina sin tanto lío manual.

¿Les interesa una demo rápida de 10 minutos, sin compromiso?`

export function buildWhatsAppMessage(params: {
  ciudad: string
  comercio?: string | null
  template?: string
}): string {
  const base = renderOutreachBody(params.template || DEFAULT_WHATSAPP_TEMPLATE, params.ciudad)
  const name = params.comercio?.trim()
  if (!name) return base
  return base.replace(/^Hola,/, `Hola ${name},`)
}

export function buildWhatsAppLink(phoneRaw: string, message: string): string | null {
  const digits = normalizeHnPhone(phoneRaw)
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
