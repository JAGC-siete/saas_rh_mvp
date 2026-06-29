import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildActivarPainPoint1Text,
  buildActivarPainPoint5Text,
  buildActivarWelcomeText,
  getActivarSequenceSubject,
} from '../lib/marketing/activar-field-notes-email'

describe('activar field notes email', () => {
  it('welcome text is onboarding-focused', () => {
    const text = buildActivarWelcomeText()
    assert.ok(text.includes('Encendiste el motor'))
    assert.ok(text.includes('— Jorge'))
    assert.ok(!text.includes('Equipo Humano SISU'))
  })

  it('subjects map steps 0–5', () => {
    assert.ok(getActivarSequenceSubject(0).includes('Nota #0'))
    assert.ok(getActivarSequenceSubject(5).includes('Nota #5'))
  })

  it('pain point 1 includes mission footer when token present', () => {
    const text = buildActivarPainPoint1Text({
      nombre: 'Ana',
      email: 'a@x.com',
      leadToken: 'tok',
    })
    assert.ok(text.includes('Hola Ana,'))
    assert.ok(text.includes('reprocesamiento'))
    assert.ok(text.includes('Nota #1 · Pregunta rápida'))
    assert.ok(text.includes('Cruzar / mover datos'))
  })

  it('pain point 5 CTA points to ventas not activar', () => {
    const text = buildActivarPainPoint5Text({ nombre: 'Pedro', email: 'p@x.com' })
    assert.ok(text.includes('/ventas'))
    assert.ok(!text.includes('/activar'))
    assert.ok(text.includes('Última nota de esta serie'))
  })
})
