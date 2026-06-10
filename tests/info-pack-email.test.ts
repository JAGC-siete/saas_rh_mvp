import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildInfoPackEmailText,
  buildInfoPackSubject,
  INFO_SEQUENCE_WELCOME_DELAY_HOURS,
} from '../lib/marketing/info-pack-email'
import { buildInfoPackEmailHtml } from '../lib/marketing/info-pack-email-html'

describe('info pack email (/info TOFU)', () => {
  it('personalizes subject with first name', () => {
    assert.equal(
      buildInfoPackSubject('Victor Obed Torres Paz', 'jorge7gomez@gmail.com'),
      'Victor, esto es Humano SISU en 3 minutos'
    )
  })

  it('includes product overview and biometric how-it-works section', () => {
    const text = buildInfoPackEmailText({
      nombre: 'Victor Obed Torres Paz',
      email: 'jorge7gomez@gmail.com',
      unsubscribeToken: 'test-token',
    })

    assert.ok(text.startsWith('Hola Victor Obed Torres Paz,'))
    assert.ok(text.includes('reloj biométrico inteligente'))
    assert.ok(text.includes('Visualización de asistencia en tiempo real'))
    assert.ok(text.includes('Cálculo de nóminas parametrizado y automatizado'))
    assert.ok(text.includes('ficha de personal'))
    assert.ok(text.includes('Excel, PDF, TXT, CSV'))
    assert.ok(text.includes('/activar'))
    assert.ok(text.includes('/ventas'))
    assert.ok(text.includes('unsubscribe?token=test-token'))
  })

  it('defaults welcome delay to 24 hours', () => {
    assert.equal(INFO_SEQUENCE_WELCOME_DELAY_HOURS, 24)
  })

  it('html template includes styled sections and biometric copy', () => {
    const html = buildInfoPackEmailHtml({
      nombre: 'Victor Obed Torres Paz',
      email: 'jorge7gomez@gmail.com',
      unsubscribeToken: 'test-token',
    })

    assert.ok(html.includes('Humano SISU'))
    assert.ok(html.includes('linear-gradient'))
    assert.ok(html.includes('reloj biométrico inteligente'))
    assert.ok(html.includes('Hola Victor'))
    assert.ok(html.includes('/activar'))
    assert.ok(html.includes('/ventas'))
    assert.ok(html.includes('unsubscribe?token=test-token'))
  })
})
