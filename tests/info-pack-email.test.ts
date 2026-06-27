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
  it('uses fixed subject with truco copy', () => {
    assert.equal(buildInfoPackSubject('Victor Obed Torres Paz', 'jorge7gomez@gmail.com'), INFO_PACK_SUBJECT)
    assert.ok(INFO_PACK_SUBJECT.includes('truco'))
  })

  it('includes reprocessing angle, benefits, and CTA links', () => {
    const text = buildInfoPackEmailText({
      nombre: 'Victor Obed Torres Paz',
      email: 'jorge7gomez@gmail.com',
      unsubscribeToken: 'test-token',
    })

    assert.ok(text.startsWith('Hola Victor,'))
    assert.ok(text.includes('pseudo-digitalización'))
    assert.ok(text.includes('reprocesamiento'))
    assert.ok(text.includes('Conexión directa en la nube'))
    assert.ok(text.includes('El motor legal calcula solo'))
    assert.ok(text.includes('Todo centralizado en un clic'))
    assert.ok(text.includes('cero venta'))
    assert.ok(text.includes('Quiero ver el motor en funcionamiento'))
    assert.ok(text.includes('/activar'))
    assert.ok(text.includes('/ventas'))
    assert.ok(text.includes('Misión 0'))
    assert.ok(text.includes('Misión 1'))
    assert.ok(text.includes('Jorge · Humano SISU'))
    assert.ok(text.includes('unsubscribe?token=test-token'))
  })

  it('defaults welcome delay to 24 hours', () => {
    assert.equal(INFO_SEQUENCE_WELCOME_DELAY_HOURS, 24)
  })

  it('uses distinct ledger label for info pack vs sequence welcome', async () => {
    const { INFO_PACK_LEDGER_LABEL } = await import('../lib/marketing/info-pack-email')
    assert.equal(INFO_PACK_LEDGER_LABEL, 'Info Pack')
  })

  it('html template includes reprocessing copy, CTAs, and PD', () => {
    const html = buildInfoPackEmailHtml({
      nombre: 'Victor Obed Torres Paz',
      email: 'jorge7gomez@gmail.com',
      unsubscribeToken: 'test-token',
    })

    assert.ok(html.includes('Humano SISU'))
    assert.ok(html.includes('linear-gradient'))
    assert.ok(html.includes('pseudo-digitalización'))
    assert.ok(html.includes('reprocesamiento'))
    assert.ok(html.includes('Hola Victor'))
    assert.ok(html.includes('Quiero ver el motor en funcionamiento'))
    assert.ok(html.includes('Ver tablas de precios transparentes'))
    assert.ok(html.includes('/activar'))
    assert.ok(html.includes('/ventas'))
    assert.ok(html.includes('Misión 0'))
    assert.ok(html.includes('Misión 1'))
    assert.ok(html.includes('unsubscribe?token=test-token'))
  })
})
