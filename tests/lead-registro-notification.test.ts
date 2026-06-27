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

    assert.ok(info.includes('¡Secreto enviado! 🪄'))
    assert.ok(info.includes('¿qué tiene esto que ver conmigo?'))
    assert.ok(info.includes('Abrí la app de tu correo'))
    assert.ok(info.includes('constancia de trabajo'))

    assert.ok(activar.includes('¡Tu entorno ya está listo! 🚀'))
    assert.ok(activar.includes('credenciales de acceso'))
    assert.ok(activar.includes('¿Por qué los otros sistemas hacen que esto parezca tan complicado?'))
    assert.ok(activar.includes('reclámamelo por aquí ya mismo'))

    assert.ok(ventas.includes('¡Números enviados! 🤝'))
    assert.ok(ventas.includes('sin letras pequeñas'))
    assert.ok(ventas.includes('también te incluí las llaves del sistema'))
    assert.ok(ventas.includes('números y tus accesos'))

    assert.ok(suscripcion.includes('Revisaste tus deducciones'))
    assert.ok(suscripcion.includes('menos de 1 minuto'))

    for (const msg of [activar, ventas, info, suscripcion]) {
      assert.ok(msg.includes('jorgearturo@humanosisu.net'))
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
