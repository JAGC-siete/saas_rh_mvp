import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { activarStep2Errors, type ActivarFormData } from '../lib/activar-game/activar-form'

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

describe('activarStep2Errors', () => {
  it('returns no keys when email and empresa are valid', () => {
    const errors = activarStep2Errors(base)
    assert.deepEqual(errors, {})
    assert.equal(Object.keys(errors).length, 0)
  })

  it('returns errors for invalid email or empty empresa', () => {
    assert.ok(Object.keys(activarStep2Errors({ ...base, contactoEmail: '' })).length > 0)
    assert.ok(Object.keys(activarStep2Errors({ ...base, empresa: '' })).length > 0)
    assert.ok(Object.keys(activarStep2Errors({ ...base, contactoEmail: 'bad' })).length > 0)
  })
})
