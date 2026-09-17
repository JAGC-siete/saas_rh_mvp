import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isPublicMercadoRoute, mercadoHomePath, mercadoVendorPath } from '../lib/mercado/paths'
import {
  isPublicMarketingRoute,
  isPublicTenantLandingRoute,
  isPublicToolRoute,
} from '../lib/seo/public-ssr-routes'
import { MIDDLEWARE_CONFIG, getAllPublicRoutes } from '../middleware.config'

describe('mercado: shell público', () => {
  it('usa el shell de tenant landing, no marketing ni /tools', () => {
    assert.equal(mercadoHomePath(), '/mercado')
    assert.equal(mercadoVendorPath('comedor-el-patio'), '/mercado/comedor-el-patio')
    assert.equal(isPublicMercadoRoute('/mercado'), true)
    assert.equal(isPublicMercadoRoute('/mercado/comedor-el-patio'), true)
    assert.equal(isPublicMercadoRoute('/mercaderia'), false)
    assert.equal(isPublicTenantLandingRoute('/mercado'), true)
    assert.equal(isPublicTenantLandingRoute('/en/mercado'), true)
    assert.equal(isPublicTenantLandingRoute('/mercado/comedor-el-patio'), true)
    assert.equal(isPublicMarketingRoute('/mercado'), false)
    assert.equal(isPublicToolRoute('/mercado'), false)
  })

  it('queda en el inventario de middleware.config (sin enforcement de auth)', () => {
    assert.ok(MIDDLEWARE_CONFIG.protection.public.includes('/mercado'))
    assert.ok(getAllPublicRoutes().includes('/mercado'))
    assert.ok(getAllPublicRoutes().includes('/mercado/*'))
  })

  it('no pisa el home de Humano SISU', () => {
    assert.equal(isPublicMarketingRoute('/'), true)
    assert.equal(isPublicTenantLandingRoute('/'), false)
  })
})
