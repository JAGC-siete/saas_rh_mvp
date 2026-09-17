import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MERCADO_GEO, MERCADO_HOME_PREVIEW_VENDORS, MERCADO_SEO, mercadoSearchHints } from '../lib/mercado/home'
import { isPublicMercadoRoute, mercadoHomePath, mercadoVendorPath } from '../lib/mercado/paths'
import { vendorWhatsAppHref } from '../lib/mercado/whatsapp'
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
    assert.equal(isPublicMercadoRoute('/mercado/inscripcion'), true)
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

describe('mercado: copy San Pablo y WhatsApp', () => {
  it('nombra el mercado San Pablo y ancla Plaza la Amistad', () => {
    assert.match(MERCADO_SEO.name, /San Pablo/)
    assert.match(MERCADO_SEO.addressLine, /Plaza la Amistad/)
    assert.match(MERCADO_SEO.tagline, /WhatsApp/)
    assert.match(MERCADO_GEO.howToArrive, /Escenario al Aire Libre/)
    assert.equal(MERCADO_GEO.latitude, 14.597778)
    assert.equal(MERCADO_GEO.longitude, -87.831111)
  })

  it('pone copy de calle y retrato en los puestos destacados', () => {
    const patio = MERCADO_HOME_PREVIEW_VENDORS.find((vendor) => vendor.slug === 'comedor-el-patio')
    const marta = MERCADO_HOME_PREVIEW_VENDORS.find((vendor) => vendor.slug === 'verduras-dona-marta')
    assert.ok(patio)
    assert.ok(marta)
    assert.match(patio.description, /Doña Carmen/)
    assert.match(marta.description, /Doña Marta/)
    assert.equal(marta.logoUrl, '/mercado/dona-marta.png')
    assert.equal(patio.whatsapp, null)
  })

  it('sugiere antojo al teclear sopa', () => {
    const hints = mercadoSearchHints('Sop')
    assert.ok(hints.some((hint) => /mondongo/i.test(hint.label)))
  })

  it('arma wa.me sin inventar el número', () => {
    const href = vendorWhatsAppHref('9999-0000', 'Comedor El Patio')
    assert.match(href, /^https:\/\/wa\.me\/99990000\?text=/)
    assert.match(href, /San%20Pablo/)
  })
})
