import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ALL_DEDUCTION_CALCULATOR_LEGACY_PATHS,
  ALL_DEDUCTION_CALCULATOR_PUBLIC_PATHS,
  deductionCalculatorPublicPath,
} from '../lib/marketing/calculator-public-paths'

describe('deduction calculator public paths (SEO restore)', () => {
  it('canonical paths match historical calculadora-deducciones* URLs', () => {
    assert.equal(deductionCalculatorPublicPath('HND'), '/calculadora-deducciones')
    assert.equal(deductionCalculatorPublicPath('SLV'), '/calculadora-deducciones-el-salvador')
    assert.equal(deductionCalculatorPublicPath('GTM'), '/calculadora-deducciones-guatemala')
  })

  it('keeps calcusisu* as legacy aliases for 301', () => {
    assert.deepEqual(ALL_DEDUCTION_CALCULATOR_LEGACY_PATHS, [
      '/calcusisuhn',
      '/calcusisusv',
      '/calcusisuguate',
    ])
    for (const legacy of ALL_DEDUCTION_CALCULATOR_LEGACY_PATHS) {
      assert.ok(!ALL_DEDUCTION_CALCULATOR_PUBLIC_PATHS.includes(legacy as never))
    }
  })
})
