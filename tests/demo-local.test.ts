import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEMO_LOCAL_ADMIN_API_PATH,
  DEMO_LOCAL_ADMIN_PATH,
  DEMO_LOCAL_API_PATH,
  DEMO_LOCAL_CATALOGS,
  DEMO_LOCAL_COPY,
  DEMO_LOCAL_LEGACY_PATH,
  DEMO_LOCAL_MARKETING_SOURCE,
  DEMO_LOCAL_PUBLIC_PATH,
  WEBYCITAS_FORM_RUBROS,
  WEBYCITAS_LEAD_SOURCE,
  WEBYCITAS_LEADS_TABLE,
  WEBYCITAS_RETAIL_RUBROS,
  buildDemoLocalInternalEmail,
  buildDemoLocalOwnerEmail,
  catalogForRubro,
  formatDemoLocalServices,
  looksLikeDemoLocalBot,
  parseDemoLocalLead,
} from '../lib/marketing/demo-local'
import { getMarketingLanding } from '../lib/marketing/marketing-landings-registry'
import { isPublicMarketingRoute, isPublicToolRoute } from '../lib/seo/public-ssr-routes'
import { MIDDLEWARE_CONFIG, getAllPublicRoutes } from '../middleware.config'
import { GUIDE_LINKS, FOOTER_GUIDE_KEYS } from '../lib/seo/internal-links'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const validLead = {
  ownerName: 'María López',
  businessName: 'Barbería El Corte',
  email: 'maria@example.com',
  phone: '3222-6773',
  rubro: 'barberia' as const,
  city: 'Tegucigalpa',
  services: ['landing'] as const,
  consent: true,
}

describe('demo-local landing', () => {
  it('expone la ruta pública en el shell de landings SEO', () => {
    assert.equal(DEMO_LOCAL_PUBLIC_PATH, '/webycitas')
    assert.equal(DEMO_LOCAL_LEGACY_PATH, '/demo-local')
    assert.equal(DEMO_LOCAL_API_PATH, '/api/public/send-demo-local-lead')
    assert.equal(isPublicMarketingRoute('/webycitas'), true)
    assert.equal(isPublicMarketingRoute('/en/webycitas'), true)
    assert.equal(isPublicMarketingRoute('/demo-local'), true)
    assert.equal(isPublicToolRoute('/webycitas'), false)
    assert.ok(MIDDLEWARE_CONFIG.protection.public.includes('/webycitas'))
    assert.ok(MIDDLEWARE_CONFIG.protection.public.includes('/demo-local'))
    assert.ok(getAllPublicRoutes().includes('/api/public/send-demo-local-lead'))
    assert.equal(DEMO_LOCAL_ADMIN_PATH, '/app/admin/webycitas')
    assert.equal(DEMO_LOCAL_ADMIN_API_PATH, '/api/admin/webycitas/leads')
    assert.equal(WEBYCITAS_LEADS_TABLE, 'webycitas_leads')
    assert.equal(WEBYCITAS_LEAD_SOURCE, 'webycitas')
  })

  it('está en registry, footer SEO y source de marketing', () => {
    const entry = getMarketingLanding('/webycitas')
    assert.equal(entry?.pageFile, 'pages/webycitas/index.tsx')
    assert.deepEqual(entry?.aliases, ['/demo-local'])
    assert.equal(getMarketingLanding('/demo-local')?.path, '/webycitas')
    assert.equal(entry?.kind, 'lead-magnet')
    assert.equal(GUIDE_LINKS.demoLocal.href, '/webycitas')
    assert.ok(FOOTER_GUIDE_KEYS.includes('demoLocal'))
    assert.equal(DEMO_LOCAL_MARKETING_SOURCE, 'demo-local')
  })

  it('vende transformación (clientes y tiempo) y no un inventario de fierros', () => {
    const blob = JSON.stringify(DEMO_LOCAL_COPY)
    assert.equal(blob.includes('Tecnología de Recursos Humanos'), false)
    assert.equal(blob.includes('Quiero mi página y Maps'), false)
    assert.equal(blob.includes('Pedir que armen mi página'), false)
    assert.equal(blob.includes('Tu comercio local en Internet hoy'), false)
    assert.equal(blob.includes('Cómo lo hacemos'), false)
    assert.equal(blob.includes('software de planilla'), false)
    assert.equal(DEMO_LOCAL_COPY.hero.ctaPrimary, 'Probar gratis')
    assert.equal(DEMO_LOCAL_COPY.form.submit, 'Activar')
    assert.equal(DEMO_LOCAL_COPY.offer.cta, 'Activar')
    assert.match(DEMO_LOCAL_COPY.hero.headline, /clientes/)
    assert.match(DEMO_LOCAL_COPY.hero.subheadlineFeatures, /Google Maps/)
    assert.equal(DEMO_LOCAL_COPY.problem.items.length, 3)
    assert.match(DEMO_LOCAL_COPY.problem.items[0].body, /no apareces/)
    assert.match(DEMO_LOCAL_COPY.problem.title, /más clientes/)
    assert.match(DEMO_LOCAL_COPY.problem.items[1].title, /sistema de reservas/)
    assert.match(DEMO_LOCAL_COPY.problem.items[2].title, /WhatsApp/)
    assert.match(DEMO_LOCAL_COPY.offer.title, /nuevos clientes/)
    assert.equal(DEMO_LOCAL_COPY.offer.steps.length, 3)
    assert.match(DEMO_LOCAL_COPY.offer.steps[2].title, /Google Maps/)
    assert.equal(DEMO_LOCAL_COPY.offer.steps[2].badge, 'Incluido · gratis con tu página o tus reservas')
    assert.equal(DEMO_LOCAL_COPY.form.title, 'Solicitud de servicio')
    assert.match(DEMO_LOCAL_COPY.form.services.hint, /Google Maps/)
    assert.match(DEMO_LOCAL_COPY.form.services.error, /página web/)
    assert.match(DEMO_LOCAL_COPY.seo.title, /Google Maps/)
    assert.equal(blob.includes('Antes perdía 2 horas'), false)
    assert.equal(blob.includes('Solo trabajamos con un negocio por rubro'), false)
    assert.equal(blob.includes('Valor: $'), false)
  })

  it('cambia el catálogo modular por rubro', () => {
    assert.deepEqual([...WEBYCITAS_FORM_RUBROS], [
      'mercadito',
      'papeleria',
      'supermercado',
      'ferreteria',
      'spa',
      'clinica',
      'barberia',
      'salon',
    ])
    assert.equal(catalogForRubro('ferreteria').shopName, DEMO_LOCAL_CATALOGS.ferreteria.shopName)
    assert.equal(catalogForRubro('no-existe').id, 'barberia')
    assert.ok(catalogForRubro('papeleria').items.length >= 3)
    assert.ok(catalogForRubro('cafeteria').items.length >= 3)
  })

  it('valida el lead con Zod y normaliza el correo', () => {
    const ok = parseDemoLocalLead(validLead)
    assert.equal(ok.success, true)
    if (ok.success) {
      assert.equal(ok.data.email, 'maria@example.com')
      assert.deepEqual(ok.data.services, ['landing'])
    }

    const both = parseDemoLocalLead({ ...validLead, services: ['landing', 'booking'] })
    assert.equal(both.success, true)
    if (both.success) {
      assert.equal(formatDemoLocalServices(both.data.services), 'Página web + Reservas / citas · Google Maps incluido')
    }

    const bookingOnly = parseDemoLocalLead({ ...validLead, services: ['booking'] })
    assert.equal(bookingOnly.success, true)
    if (bookingOnly.success) {
      assert.deepEqual(bookingOnly.data.services, ['booking'])
    }

    const retailBooking = parseDemoLocalLead({
      ...validLead,
      rubro: 'ferreteria',
      services: ['landing', 'booking'],
    })
    assert.equal(retailBooking.success, true)
    if (retailBooking.success) {
      assert.deepEqual(retailBooking.data.services, ['landing'])
    }

    for (const rubro of WEBYCITAS_RETAIL_RUBROS) {
      const parsed = parseDemoLocalLead({ ...validLead, rubro, services: ['booking'] })
      assert.equal(parsed.success, true)
      if (parsed.success) assert.deepEqual(parsed.data.services, ['landing'])
    }

    const missingServices = parseDemoLocalLead({ ...validLead, services: undefined })
    assert.equal(missingServices.success, false)

    const emptyServices = parseDemoLocalLead({ ...validLead, services: [] })
    assert.equal(emptyServices.success, false)

    const cased = parseDemoLocalLead({ ...validLead, email: 'Maria.Lopez@Example.COM' })
    assert.equal(cased.success, true)
    if (cased.success) {
      assert.equal(cased.data.email, 'maria.lopez@example.com')
    }

    const missingConsent = parseDemoLocalLead({ ...validLead, consent: false })
    assert.equal(missingConsent.success, false)

    const badEmail = parseDemoLocalLead({ ...validLead, email: 'no-es-correo' })
    assert.equal(badEmail.success, false)

    const badRubro = parseDemoLocalLead({ ...validLead, rubro: 'nomina' })
    assert.equal(badRubro.success, false)

    const legacyRubro = parseDemoLocalLead({ ...validLead, rubro: 'cafeteria' })
    assert.equal(legacyRubro.success, false)
  })

  it('un honeypot lleno parece bot y uno vacío no', () => {
    const clean = parseDemoLocalLead(validLead)
    assert.equal(clean.success, true)
    if (clean.success) assert.equal(looksLikeDemoLocalBot(clean.data), false)

    const bot = parseDemoLocalLead({ ...validLead, website: 'http://spam.example' })
    assert.equal(bot.success, true)
    if (bot.success) assert.equal(looksLikeDemoLocalBot(bot.data), true)
  })

  it('el POST público no escribe calculadoras ni enrolla planilla', () => {
    const handler = readFileSync(join(process.cwd(), 'pages/api/public/send-demo-local-lead.ts'), 'utf8')
    assert.equal(handler.includes('leads_public_tools'), false)
    assert.equal(handler.includes('enrollPublicToolLead'), false)
    assert.equal(handler.includes('marketing_leads'), false)
    assert.match(handler, /WEBYCITAS_LEADS_TABLE/)
    assert.match(handler, /PUBLIC_LANDING_LEAD/)
    assert.match(handler, /publishWebycitasPreview/)
  })

  it('arma correos sin interpolar HTML del dueño', () => {
    const parsed = parseDemoLocalLead({
      ...validLead,
      ownerName: '<script>alert(1)</script>',
      businessName: 'Ferretería & Hijos',
      note: 'Vendo clavos',
      services: ['booking'],
    })
    assert.equal(parsed.success, true)
    if (!parsed.success) return

    const owner = buildDemoLocalOwnerEmail(parsed.data)
    const live = buildDemoLocalOwnerEmail(parsed.data, {
      publicUrl: 'https://humanosisu.net/p/ferreteria-hijos-4f8a',
    })
    const internal = buildDemoLocalInternalEmail(parsed.data, new Date('2026-09-14T18:00:00.000Z'))
    assert.equal(owner.html.includes('<script>alert(1)</script>'), false)
    assert.equal(owner.html.includes('Instagram'), false)
    assert.equal(owner.html.includes('dominio tuyo'), true)
    assert.match(owner.html, /\/webycitas/)
    assert.match(live.html, /\/p\/ferreteria-hijos-4f8a/)
    assert.match(live.html, /ya está en Internet/)
    assert.equal(internal.subject.includes('Ferretería & Hijos'), true)
    assert.match(internal.subject, /webycitas/)
    assert.match(internal.html, /\/webycitas/)
    assert.match(internal.html, /\/app\/admin\/webycitas/)
    assert.equal(internal.html.includes('Vendo clavos'), true)
    assert.match(internal.html, /Reservas \/ citas/)
    assert.match(internal.html, /Google Maps incluido/)
  })
})
