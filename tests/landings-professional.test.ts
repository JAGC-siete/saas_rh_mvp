import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { LANDING_TEMPLATE_KEYS } from '../lib/landings/page-schema'
import {
  landingLocalBusinessJsonLd,
  landingSchemaTelephone,
  landingSchemaType,
} from '../lib/landings/jsonld'
import { brandedSeoTitle, LANDING_SEO_TITLE_MAX } from '../lib/landings/seo-title'
import { LANDING_STOCK } from '../lib/landings/stock'
import { applyBusinessToTemplate, templateContentFor } from '../lib/landings/templates'
import { heroLayoutClass, landingRadiusCss } from '../lib/landings/theme-css'
import type { PublicLandingPage } from '../types/landing'

const INSTRUCTIONAL = /edita esta|reemplaza esta|ajusta cada|ajusta a tu|escribe aquí tu/i

function kindsOf(key: Parameters<typeof templateContentFor>[0]) {
  return templateContentFor(key).blocks.map((block) => block.kind)
}

function asPage(
  key: Parameters<typeof templateContentFor>[0],
  business: { name: string; city?: string; phone?: string },
  noindex = false
): PublicLandingPage {
  const content = applyBusinessToTemplate(templateContentFor(key), {
    name: business.name,
    city: business.city,
    phone: business.phone,
    whatsapp: business.phone,
  }, { noindex })
  return {
    id: 'test',
    slug: 'clinica-norte',
    title: business.name,
    templateType: key,
    content,
  }
}

describe('landings: título SEO', () => {
  it('prioriza el nombre y no pasa de 70', () => {
    const title = brandedSeoTitle(
      'Clínica San José del Norte',
      'Consultas y citas con laboratorio el mismo día en la colonia'
    )
    assert.equal(title.startsWith('Clínica San José del Norte'), true)
    assert.ok(title.length <= LANDING_SEO_TITLE_MAX)
    assert.equal(title.includes('…') || title.length <= LANDING_SEO_TITLE_MAX, true)
  })

  it('si el nombre ya llena el cupo, no concatena la plantilla', () => {
    const name = 'A'.repeat(70)
    assert.equal(brandedSeoTitle(name, 'Copias e impresiones'), name)
  })
})

describe('landings: motor de layout y tema', () => {
  it('hero a 1 columna sin imagen y a 2 con imagen', () => {
    assert.equal(heroLayoutClass(undefined).includes('md:grid-cols-2'), false)
    assert.equal(heroLayoutClass(undefined).includes('text-center'), true)
    assert.equal(heroLayoutClass('/x.png').includes('md:grid-cols-2'), true)
    assert.equal(heroLayoutClass('/x.png').includes('text-left'), true)
  })

  it('radius sm|md|lg es longitud CSS, no el token crudo', () => {
    assert.equal(landingRadiusCss('sm'), '0.25rem')
    assert.equal(landingRadiusCss('lg'), '1rem')
  })
})

describe('landings: semillas profesionales', () => {
  it('validan y no publican instrucciones de editor', () => {
    for (const key of LANDING_TEMPLATE_KEYS) {
      const content = templateContentFor(key)
      assert.ok(content.meta.seoTitle.length <= 70)
      assert.ok(content.meta.seoDescription.length <= 180)
      const blob = JSON.stringify(content)
      assert.equal(INSTRUCTIONAL.test(blob), false, key)
    }
  })

  it('rompe el esqueleto A: ferretería, mercadito, súper y clínica no comparten árbol', () => {
    const ferreteria = kindsOf('ferreteria').join('>')
    const mercadito = kindsOf('mercadito').join('>')
    const superKinds = kindsOf('supermercado').join('>')
    const clinica = kindsOf('clinica').join('>')
    assert.equal(ferreteria === mercadito, false)
    assert.equal(mercadito === superKinds, false)
    assert.equal(superKinds === clinica, false)
    assert.equal(ferreteria === clinica, false)
  })

  it('ferretería: sin foto de hero, catálogo, crédito y CTA maps', () => {
    const content = templateContentFor('ferreteria')
    const hero = content.blocks.find((block) => block.kind === 'hero')
    assert.equal(hero && hero.kind === 'hero' ? hero.imageUrl : 'missing', undefined)
    assert.equal(content.blocks.some((block) => block.kind === 'text'), true)
    assert.equal(content.blocks.some((block) => block.kind === 'cta' && block.primaryCta.action === 'maps'), true)
    assert.ok((content.blocks.find((block) => block.kind === 'items') as { items: unknown[] } | undefined)?.items.length >= 6)
  })

  it('clínica: foto, galería, testimonios, FAQ y CTA WhatsApp', () => {
    const content = templateContentFor('clinica')
    const hero = content.blocks.find((block) => block.kind === 'hero')
    assert.equal(hero && hero.kind === 'hero' ? hero.imageUrl : undefined, LANDING_STOCK.clinicaHero)
    assert.equal(content.blocks.some((block) => block.kind === 'gallery'), true)
    assert.equal(content.blocks.some((block) => block.kind === 'testimonials'), true)
    assert.equal(content.blocks.some((block) => block.kind === 'faq'), true)
    const cierre = content.blocks.find((block) => block.kind === 'cta')
    assert.equal(cierre && cierre.kind === 'cta' ? cierre.primaryCta.action : undefined, 'whatsapp')
  })

  it('súper trae foto y galería; mercadito no', () => {
    const superContent = templateContentFor('supermercado')
    const superHero = superContent.blocks.find((block) => block.kind === 'hero')
    const miniHero = templateContentFor('mercadito').blocks.find((block) => block.kind === 'hero')
    assert.equal(superHero && superHero.kind === 'hero' ? Boolean(superHero.imageUrl) : false, true)
    assert.equal(superContent.blocks.some((block) => block.kind === 'gallery'), true)
    assert.equal(miniHero && miniHero.kind === 'hero' ? miniHero.imageUrl : 'x', undefined)
  })

  it('al aplicar nombre, el título SEO cabe y el og hereda la foto', () => {
    const branded = applyBusinessToTemplate(templateContentFor('clinica'), {
      name: 'Clínica Norte',
      city: 'Tegucigalpa',
    })
    assert.equal(branded.meta.seoTitle.startsWith('Clínica Norte'), true)
    assert.ok(branded.meta.seoTitle.length <= 70)
    assert.equal(branded.meta.ogImageUrl, LANDING_STOCK.clinicaHero)
  })
})

describe('landings: JSON-LD LocalBusiness', () => {
  it('omite maquetas noindex', () => {
    const page = asPage('clinica', { name: 'Clínica Norte', phone: '32226773' }, true)
    assert.equal(landingLocalBusinessJsonLd(page), null)
  })

  it('marca clínica como MedicalClinic con teléfono HN', () => {
    const page = asPage('clinica', { name: 'Clínica Norte', city: 'SPS', phone: '3222-6773' })
    const jsonLd = landingLocalBusinessJsonLd(page)
    assert.ok(jsonLd)
    assert.equal(jsonLd['@type'], 'MedicalClinic')
    assert.equal(jsonLd.name, 'Clínica Norte')
    assert.equal(jsonLd.telephone, '+50432226773')
    assert.equal(landingSchemaType('ferreteria'), 'HardwareStore')
    assert.equal(landingSchemaType('mercadito'), 'GroceryStore')
    assert.equal(landingSchemaType('barberia'), 'HairSalon')
    assert.equal(landingSchemaTelephone('9999-0000'), '+50499990000')
  })
})
