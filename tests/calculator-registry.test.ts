import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  CALCULATOR_REGISTRY,
  indexableMatrixCalculators,
  matrixCalculator,
} from '../lib/public-calculator/registry'

describe('calculator registry', () => {
  it('has unique paths and keeps the historical calculator URLs', () => {
    const paths = CALCULATOR_REGISTRY.map((e) => e.path)
    assert.equal(new Set(paths).size, paths.length)
    for (const p of [
      '/calculadora-deducciones',
      '/calculadora-deducciones-el-salvador',
      '/calculadora-deducciones-guatemala',
      '/calculadora-prestaciones',
      '/calculadora-aguinaldo-honduras',
      '/calculadora-catorceavo-honduras',
    ]) {
      assert.ok(paths.includes(p), p)
    }
  })

  it('never indexes a matrix page without a confirmed legal article', () => {
    for (const e of indexableMatrixCalculators()) {
      assert.ok(e.legalBasis.some((b) => b.article), `${e.path} is indexable without an article`)
      assert.ok(e.engine, `${e.path} is indexable without a calculator`)
    }
  })

  it('keeps SV/GT new pages unvalidated and without formulas', () => {
    for (const e of CALCULATOR_REGISTRY) {
      if (e.kind !== 'matrix' || e.country === 'HND') continue
      assert.equal(e.legalValidated, false, e.path)
      assert.equal(e.engine, null, e.path)
    }
  })

  it('looks up matrix entries and rejects legacy ones', () => {
    assert.equal(matrixCalculator('/calculadora-vacaciones-honduras').engine, 'vacaciones-hn')
    assert.throws(() => matrixCalculator('/calculadora-deducciones'))
  })
})
