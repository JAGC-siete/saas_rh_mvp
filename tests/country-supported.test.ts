import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeCountryCode,
  parseCountryCodeInput,
  PUBLIC_COUNTRY_CODES,
  SUPPORTED_COUNTRY_CODES
} from '../lib/country/supported'

describe('country/supported aliases', () => {
  it('normaliza alias SV → SLV y GT → GTM', () => {
    assert.equal(normalizeCountryCode('SV'), 'SLV')
    assert.equal(normalizeCountryCode('GT'), 'GTM')
    assert.equal(normalizeCountryCode('HN'), 'HND')
  })

  it('parseCountryCodeInput rechaza códigos desconocidos', () => {
    assert.equal(parseCountryCodeInput('MEX'), null)
    assert.equal(parseCountryCodeInput('XX'), null)
  })

  it('parseCountryCodeInput acepta ISO alpha-3 y alias', () => {
    for (const cc of PUBLIC_COUNTRY_CODES) {
      assert.equal(parseCountryCodeInput(cc), cc)
    }
    assert.equal(parseCountryCodeInput('SV'), 'SLV')
    assert.equal(parseCountryCodeInput('GT'), 'GTM')
    assert.equal(parseCountryCodeInput(undefined), 'HND')
  })

  it('COL existe en la app pero no en la entrada pública', () => {
    assert.ok((SUPPORTED_COUNTRY_CODES as readonly string[]).includes('COL'))
    assert.equal(normalizeCountryCode('COL'), 'COL')
    assert.equal(normalizeCountryCode('CO'), 'COL')
    assert.equal(parseCountryCodeInput('COL'), null)
    assert.equal(parseCountryCodeInput('CO'), null)
  })
})
