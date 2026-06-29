import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateLeadEmail } from '../lib/marketing/validate-lead-email'

describe('validateLeadEmail', () => {
  it('accepts common valid addresses', () => {
    assert.deepEqual(validateLeadEmail('juan.perez@gmail.com'), {
      ok: true,
      email: 'juan.perez@gmail.com',
    })
    assert.deepEqual(validateLeadEmail('  Maria@Hotmail.COM '), {
      ok: true,
      email: 'maria@hotmail.com',
    })
    assert.deepEqual(validateLeadEmail('mirnayolandavarela@icloud.com'), {
      ok: true,
      email: 'mirnayolandavarela@icloud.com',
    })
  })

  it('rejects obvious typo domains and placeholders', () => {
    assert.equal(validateLeadEmail('lilianantunez@ggmail.com').ok, false)
    assert.equal(validateLeadEmail('mejiajairo047@email.com').ok, false)
    assert.equal(validateLeadEmail('foo@gmial.com').ok, false)
  })

  it('rejects malformed gmail local parts', () => {
    assert.equal(validateLeadEmail('oscarfransiscoperez.com@gmail.com').ok, false)
    assert.equal(validateLeadEmail('eduardoayala96icloud@gmail.com').ok, false)
    assert.equal(validateLeadEmail('architasingh273301@gmail.comy').ok, false)
  })

  it('rejects empty and invalid format', () => {
    assert.equal(validateLeadEmail('').ok, false)
    assert.equal(validateLeadEmail('not-an-email').ok, false)
    assert.equal(validateLeadEmail('a@b').ok, false)
  })
})
