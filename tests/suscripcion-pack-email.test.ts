import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSuscripcionPackEmailText,
  buildSuscripcionPackSubject,
  SUSCRIPCION_PACK_LEDGER_LABEL,
} from '../lib/marketing/suscripcion-pack-email'
import { buildSuscripcionPackEmailHtml } from '../lib/marketing/suscripcion-pack-email-html'

describe('suscripcion pack email', () => {
  it('uses employee-focused subject and body', () => {
    const subject = buildSuscripcionPackSubject('Ana', 'ana@x.com')
    assert.ok(subject.includes('recibo'))

    const text = buildSuscripcionPackEmailText({
      nombre: 'Ana',
      email: 'ana@x.com',
      unsubscribeToken: 'tok',
    })

    assert.ok(text.includes('lo que siempre me han pagado'))
    assert.ok(text.includes('aguinaldo'))
    assert.ok(!text.includes('planilla a mano'))
    assert.ok(!text.includes('/activar'))
  })

  it('html includes recibo confirmado badge', () => {
    const html = buildSuscripcionPackEmailHtml({
      nombre: 'Ana',
      email: 'ana@x.com',
      unsubscribeToken: 'tok',
    })
    assert.ok(html.includes('Recibo confirmado'))
    assert.ok(html.includes('Acabás de hacer algo'))
  })

  it('uses distinct ledger label', () => {
    assert.equal(SUSCRIPCION_PACK_LEDGER_LABEL, 'Suscripcion Pack')
  })
})
