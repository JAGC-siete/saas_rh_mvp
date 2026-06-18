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

  it('includes truco body, benefits, and CTA links', () => {
    const text = buildInfoPackEmailText({
      nombre: 'Victor Obed Torres Paz',
      email: 'jorge7gomez@gmail.com',
      unsubscribeToken: 'test-token',
    })

    assert.ok(text.startsWith('Hola Victor,'))
    assert.ok(text.includes('reloj biométrico SISU'))
    assert.ok(text.includes('Asistencia en tiempo real'))
    assert.ok(text.includes('Los pagos se calculan solos'))
    assert.ok(text.includes('Cero registros perdidos'))
    assert.ok(text.includes('cero venta'))
    assert.ok(text.includes('Quiero ver cómo funciona'))
    assert.ok(text.includes('/activar'))
    assert.ok(text.includes('/ventas'))
    assert.ok(text.includes('5 correos breves'))
    assert.ok(text.includes('unsubscribe?token=test-token'))
  })

  it('defaults welcome delay to 24 hours', () => {
    assert.equal(INFO_SEQUENCE_WELCOME_DELAY_HOURS, 24)
  })

  it('html template includes truco copy, CTAs, and PD', () => {
    const html = buildInfoPackEmailHtml({
      nombre: 'Victor Obed Torres Paz',
      email: 'jorge7gomez@gmail.com',
      unsubscribeToken: 'test-token',
    })

    assert.ok(html.includes('Humano SISU'))
    assert.ok(html.includes('linear-gradient'))
    assert.ok(html.includes('reloj biométrico SISU'))
    assert.ok(html.includes('Hola Victor'))
    assert.ok(html.includes('Quiero ver cómo funciona'))
    assert.ok(html.includes('Ver precios sin compromiso'))
    assert.ok(html.includes('/activar'))
    assert.ok(html.includes('/ventas'))
    assert.ok(html.includes('5 correos breves'))
    assert.ok(html.includes('unsubscribe?token=test-token'))
  })
})
