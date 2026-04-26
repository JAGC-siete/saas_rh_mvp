import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { computeOverallScore } from '../lib/performance/score'

describe('performance score', () => {
  it('returns null when no items rated', () => {
    assert.equal(computeOverallScore([{ weight: 50 }, { weight: 50 }]), null)
  })

  it('computes weighted score with normalization when weights sum != 100', () => {
    const score = computeOverallScore([
      { weight: 10, rating: 'cumple' },
      { weight: 30, rating: 'supera' }
    ])
    // normalized weights: 0.25 and 0.75 => 0.25*1 + 0.75*1.25 = 1.1875 => 1.188
    assert.equal(score, 1.188)
  })

  it('allows overriding supera multiplier', () => {
    const score = computeOverallScore(
      [
        { weight: 50, rating: 'cumple' },
        { weight: 50, rating: 'supera' }
      ],
      { superaMultiplier: 1.2 }
    )
    // equal weights => (1 + 1.2)/2 = 1.1
    assert.equal(score, 1.1)
  })

  it('falls back to equal weights when all weights are zero', () => {
    const score = computeOverallScore([
      { weight: 0, rating: 'no_cumple' },
      { weight: 0, rating: 'supera' }
    ])
    // equal weights => (0 + 1.25)/2 = 0.625
    assert.equal(score, 0.625)
  })
})

