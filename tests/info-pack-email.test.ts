import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildInfoPackEmailText,
  buildInfoPackSubject,
  INFO_PACK_SUBJECT,
  INFO_SEQUENCE_WELCOME_DELAY_HOURS,
} from '../lib/marketing/info-pack-email'
import { buildInfoPackEmailHtml } from '../lib/marketing/info-pack-email-html'

describe('info pack email (/info TOFU)', () => {
  it('uses field-notes subject', () => {
    assert.equal(buildInfoPackSubject('Victor Obed Torres Paz', 'jorge7gomez@gmail.com'), INFO_PACK_SUBJECT)
    assert.ok(INFO_PACK_SUBJECT.includes('pantalla'))
  })

  it('reinforces action without anti-sell disclaimers', () => {
    const text = buildInfoPackEmailText({
      nombre: 'Victor Obed Torres Paz',
      email: 'jorge7gomez@gmail.com',
      unsubscribeToken: 'test-token',
    })

    assert.ok(text.startsWith('Hola Victor,'))
    assert.ok(text.includes('Acabas de hacer algo que casi nadie hace'))
    assert.ok(text.includes('reprocesar'))
    assert.ok(text.includes('puente'))
    assert.ok(text.includes('Ver el motor en 30 segundos'))
    assert.ok(text.includes('/activar'))
    assert.ok(text.includes('/ventas'))
    assert.ok(text.includes('notas cortas'))
    assert.ok(text.includes('Jorge'))
    assert.ok(!text.includes('Gracias por abrir'))
    assert.ok(!text.includes('cero venta'))
    assert.ok(!text.includes('Misión 0'))
    assert.ok(text.includes('unsubscribe?token=test-token'))
  })

  it('defaults welcome delay to 24 hours', () => {
    assert.equal(INFO_SEQUENCE_WELCOME_DELAY_HOURS, 24)
  })

  it('uses distinct ledger label for info pack vs sequence welcome', async () => {
    const { INFO_PACK_LEDGER_LABEL } = await import('../lib/marketing/info-pack-email')
    assert.equal(INFO_PACK_LEDGER_LABEL, 'Info Pack')
  })

  it('html template includes field-notes copy and CTAs', () => {
    const html = buildInfoPackEmailHtml({
      nombre: 'Victor Obed Torres Paz',
      email: 'jorge7gomez@gmail.com',
      unsubscribeToken: 'test-token',
    })

    assert.ok(html.includes('Humano SISU'))
    assert.ok(html.includes('Acabas de hacer algo que casi nadie hace'))
    assert.ok(html.includes('Hola Victor'))
    assert.ok(html.includes('Ver el motor en 30 segundos'))
    assert.ok(html.includes('/activar'))
    assert.ok(html.includes('/ventas'))
    assert.ok(html.includes('notas cortas'))
    assert.ok(html.includes('unsubscribe?token=test-token'))
  })
})
