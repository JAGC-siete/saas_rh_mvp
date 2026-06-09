import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildLeadFollowUpWhatsAppMessage,
  normalizeWhatsAppForWaMe,
} from '../lib/leads/registro-notification'

describe('lead registro notification', () => {
  it('buildLeadFollowUpWhatsAppMessage varies by source', () => {
    const activar = buildLeadFollowUpWhatsAppMessage('activar')
    const ventas = buildLeadFollowUpWhatsAppMessage('ventas')
    const suscripcion = buildLeadFollowUpWhatsAppMessage('suscripcion')

    assert.ok(activar.includes('Tu sistema SISU ya está activo'))
    assert.ok(activar.includes('digitalizar la asistencia'))
    assert.ok(ventas.includes('cotización'))
    assert.ok(ventas.includes('automatización de nómina'))
    assert.ok(suscripcion.includes('Ya estás en la lista de SISU'))
    assert.ok(suscripcion.includes('automatizar tu nómina'))

    for (const msg of [activar, ventas, suscripcion]) {
      assert.ok(msg.includes('jorgearturo@humanosisu.net'))
      assert.ok(msg.includes('Cuéntame si pudiste'))
    }
  })

  it('normalizeWhatsAppForWaMe prefixes country calling code', () => {
    assert.equal(normalizeWhatsAppForWaMe('98765432', 'HND'), '50498765432')
    assert.equal(normalizeWhatsAppForWaMe('50398765432', 'SLV'), '50398765432')
    assert.equal(normalizeWhatsAppForWaMe('50298765432', 'GTM'), '50298765432')
  })
})
