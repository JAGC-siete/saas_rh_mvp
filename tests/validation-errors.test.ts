import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { hasValidationErrors, omitValidationField } from '../lib/forms/validation-errors'
import {
  ventasCompanyErrors,
  ventasDeliveryErrors,
  ventasScopeErrors,
} from '../lib/ventas-game/ventas-form'
import { activarStep1Errors, activarStep2Errors, type ActivarFormData } from '../lib/activar-game/activar-form'

describe('hasValidationErrors', () => {
  it('ignores undefined and empty string values', () => {
    assert.equal(hasValidationErrors({}), false)
    assert.equal(hasValidationErrors({ email: undefined }), false)
    assert.equal(hasValidationErrors({ email: '' }), false)
    assert.equal(hasValidationErrors({ email: '   ' }), false)
    assert.equal(hasValidationErrors({ email: 'required' }), true)
  })

  it('detects the old partial-return bug pattern', () => {
    assert.equal(hasValidationErrors({ contact_email: undefined, empresa: undefined }), false)
  })
})

describe('ventas form step validators', () => {
  const validQuote = {
    contact_email: 'test@empresa.com',
    company_name: 'Acme',
    employees_count: 10,
    terminals_count: 1,
    country_code: 'HND' as const,
  }

  it('ventasDeliveryErrors is empty for valid email', () => {
    assert.equal(hasValidationErrors(ventasDeliveryErrors(validQuote)), false)
  })

  it('ventasCompanyErrors is empty for valid company', () => {
    assert.equal(hasValidationErrors(ventasCompanyErrors(validQuote)), false)
  })

  it('ventasScopeErrors is empty for valid scope', () => {
    assert.equal(hasValidationErrors(ventasScopeErrors(validQuote)), false)
  })

  it('ventasScopeErrors rejects monthly below 21 employees', () => {
    const e = ventasScopeErrors({
      ...validQuote,
      employees_count: 15,
      billing_modality: 'monthly',
    })
    assert.equal(hasValidationErrors(e), true)
    assert.match(e.billing_modality || '', /21/)
  })
})

describe('activar step validators', () => {
  const base: ActivarFormData = {
    empleados: 5,
    empresa: 'Serve Hope International',
    nombre: 'Yolany Diaz',
    whatsappCountryCallingCode: '+504',
    whatsappNumber: '',
    contactoEmail: 'ydiaz@servehope.international',
    departamentos: 1,
    aceptaTrial: true,
    countryCode: 'HND',
  }

  it('step1 and step2 pass with valid data', () => {
    assert.equal(hasValidationErrors(activarStep1Errors(base)), false)
    assert.equal(hasValidationErrors(activarStep2Errors(base)), false)
  })
})

describe('omitValidationField', () => {
  it('removes submit without undefined key', () => {
    const next = omitValidationField({ submit: 'fail', email: 'bad' }, 'submit')
    assert.deepEqual(next, { email: 'bad' })
    assert.equal('submit' in next, false)
  })
})
