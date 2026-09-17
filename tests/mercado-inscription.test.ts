import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  looksLikeInscriptionBot,
  mercadoInscriptionFieldErrors,
  parseMercadoInscription,
} from '../lib/mercado/inscription-schema'
import {
  buildMercadoInscriptionNotification,
  MERCADO_INSCRIPTION_NOTIFY_DEFAULT,
  mercadoInscriptionNotifyEmail,
} from '../lib/mercado/inscription-email'
import {
  MERCADO_INSCRIPTION_API_PATH,
  MERCADO_INSCRIPTION_PATH,
  mercadoInscriptionPath,
} from '../lib/mercado/paths'
import { getAllPublicRoutes } from '../middleware.config'
import { isReservedVendorSlug } from '../lib/mercado/slug'
import { parseCreateVendor } from '../lib/mercado/schema'

const valid = {
  stallNumber: 'Pasillo 1, local 8',
  merchantName: 'Carmen López',
  businessName: 'Comedor El Patio',
}

describe('mercado: solicitud de inscripción', () => {
  it('acepta los tres campos obligatorios', () => {
    const parsed = parseMercadoInscription(valid)
    assert.equal(parsed.success, true)
  })

  it('rechaza número de local vacío', () => {
    const parsed = parseMercadoInscription({ ...valid, stallNumber: '  ' })
    assert.equal(parsed.success, false)
    if (!parsed.success) {
      assert.match(mercadoInscriptionFieldErrors(parsed.error).stallNumber ?? '', /número de local/)
    }
  })

  it('rechaza nombre de comercio corto', () => {
    const parsed = parseMercadoInscription({ ...valid, businessName: 'A' })
    assert.equal(parsed.success, false)
  })

  it('un honeypot lleno parece bot y uno vacío no', () => {
    const clean = parseMercadoInscription(valid)
    assert.equal(clean.success, true)
    if (clean.success) assert.equal(looksLikeInscriptionBot(clean.data), false)

    const bot = parseMercadoInscription({ ...valid, website: 'http://spam.example' })
    assert.equal(bot.success, true)
    if (bot.success) assert.equal(looksLikeInscriptionBot(bot.data), true)
  })

  it('el correo de aviso pide revisión manual y no habla de cuenta', () => {
    const parsed = parseMercadoInscription(valid)
    assert.equal(parsed.success, true)
    if (!parsed.success) return

    const mail = buildMercadoInscriptionNotification({
      inscription: parsed.data,
      receivedAt: new Date('2026-09-17T20:00:00.000Z'),
    })

    assert.match(mail.subject, /Solicitud de inscripción/)
    assert.match(mail.subject, /Comedor El Patio/)
    assert.match(mail.subject, /Pasillo 1, local 8/)
    assert.ok(mail.html.includes('Carmen López'))
    assert.ok(mail.html.includes('pendiente de revisión'))
    assert.ok(mail.html.includes('/app/admin/vendors'))
    assert.equal(/crear perfil|contraseña|cobro/i.test(mail.html), false)
  })

  it('reserva inscripcion para el formulario y deja el API en rutas públicas', () => {
    assert.equal(mercadoInscriptionPath(), MERCADO_INSCRIPTION_PATH)
    assert.equal(isReservedVendorSlug('inscripcion'), true)
    assert.equal(isReservedVendorSlug('solicitud'), true)
    assert.equal(
      parseCreateVendor({
        name: 'Puesto',
        category: 'otros',
        description: 'Descripción de al menos diez caracteres.',
        whatsapp: '9999-0000',
        slug: 'inscripcion',
      }).success,
      false
    )
    assert.ok(getAllPublicRoutes().includes(MERCADO_INSCRIPTION_API_PATH))
  })

  it('avisa al buzón de operación por default', () => {
    assert.equal(MERCADO_INSCRIPTION_NOTIFY_DEFAULT, 'jorge7gomez@gmail.com')
    const previous = process.env.MERCADO_INSCRIPTION_NOTIFY_EMAIL
    const previousRegistro = process.env.REGISTRO_NOTIFICATION_EMAIL
    try {
      delete process.env.MERCADO_INSCRIPTION_NOTIFY_EMAIL
      delete process.env.REGISTRO_NOTIFICATION_EMAIL
      assert.equal(mercadoInscriptionNotifyEmail(), 'jorge7gomez@gmail.com')
    } finally {
      if (previous === undefined) delete process.env.MERCADO_INSCRIPTION_NOTIFY_EMAIL
      else process.env.MERCADO_INSCRIPTION_NOTIFY_EMAIL = previous
      if (previousRegistro === undefined) delete process.env.REGISTRO_NOTIFICATION_EMAIL
      else process.env.REGISTRO_NOTIFICATION_EMAIL = previousRegistro
    }
  })
})
