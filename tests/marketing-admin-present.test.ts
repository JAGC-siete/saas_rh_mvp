import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  MARKETING_STATUS_LABELS,
  marketingStepLabel,
} from '../lib/marketing/admin-present'

describe('marketing admin-present (P3)', () => {
  it('status labels in Spanish', () => {
    assert.equal(MARKETING_STATUS_LABELS.active, 'Activo')
    assert.equal(MARKETING_STATUS_LABELS.completed, 'Completado')
    assert.equal(MARKETING_STATUS_LABELS.unsubscribed, 'Desuscrito')
  })

  it('step labels for sequence positions', () => {
    assert.equal(marketingStepLabel(0), 'Welcome pendiente')
    assert.equal(marketingStepLabel(1), 'Siguiente: paso 1')
    assert.equal(marketingStepLabel(4), 'Siguiente: paso 4')
    assert.equal(marketingStepLabel(5), 'Secuencia completa')
  })
})
