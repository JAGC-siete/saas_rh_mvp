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
    const suscripcion = buildLeadFollowUpWhatsAppMessage('suscripcion')
    const info = buildLeadFollowUpWhatsAppMessage('info')

    assert.ok(activar.includes('Tu sistema SISU ya está activo'))
    assert.ok(activar.includes('digitalizar la asistencia'))
    assert.ok(ventas.includes('cotización'))
    assert.ok(ventas.includes('automatización de nómina'))
    assert.ok(suscripcion.includes('Ya estás en la lista de SISU'))
    assert.ok(suscripcion.includes('automatizar tu nómina'))
    assert.ok(info.includes('solicitud de más información'))
    assert.ok(info.includes('equipo de RH'))

    for (const msg of [activar, ventas, suscripcion, info]) {
      assert.ok(msg.includes('jorgearturo@humanosisu.net'))
      assert.ok(msg.includes('Cuéntame si pudiste'))
    }
  })

  it('normalizeWhatsAppForWaMe prefixes country calling code', () => {
    assert.equal(normalizeWhatsAppForWaMe('98765432', 'HND'), '50498765432')
    assert.equal(normalizeWhatsAppForWaMe('50398765432', 'SLV'), '50398765432')
    assert.equal(normalizeWhatsAppForWaMe('50298765432', 'GTM'), '50298765432')
  })

  it('buildLeadRegistroNotificationHtml uses institutional ventas styling', () => {
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
    assert.ok(html.includes('#0b4fa1'))
    assert.ok(html.includes('Victor Obed Torres Paz'))
    assert.ok(html.includes('9269-5154'))
    assert.ok(html.includes('Contactar vía WhatsApp'))
    assert.ok(html.includes('Archivo vCard adjunto'))
    assert.ok(!html.includes('#667eea'))
  })
})
