import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildWhatsAppLink,
  buildWhatsAppMessage,
  normalizeHnPhone,
} from '../lib/admin/prospection-whatsapp'
import { normalizeResearchImport } from '../lib/admin/prospection-research'

describe('prospection whatsapp', () => {
  it('normalizeHnPhone accepts local 8-digit and +504', () => {
    assert.equal(normalizeHnPhone('2772-0340'), '50427720340')
    assert.equal(normalizeHnPhone('+504 3283-4584'), '50432834584')
    assert.equal(normalizeHnPhone('abc'), null)
  })

  it('buildWhatsAppLink encodes message', () => {
    const link = buildWhatsAppLink('27720340', 'Hola demo')
    assert.ok(link?.startsWith('https://wa.me/50427720340?text='))
    assert.ok(link?.includes(encodeURIComponent('Hola demo')))
  })

  it('buildWhatsAppMessage substitutes ciudad and optional name', () => {
    const msg = buildWhatsAppMessage({
      ciudad: 'Comayagua',
      comercio: 'Sumar',
      template: 'Hola, comercios en {{ciudad}}.',
    })
    assert.equal(msg, 'Hola Sumar, comercios en Comayagua.')
  })
})

describe('prospection research import', () => {
  it('normalizeResearchImport drops empty comercio and keeps phones/emails', () => {
    const rows = normalizeResearchImport([
      { comercio: '', email: 'a@b.com' },
      { comercio: 'El Carmen', email: 'contacto@ferreteriaelcarmen.com', telefono: '3283-4584', confianza: 'alta' },
    ])
    assert.equal(rows.length, 1)
    assert.equal(rows[0].comercio, 'El Carmen')
    assert.equal(rows[0].email, 'contacto@ferreteriaelcarmen.com')
    assert.equal(rows[0].telefono, '50432834584')
  })
})
