import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildLeadFollowUpWhatsAppMessage,
  normalizeWhatsAppForWaMe,
} from '../lib/leads/registro-notification'
import { buildLeadRegistroNotificationHtml } from '../lib/leads/registro-notification-html'

describe('lead registro notification', () => {
  it('buildLeadFollowUpWhatsAppMessage varies by source', () => {
    const activar = buildLeadFollowUpWhatsAppMessage('activar')
    const ventas = buildLeadFollowUpWhatsAppMessage('ventas')
    const info = buildLeadFollowUpWhatsAppMessage('info')
    const suscripcion = buildLeadFollowUpWhatsAppMessage('suscripcion')

    assert.ok(activar.includes('¡Ya te lo mandé! 🪄'))
    assert.ok(activar.includes('¿En serio ya tengo acceso?'))
    assert.ok(activar.includes('trial de SISU'))
    assert.ok(activar.includes('digitalizar la asistencia'))

    assert.ok(ventas.includes('¡Ya te lo mandé! 🪄'))
    assert.ok(ventas.includes('¿En serio la cotización era así de clara?'))
    assert.ok(ventas.includes('propuesta con precios'))

    assert.ok(info.includes('¡Ya te lo mandé! 🪄'))
    assert.ok(info.includes('¿En serio era así de fácil?'))
    assert.ok(info.includes('Es casi absurdo que nadie te lo haya hecho antes'))

    assert.ok(suscripcion.includes('¡Gracias por unirte!'))
    assert.ok(suscripcion.includes('automatizar tu nómina'))

    for (const msg of [activar, ventas, info]) {
      assert.ok(msg.includes('jorgearturo@humanosisu.net'))
      assert.ok(msg.includes('confirmame tu correo'))
    }
  })

  it('normalizeWhatsAppForWaMe prefixes country calling code', () => {
    assert.equal(normalizeWhatsAppForWaMe('98765432', 'HND'), '50498765432')
    assert.equal(normalizeWhatsAppForWaMe('50398765432', 'SLV'), '50398765432')
    assert.equal(normalizeWhatsAppForWaMe('50298765432', 'GTM'), '50298765432')
  })

  it('buildLeadRegistroNotificationHtml uses liquid brand styling', () => {
    const html = buildLeadRegistroNotificationHtml(
      {
        source: 'info',
        nombre: 'Victor Obed Torres Paz',
        empresa: null,
        email: 'torrespazvictorobed017@gmail.com',
        whatsapp: '9269-5154',
      },
      'https://wa.me/50492695154'
    )

    assert.ok(html.includes('linear-gradient'))
    assert.ok(html.includes('#1e3a8a'))
    assert.ok(html.includes('Victor Obed Torres Paz'))
    assert.ok(html.includes('9269-5154'))
    assert.ok(html.includes('Contactar vía WhatsApp'))
    assert.ok(html.includes('Archivo vCard adjunto'))
    assert.ok(!html.includes('#667eea'))
  })
})
