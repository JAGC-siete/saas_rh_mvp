/**
 * Tests unitarios para la calculadora de deducciones
 * 
 * Run: npm test -- tests/deduction-validator.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateSalary,
  validatePaymentModality,
  validateYear,
  validateEmail,
  validateCalculatorInputs
} from '../lib/deduction-validator/validation'

describe('Validación de Salario', () => {
  it('debe validar un salario válido como número', () => {
    const result = validateSalary(15000)
    assert.equal(result.valid, true)
    assert.equal(result.sanitized, 15000)
  })

  it('debe validar un salario válido como string', () => {
    const result = validateSalary('15000.50')
    assert.equal(result.valid, true)
    assert.equal(result.sanitized, 15000.5)
  })

  it('debe sanitizar caracteres no numéricos', () => {
    const result = validateSalary('L. 15,000.50')
    assert.equal(result.valid, true)
    assert.equal(result.sanitized, 15000.5)
  })

  it('debe rechazar salario vacío', () => {
    const result = validateSalary('')
    assert.equal(result.valid, false)
    assert.ok(typeof result.error === 'string')
    assert.ok(result.error.includes('requerido'))
  })

  it('debe rechazar salario cero', () => {
    const result = validateSalary(0)
    assert.equal(result.valid, false)
    assert.ok(typeof result.error === 'string')
    assert.ok(result.error.includes('mayor que cero'))
  })

  it('debe rechazar salario negativo', () => {
    const result = validateSalary(-1000)
    assert.equal(result.valid, false)
    assert.ok(typeof result.error === 'string')
    assert.ok(result.error.includes('mayor que cero'))
  })

  it('debe rechazar salario mayor al límite', () => {
    const result = validateSalary(600000)
    assert.equal(result.valid, false)
    assert.ok(typeof result.error === 'string')
    assert.ok(result.error.includes('500,000'))
  })

  it('debe redondear a 2 decimales', () => {
    const result = validateSalary(15000.999)
    assert.equal(result.valid, true)
    assert.equal(result.sanitized, 15001)
  })
})

describe('Validación de Modalidad de Pago', () => {
  it('debe validar modalidad "quincenal"', () => {
    const result = validatePaymentModality('quincenal')
    assert.equal(result.valid, true)
    assert.equal(result.sanitized, 'quincenal')
  })

  it('debe validar modalidad "mensual"', () => {
    const result = validatePaymentModality('mensual')
    assert.equal(result.valid, true)
    assert.equal(result.sanitized, 'mensual')
  })

  it('debe ser case-insensitive', () => {
    const result = validatePaymentModality('QUINCENAL')
    assert.equal(result.valid, true)
    assert.equal(result.sanitized, 'quincenal')
  })

  it('debe validar modalidad "semanal"', () => {
    const result = validatePaymentModality('semanal')
    assert.equal(result.valid, true)
    assert.equal(result.sanitized, 'semanal')
  })

  it('debe rechazar modalidad inválida', () => {
    const result = validatePaymentModality('diario')
    assert.equal(result.valid, false)
    assert.ok(typeof result.error === 'string')
    assert.ok(result.error.includes('quincenal'))
  })

  it('debe rechazar valor vacío', () => {
    const result = validatePaymentModality('')
    assert.equal(result.valid, false)
  })
})

describe('Validación de Año', () => {
  const currentYear = new Date().getFullYear()

  it('debe validar año válido', () => {
    const result = validateYear(2025, currentYear)
    assert.equal(result.valid, true)
    assert.equal(result.sanitized, 2025)
  })

  it('debe validar año actual', () => {
    const result = validateYear(currentYear, currentYear)
    assert.equal(result.valid, true)
  })

  it('debe validar año futuro próximo', () => {
    const result = validateYear(currentYear + 1, currentYear)
    assert.equal(result.valid, true)
  })

  it('debe rechazar año muy antiguo', () => {
    const result = validateYear(2019, currentYear)
    assert.equal(result.valid, false)
    assert.ok(typeof result.error === 'string')
    assert.ok(result.error.includes('2020'))
  })

  it('debe rechazar año muy futuro', () => {
    const result = validateYear(currentYear + 3, currentYear)
    assert.equal(result.valid, false)
  })

  it('debe rechazar año inválido', () => {
    const result = validateYear(NaN, currentYear)
    assert.equal(result.valid, false)
  })
})

describe('Validación de Email', () => {
  it('debe validar email válido', () => {
    const result = validateEmail('test@example.com')
    assert.equal(result.valid, true)
    assert.equal(result.sanitized, 'test@example.com')
  })

  it('debe ser opcional (vacío es válido)', () => {
    const result = validateEmail('')
    assert.equal(result.valid, true)
  })

  it('debe validar email undefined', () => {
    const result = validateEmail(undefined)
    assert.equal(result.valid, true)
  })

  it('debe rechazar email inválido', () => {
    const result = validateEmail('invalid-email')
    assert.equal(result.valid, false)
    assert.ok(typeof result.error === 'string')
    assert.ok(result.error.includes('válido'))
  })

  it('debe rechazar email sin dominio', () => {
    const result = validateEmail('test@')
    assert.equal(result.valid, false)
  })

  it('debe normalizar a lowercase', () => {
    const result = validateEmail('TEST@EXAMPLE.COM')
    assert.equal(result.valid, true)
    assert.equal(result.sanitized, 'test@example.com')
  })

  it('debe rechazar email demasiado largo', () => {
    const longEmail = 'a'.repeat(250) + '@example.com'
    const result = validateEmail(longEmail)
    assert.equal(result.valid, false)
    assert.ok(typeof result.error === 'string')
    assert.ok(result.error.includes('largo'))
  })
})

describe('Validación Completa de Inputs', () => {
  it('debe validar todos los inputs correctos', () => {
    const result = validateCalculatorInputs({
      salary: 15000,
      paymentModality: 'mensual',
      year: 2025,
      email: 'test@example.com'
    })

    assert.equal(result.valid, true)
    assert.equal(result.errors.length, 0)
    assert.equal(result.sanitized.salary, 15000)
    assert.equal(result.sanitized.paymentModality, 'mensual')
    assert.equal(result.sanitized.year, 2025)
    assert.equal(result.sanitized.email, 'test@example.com')
  })

  it('debe retornar múltiples errores', () => {
    const result = validateCalculatorInputs({
      salary: -1000,
      paymentModality: 'invalid',
      year: 2010
    })

    assert.equal(result.valid, false)
    assert.ok(result.errors.length > 1)
  })

  it('debe funcionar sin email (opcional)', () => {
    const result = validateCalculatorInputs({
      salary: 15000,
      paymentModality: 'mensual',
      year: 2025
    })

    assert.equal(result.valid, true)
  })

  it('debe funcionar sin año (opcional)', () => {
    const result = validateCalculatorInputs({
      salary: 15000,
      paymentModality: 'mensual'
    })

    assert.equal(result.valid, true)
  })
})

