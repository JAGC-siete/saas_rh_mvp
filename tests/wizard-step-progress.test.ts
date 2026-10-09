import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { wizardProgressPct } from '../components/funnel/WizardStepProgress'

describe('wizardProgressPct', () => {
  it('counts completed steps, never 100% on the last step', () => {
    assert.equal(wizardProgressPct(0, 3), 0)
    assert.equal(wizardProgressPct(1, 3), 0)
    assert.equal(wizardProgressPct(2, 3), 33)
    assert.equal(wizardProgressPct(3, 3), 67)
  })

  it('clamps out-of-range steps', () => {
    assert.equal(wizardProgressPct(-1, 3), 0)
    assert.equal(wizardProgressPct(9, 3), 67)
  })
})
