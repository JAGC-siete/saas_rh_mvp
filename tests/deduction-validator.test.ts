/**
 * Tests unitarios para la calculadora de deducciones
 * 
 * Run: npm test -- tests/deduction-validator.test.ts
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
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
    expect(result.valid).toBe(true)
    expect(result.sanitized).toBe(15000)
  })

  it('debe validar un salario válido como string', () => {
    const result = validateSalary('15000.50')
    expect(result.valid).toBe(true)
    expect(result.sanitized).toBe(15000.5)
  })

  it('debe sanitizar caracteres no numéricos', () => {
    const result = validateSalary('L. 15,000.50')
    expect(result.valid).toBe(true)
    expect(result.sanitized).toBe(15000.5)
  })

  it('debe rechazar salario vacío', () => {
    const result = validateSalary('')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('requerido')
  })

  it('debe rechazar salario cero', () => {
    const result = validateSalary(0)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('mayor que cero')
  })

  it('debe rechazar salario negativo', () => {
    const result = validateSalary(-1000)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('mayor que cero')
  })

  it('debe rechazar salario mayor al límite', () => {
    const result = validateSalary(600000)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('500,000')
  })

  it('debe redondear a 2 decimales', () => {
    const result = validateSalary(15000.999)
    expect(result.valid).toBe(true)
    expect(result.sanitized).toBe(15000.00)
  })
})

describe('Validación de Modalidad de Pago', () => {
  it('debe validar modalidad "quincenal"', () => {
    const result = validatePaymentModality('quincenal')
    expect(result.valid).toBe(true)
    expect(result.sanitized).toBe('quincenal')
  })

  it('debe validar modalidad "mensual"', () => {
    const result = validatePaymentModality('mensual')
    expect(result.valid).toBe(true)
    expect(result.sanitized).toBe('mensual')
  })

  it('debe ser case-insensitive', () => {
    const result = validatePaymentModality('QUINCENAL')
    expect(result.valid).toBe(true)
    expect(result.sanitized).toBe('quincenal')
  })

  it('debe rechazar modalidad inválida', () => {
    const result = validatePaymentModality('semanal')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('quincenal')
  })

  it('debe rechazar valor vacío', () => {
    const result = validatePaymentModality('')
    expect(result.valid).toBe(false)
  })
})

describe('Validación de Año', () => {
  const currentYear = new Date().getFullYear()

  it('debe validar año válido', () => {
    const result = validateYear(2025, currentYear)
    expect(result.valid).toBe(true)
    expect(result.sanitized).toBe(2025)
  })

  it('debe validar año actual', () => {
    const result = validateYear(currentYear, currentYear)
    expect(result.valid).toBe(true)
  })

  it('debe validar año futuro próximo', () => {
    const result = validateYear(currentYear + 1, currentYear)
    expect(result.valid).toBe(true)
  })

  it('debe rechazar año muy antiguo', () => {
    const result = validateYear(2019, currentYear)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('2020')
  })

  it('debe rechazar año muy futuro', () => {
    const result = validateYear(currentYear + 3, currentYear)
    expect(result.valid).toBe(false)
  })

  it('debe rechazar año inválido', () => {
    const result = validateYear(NaN, currentYear)
    expect(result.valid).toBe(false)
  })
})

describe('Validación de Email', () => {
  it('debe validar email válido', () => {
    const result = validateEmail('test@example.com')
    expect(result.valid).toBe(true)
    expect(result.sanitized).toBe('test@example.com')
  })

  it('debe ser opcional (vacío es válido)', () => {
    const result = validateEmail('')
    expect(result.valid).toBe(true)
  })

  it('debe validar email undefined', () => {
    const result = validateEmail(undefined)
    expect(result.valid).toBe(true)
  })

  it('debe rechazar email inválido', () => {
    const result = validateEmail('invalid-email')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('válido')
  })

  it('debe rechazar email sin dominio', () => {
    const result = validateEmail('test@')
    expect(result.valid).toBe(false)
  })

  it('debe normalizar a lowercase', () => {
    const result = validateEmail('TEST@EXAMPLE.COM')
    expect(result.valid).toBe(true)
    expect(result.sanitized).toBe('test@example.com')
  })

  it('debe rechazar email demasiado largo', () => {
    const longEmail = 'a'.repeat(250) + '@example.com'
    const result = validateEmail(longEmail)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('largo')
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

    expect(result.valid).toBe(true)
    expect(result.errors.length).toBe(0)
    expect(result.sanitized.salary).toBe(15000)
    expect(result.sanitized.paymentModality).toBe('mensual')
    expect(result.sanitized.year).toBe(2025)
    expect(result.sanitized.email).toBe('test@example.com')
  })

  it('debe retornar múltiples errores', () => {
    const result = validateCalculatorInputs({
      salary: -1000,
      paymentModality: 'invalid',
      year: 2010
    })

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })

  it('debe funcionar sin email (opcional)', () => {
    const result = validateCalculatorInputs({
      salary: 15000,
      paymentModality: 'mensual',
      year: 2025
    })

    expect(result.valid).toBe(true)
  })

  it('debe funcionar sin año (opcional)', () => {
    const result = validateCalculatorInputs({
      salary: 15000,
      paymentModality: 'mensual'
    })

    expect(result.valid).toBe(true)
  })
})

