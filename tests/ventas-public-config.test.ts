import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { loadPublicVentasConfig } from '../lib/ventas/public-config'
import { FALLBACK_LADDER_PLANS } from '../lib/ventas/ladder'

describe('loadPublicVentasConfig fallback (no Supabase, as in the Docker build)', () => {
  it('publishes the plan prices so prerendered pages show them', async () => {
    const config = await loadPublicVentasConfig()
    assert.deepEqual(
      config.plans.map((p) => [p.plan_key, p.monthly_price_hnl, p.annual_price_hnl]),
      FALLBACK_LADDER_PLANS.map((p) => [p.plan_key, p.monthly_price_hnl, p.annual_price_hnl])
    )
  })

  it('still hides the legacy tier prices', async () => {
    const config = await loadPublicVentasConfig()
    assert.ok(config.tiers.length > 0)
    assert.ok(config.tiers.every((t) => t.price === null))
  })
})
