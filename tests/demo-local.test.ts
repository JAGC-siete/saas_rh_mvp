import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEMO_LOCAL_API_PATH,
  DEMO_LOCAL_CATALOGS,
  DEMO_LOCAL_COPY,
  DEMO_LOCAL_MARKETING_SOURCE,
  DEMO_LOCAL_PUBLIC_PATH,
  DEMO_LOCAL_RUBROS,
  buildDemoLocalInternalEmail,
  buildDemoLocalOwnerEmail,
  catalogForRubro,
  parseDemoLocalLead,
} from '../lib/marketing/demo-local'
import { getMarketingLanding } from '../lib/marketing/marketing-landings-registry'
import { isPublicMarketingRoute, isPublicToolRoute } from '../lib/seo/public-ssr-routes'
import { MIDDLEWARE_CONFIG, getAllPublicRoutes } from '../middleware.config'
import { GUIDE_LINKS, FOOTER_GUIDE_KEYS } from '../lib/seo/internal-links'

const validLead = {
  ownerName: 'María López',
  businessName: 'Barbería El Corte',
  email: 'maria@example.com',
  phone: '3222-6773',
  rubro: 'barberia' as const,
  city: 'Tegucigalpa',
  consent: true,
}

describe('demo-local landing', () => {
  it('expone la ruta pública en el shell de landings SEO', () => {
    assert.equal(DEMO_LOCAL_PUBLIC_PATH, '/demo-local')
    assert.equal(DEMO_LOCAL_API_PATH, '/api/public/send-demo-local-lead')
    assert.equal(isPublicMarketingRoute('/demo-local'), true)
    assert.equal(isPublicMarketingRoute('/en/demo-local'), true)
    assert.equal(isPublicToolRoute('/demo-local'), false)
    assert.ok(MIDDLEWARE_CONFIG.protection.public.includes('/demo-local'))
    assert.ok(getAllPublicRoutes().includes('/api/public/send-demo-local-lead'))
  })

  it('está en registry, footer SEO y source de marketing', () => {
    const entry = getMarketingLanding('/demo-local')
    assert.equal(entry?.pageFile, 'pages/demo-local/index.tsx')
    assert.equal(entry?.kind, 'lead-magnet')
    assert.equal(GUIDE_LINKS.demoLocal.href, '/demo-local')
    assert.ok(FOOTER_GUIDE_KEYS.includes('demoLocal'))
    assert.equal(DEMO_LOCAL_MARKETING_SOURCE, 'demo-local')
  })

  it('vende servicio (qué, cómo, cuánto) y no se presenta como planilla', () => {
    const blob = JSON.stringify(DEMO_LOCAL_COPY)
    assert.equal(blob.includes('Tecnología de Recursos Humanos'), false)
    assert.equal(blob.includes('Solicitar mi página'), false)
    assert.equal(blob.includes('preguntar en la esquina'), false)
    assert.equal(blob.includes('software de planilla'), false)
    assert.equal(blob.includes('Humano SISU trabaja con MIPYMES'), false)
    assert.equal(blob.includes('Ejemplo de cómo se lee el local'), false)
    assert.equal(blob.includes('No es una plantilla para que la armes vos'), false)
    assert.equal(blob.includes('Así se ve el catálogo en la página'), false)
    assert.equal(DEMO_LOCAL_COPY.hero.ctaPrimary, 'Quiero mi página y Maps')
    assert.equal(DEMO_LOCAL_COPY.form.submit, 'Pedir que armen mi página')
    assert.match(DEMO_LOCAL_COPY.hero.headline, /reservas/i)
    assert.match(DEMO_LOCAL_COPY.hero.subheadline, /servicios o menú/)
    assert.equal(blob.includes('tu lista y tu WhatsApp'), false)
    assert.equal(DEMO_LOCAL_COPY.offer.steps[0].title, 'Tu página y sistema de reservas')
    assert.match(DEMO_LOCAL_COPY.offer.steps[0].body, /agendar una cita/)
    assert.match(DEMO_LOCAL_COPY.hero.mapsBenefit, /reservar en el momento/)
    assert.match(DEMO_LOCAL_COPY.form.bookingLabel, /reservas\/citas/)
    assert.match(DEMO_LOCAL_COPY.offer.steps[2].body, /precio/i)
    assert.match(DEMO_LOCAL_COPY.seo.title, /Google Maps/)
  })

  it('cambia el catálogo modular por rubro', () => {
    assert.deepEqual([...DEMO_LOCAL_RUBROS], [
      'barberia',
      'ferreteria',
      'cafeteria',
      'mercadito',
      'escuela',
      'otro',
    ])
    assert.equal(catalogForRubro('ferreteria').shopName, DEMO_LOCAL_CATALOGS.ferreteria.shopName)
    assert.equal(catalogForRubro('no-existe').id, 'barberia')
    assert.ok(catalogForRubro('cafeteria').items.length >= 3)
  })

  it('valida el lead con Zod y normaliza el correo', () => {
    const ok = parseDemoLocalLead(validLead)
    assert.equal(ok.success, true)
    if (ok.success) {
      assert.equal(ok.data.email, 'maria@example.com')
      assert.equal(ok.data.wantsBooking, false)
    }

    const withBooking = parseDemoLocalLead({ ...validLead, wantsBooking: true })
    assert.equal(withBooking.success, true)
    if (withBooking.success) {
      assert.equal(withBooking.data.wantsBooking, true)
    }

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
  })

  it('arma correos sin interpolar HTML del dueño', () => {
    const parsed = parseDemoLocalLead({
      ...validLead,
      ownerName: '<script>alert(1)</script>',
      businessName: 'Ferretería & Hijos',
      note: 'Vendo clavos',
      wantsBooking: true,
    })
    assert.equal(parsed.success, true)
    if (!parsed.success) return

    const owner = buildDemoLocalOwnerEmail(parsed.data)
    const internal = buildDemoLocalInternalEmail(parsed.data, new Date('2026-09-14T18:00:00.000Z'))
    assert.equal(owner.html.includes('<script>alert(1)</script>'), false)
    assert.equal(owner.html.includes('Instagram'), false)
    assert.equal(owner.html.includes('dominio tuyo'), true)
    assert.equal(internal.subject.includes('Ferretería & Hijos'), true)
    assert.equal(internal.html.includes('Vendo clavos'), true)
    assert.match(internal.html, />Sí</)
  })
})
