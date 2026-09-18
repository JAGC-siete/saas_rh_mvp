import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { MERCADO_GEO, MERCADO_HOME_PREVIEW_VENDORS, MERCADO_SEO, mercadoSearchHints } from '../lib/mercado/home'
import { vendorBuySteps } from '../lib/mercado/buy-flow'
import { isPublicMercadoRoute, mercadoHomePath, mercadoVendorPath } from '../lib/mercado/paths'
import { MERCADO_DIRECTORY_WHATSAPP, vendorReservationHref, vendorWhatsAppHref } from '../lib/mercado/whatsapp'
import { mercadoStaticSrc } from '../lib/mercado/assets'
import {
  isPublicMarketingRoute,
  isPublicTenantLandingRoute,
  isPublicToolRoute,
} from '../lib/seo/public-ssr-routes'
import { MIDDLEWARE_CONFIG, getAllPublicRoutes } from '../middleware.config'

describe('mercado: shell público', () => {
  it('usa el shell de tenant landing, no marketing ni /tools', () => {
    assert.equal(mercadoHomePath(), '/mercadosanpablosigua')
    assert.equal(mercadoVendorPath('comedor-el-patio'), '/mercadosanpablosigua/comedor-el-patio')
    assert.equal(isPublicMercadoRoute('/mercadosanpablosigua'), true)
    assert.equal(isPublicMercadoRoute('/mercadosanpablosigua/inscripcion'), true)
    assert.equal(isPublicMercadoRoute('/mercadosanpablosigua/comedor-el-patio'), true)
    assert.equal(isPublicMercadoRoute('/mercado'), true)
    assert.equal(isPublicMercadoRoute('/mercado/inscripcion'), true)
    assert.equal(isPublicMercadoRoute('/mercaderia'), false)
    assert.equal(isPublicTenantLandingRoute('/mercadosanpablosigua'), true)
    assert.equal(isPublicTenantLandingRoute('/en/mercadosanpablosigua'), true)
    assert.equal(isPublicTenantLandingRoute('/mercadosanpablosigua/comedor-el-patio'), true)
    assert.equal(isPublicMarketingRoute('/mercadosanpablosigua'), false)
    assert.equal(isPublicToolRoute('/mercadosanpablosigua'), false)
  })

  it('queda en el inventario de middleware.config (sin enforcement de auth)', () => {
    assert.ok(MIDDLEWARE_CONFIG.protection.public.includes('/mercadosanpablosigua'))
    assert.ok(MIDDLEWARE_CONFIG.protection.public.includes('/mercado'))
    assert.ok(getAllPublicRoutes().includes('/mercadosanpablosigua'))
    assert.ok(getAllPublicRoutes().includes('/mercadosanpablosigua/*'))
    assert.ok(getAllPublicRoutes().includes('/mercado'))
    assert.ok(getAllPublicRoutes().includes('/mercado/*'))
  })

  it('el 301 de /mercado no se lleva los png de public/mercado', () => {
    const config = readFileSync(join(process.cwd(), 'next.config.js'), 'utf8')
    assert.match(config, /\/mercado\/:path\(\(\?!\.\*\\\\.\)\.\*\)/)
    assert.equal(config.includes("source: '/mercado/:path*'"), false)
  })

  it('cache-bustea png de /mercado para no heredar un 308 viejo', () => {
    assert.equal(mercadoStaticSrc('/mercado/dona-marta.png'), '/mercado/dona-marta.png?v=2')
    assert.equal(mercadoStaticSrc('/otro.png'), '/otro.png')
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

  it('deja cada mini landing con rubro, 5 productos y galería', () => {
    for (const vendor of MERCADO_HOME_PREVIEW_VENDORS) {
      assert.equal(vendor.products.length, 5)
      assert.ok(vendor.paymentMethods.includes('efectivo'))
      assert.ok(vendor.paymentMethods.includes('transferencia_bac'))
      assert.equal(vendor.gallery.length, 3)
      assert.equal(vendor.whatsapp, null)
    }
    const carniceria = MERCADO_HOME_PREVIEW_VENDORS.find((vendor) => vendor.slug === 'carniceria-la-esquina')
    assert.ok(carniceria)
    assert.ok(carniceria.products.includes('Lomo de res'))
    assert.match(carniceria.description, /WhatsApp/)
    assert.match(carniceria.description, /transferencia/)
  })

  it('explica comprar en 3 pasos con recoger en el local', () => {
    const carniceria = MERCADO_HOME_PREVIEW_VENDORS.find((vendor) => vendor.slug === 'carniceria-la-esquina')
    assert.ok(carniceria)
    const steps = vendorBuySteps(carniceria)
    assert.equal(steps.length, 3)
    assert.equal(steps[0]?.title, 'Escríbenos')
    assert.match(steps[1]?.body ?? '', /BAC/)
    assert.match(steps[2]?.body ?? '', /local 2/)
  })

  it('sugiere antojo al teclear sopa', () => {
    const hints = mercadoSearchHints('Sop')
    assert.ok(hints.some((hint) => /mondongo/i.test(hint.label)))
  })

  it('arma wa.me sin inventar el número', () => {
    const href = vendorWhatsAppHref('9999-0000', 'Comedor El Patio')
    assert.match(href, /^https:\/\/wa\.me\/50499990000\?text=/)
    assert.match(href, /San%20Pablo/)
  })

  it('reserva por el WhatsApp del directorio y nombra productos y local', () => {
    const carniceria = MERCADO_HOME_PREVIEW_VENDORS.find((vendor) => vendor.slug === 'carniceria-la-esquina')
    assert.ok(carniceria)
    const href = vendorReservationHref(carniceria)
    assert.match(href, new RegExp(`wa\\.me/${MERCADO_DIRECTORY_WHATSAPP}\\?text=`))
    assert.match(href, /Lomo/)
    assert.match(href, /local%202/)
  })
})
