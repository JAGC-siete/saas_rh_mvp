import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeCustomFieldsEffectiveAmounts,
  isPayrollRunEditableForCustomFields,
  resolveCustomFieldsBaseBruto,
} from '../lib/payroll/custom-fields-eff-amounts'

describe('resolveCustomFieldsBaseBruto', () => {
  it('anchors to calc when eff is calc + prior (normal)', () => {
    assert.equal(
      resolveCustomFieldsBaseBruto({
        calcBruto: 5000,
        currentEffBruto: 5100,
        priorIngresosAdicionales: 100,
      }),
      5000
    )
  })

  it('heals double-count (calc + 2*prior)', () => {
    assert.equal(
      resolveCustomFieldsBaseBruto({
        calcBruto: 5000,
        currentEffBruto: 5200,
        priorIngresosAdicionales: 100,
      }),
      5000
    )
  })

  it('preserves manual bruto override outside calc±N·prior', () => {
    assert.equal(
      resolveCustomFieldsBaseBruto({
        calcBruto: 5000,
        currentEffBruto: 6000,
        priorIngresosAdicionales: 100,
      }),
      5900
    )
  })

  it('keeps eff when no prior custom earnings', () => {
    assert.equal(
      resolveCustomFieldsBaseBruto({
        calcBruto: 5000,
        currentEffBruto: 6000,
        priorIngresosAdicionales: 0,
      }),
      6000
    )
  })
})

describe('computeCustomFieldsEffectiveAmounts', () => {
  it('is idempotent when re-applying the same custom earnings', () => {
    const statutory = { effIhss: 50, effRap: 10, effIsr: 20 }
    const first = computeCustomFieldsEffectiveAmounts({
      calcBruto: 5000,
      currentEffBruto: 5000,
      priorIngresosAdicionales: 0,
      ingresosAdicionales: 100,
      deduccionesAdicionales: 30,
      ...statutory,
    })
    const second = computeCustomFieldsEffectiveAmounts({
      calcBruto: 5000,
      currentEffBruto: first.newEffBruto,
      priorIngresosAdicionales: 100,
      ingresosAdicionales: 100,
      deduccionesAdicionales: 30,
      ...statutory,
    })

    assert.equal(first.newEffBruto, 5100)
    assert.equal(second.newEffBruto, 5100)
    assert.equal(first.newEffNeto, 5100 - 80 - 30)
    assert.equal(second.newEffNeto, first.newEffNeto)
  })

  it('heals a previously double-counted eff_bruto on next save', () => {
    const healed = computeCustomFieldsEffectiveAmounts({
      calcBruto: 5000,
      currentEffBruto: 5200,
      priorIngresosAdicionales: 100,
      ingresosAdicionales: 100,
      deduccionesAdicionales: 0,
      effIhss: 0,
      effRap: 0,
      effIsr: 0,
    })
    assert.equal(healed.newEffBruto, 5100)
  })

  it('preserves manual bruto when re-applying customs', () => {
    const result = computeCustomFieldsEffectiveAmounts({
      calcBruto: 5000,
      currentEffBruto: 6000,
      priorIngresosAdicionales: 100,
      ingresosAdicionales: 100,
      deduccionesAdicionales: 0,
      effIhss: 0,
      effRap: 0,
      effIsr: 0,
    })
    assert.equal(result.newEffBruto, 6000)
  })
})

describe('isPayrollRunEditableForCustomFields', () => {
  it('allows draft and edited only', () => {
    assert.equal(isPayrollRunEditableForCustomFields('draft'), true)
    assert.equal(isPayrollRunEditableForCustomFields('edited'), true)
    assert.equal(isPayrollRunEditableForCustomFields('authorized'), false)
    assert.equal(isPayrollRunEditableForCustomFields('distributed'), false)
    assert.equal(isPayrollRunEditableForCustomFields('paid'), false)
    assert.equal(isPayrollRunEditableForCustomFields(null), false)
  })
})
