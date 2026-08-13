import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getCalculatorUtmContext } from '../lib/suscripcion-game/calculator-utm-context'
import { RECIBO_ALERTAS_COPY } from '../lib/suscripcion-game/recibo-alertas-copy'

describe('suscripcion UTM dual-mode copy', () => {
  it('cold / direct traffic uses cold headline and badge', () => {
    const ctx = getCalculatorUtmContext(null)
    assert.equal(ctx.fromCalculator, false)
    assert.equal(ctx.headline, RECIBO_ALERTAS_COPY.cold.headline)
    assert.equal(ctx.badge, RECIBO_ALERTAS_COPY.cold.badge)
    assert.ok(!ctx.headline.includes('Guardá lo que acabás'))
  })

  it('calculator bridge uses fromCalculator mode', () => {
    const ctx = getCalculatorUtmContext('calculadora_deducciones_hnd')
    assert.equal(ctx.fromCalculator, true)
    assert.ok(ctx.badge.includes('Desde la calculadora'))
    assert.ok(ctx.headline.includes('IHSS') || ctx.headline.includes('Guardá'))
  })

  it('hub footer UTM stays on cold copy (no post-calc claim)', () => {
    const ctx = getCalculatorUtmContext('calculadora-hub')
    assert.equal(ctx.fromCalculator, false)
    assert.equal(ctx.headline, RECIBO_ALERTAS_COPY.cold.headline)
  })
})
