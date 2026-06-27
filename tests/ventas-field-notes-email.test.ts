import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildVentasPainPoint2Text,
  buildVentasPainPoint5Text,
  buildVentasWelcomeText,
  getVentasSequenceSubject,
} from '../lib/marketing/ventas-field-notes-email'

describe('ventas field notes email', () => {
  it('welcome text is post-quote focused', () => {
    const text = buildVentasWelcomeText()
    assert.ok(text.includes('propuesta en PDF'))
    assert.ok(text.includes('— Jorge'))
    assert.ok(!text.includes('Equipo Humano SISU'))
  })

  it('subjects map steps 0–5', () => {
    assert.ok(getVentasSequenceSubject(0).includes('PDF'))
    assert.ok(getVentasSequenceSubject(2).includes('20%'))
  })

  it('pain point 2 mentions 72h offer window', () => {
    const text = buildVentasPainPoint2Text({ nombre: 'Ana', email: 'a@x.com' })
    assert.ok(text.includes('72 horas'))
    assert.ok(text.includes('20%'))
  })

  it('pain point 5 avoids /activar CTA', () => {
    const text = buildVentasPainPoint5Text({ nombre: 'Pedro', email: 'p@x.com' })
    assert.ok(text.includes('contratación'))
    assert.ok(!text.includes('/activar'))
  })
})
