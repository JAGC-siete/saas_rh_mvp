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
import { retailAreasMatching, retailSearchHints } from '../lib/landings/retail-visit'
import {
  collectServiceOptions,
  groupServiceItems,
  isServiceBookingContent,
} from '../lib/landings/service-booking'
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

  it('retail comparte el árbol de visita de mercadosanpablosiguav2; servicios no', () => {
    const papeleria = kindsOf('papeleria').join('>')
    const ferreteria = kindsOf('ferreteria').join('>')
    const mercadito = kindsOf('mercadito').join('>')
    const superKinds = kindsOf('supermercado').join('>')
    const clinica = kindsOf('clinica').join('>')
    const visitTree = 'hero>visit>hours>benefits>areas'
    assert.equal(papeleria, visitTree)
    assert.equal(ferreteria, visitTree)
    assert.equal(mercadito, visitTree)
    assert.equal(superKinds, visitTree)
    assert.equal(clinica === visitTree, false)
    assert.equal(kindsOf('barberia').includes('visit'), false)
  })

  it('ferretería: portada de visita, mapa y áreas, sin formulario', () => {
    const content = templateContentFor('ferreteria')
    const hero = content.blocks.find((block) => block.kind === 'hero')
    assert.equal(hero && hero.kind === 'hero' ? hero.layout : undefined, 'visit')
    assert.equal(hero && hero.kind === 'hero' ? hero.primaryCta.action : undefined, 'maps')
    assert.equal(content.blocks.some((block) => block.kind === 'leadForm'), false)
    assert.equal(content.blocks.some((block) => block.kind === 'areas'), true)
    const blob = JSON.stringify(content)
    assert.equal(/whatsapp|wa\.me/i.test(blob), false)
  })

  it('clínica: foto, galería, testimonios, FAQ y motor de reserva', () => {
    const content = templateContentFor('clinica')
    const hero = content.blocks.find((block) => block.kind === 'hero')
    assert.equal(hero && hero.kind === 'hero' ? hero.imageUrl : undefined, LANDING_STOCK.clinicaHero)
    assert.equal(hero && hero.kind === 'hero' ? hero.layout : undefined, 'booking')
    assert.equal(content.blocks.some((block) => block.kind === 'gallery'), true)
    assert.equal(content.blocks.some((block) => block.kind === 'testimonials'), true)
    assert.equal(content.blocks.some((block) => block.kind === 'faq'), true)
    assert.equal(content.blocks.some((block) => block.kind === 'team'), true)
    const reserva = content.blocks.find((block) => block.kind === 'leadForm')
    assert.equal(reserva && reserva.kind === 'leadForm' ? reserva.layout : undefined, 'booking')
  })

  it('súper y mercadito traen foto de recinto; papelería no depende de galería', () => {
    const superContent = templateContentFor('supermercado')
    const superHero = superContent.blocks.find((block) => block.kind === 'hero')
    const miniHero = templateContentFor('mercadito').blocks.find((block) => block.kind === 'hero')
    const paperHero = templateContentFor('papeleria').blocks.find((block) => block.kind === 'hero')
    assert.equal(superHero && superHero.kind === 'hero' ? Boolean(superHero.imageUrl) : false, true)
    assert.equal(miniHero && miniHero.kind === 'hero' ? Boolean(miniHero.imageUrl) : false, true)
    assert.equal(paperHero && paperHero.kind === 'hero' ? paperHero.layout : undefined, 'visit')
    assert.equal(superContent.blocks.some((block) => block.kind === 'areas'), true)
    assert.equal(superContent.blocks.some((block) => block.kind === 'gallery'), false)
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
    assert.equal(landingSchemaType('spa'), 'DaySpa')
    assert.equal(landingSchemaTelephone('9999-0000'), '+50499990000')
    const superPage = asPage('supermercado', { name: 'Súper Norte', city: 'SPS', phone: '3222-6773' })
    const superLd = landingLocalBusinessJsonLd(superPage)
    assert.ok(Array.isArray(superLd?.containsPlace))
    assert.ok((superLd?.containsPlace as unknown[]).length >= 3)
  })
})

describe('landings: búsqueda de áreas retail', () => {
  it('filtra por needles y cae al título si no hay match exacto', () => {
    const areas = templateContentFor('supermercado').blocks.find((block) => block.kind === 'areas')
    assert.equal(areas?.kind, 'areas')
    if (!areas || areas.kind !== 'areas') return
    assert.deepEqual(
      retailAreasMatching(areas.items, 'carne').map((item) => item.id),
      ['carniceria']
    )
    assert.deepEqual(
      retailSearchHints(areas.items, 'tomate').map((hint) => hint.areaId),
      ['frutas-verduras']
    )
    assert.equal(retailAreasMatching(areas.items, 'góndola')[0]?.id, 'abarrotes')
  })
})

describe('landings: semillas de reserva (service)', () => {
  const SERVICE_KEYS = ['barberia', 'salon_belleza', 'spa', 'clinica'] as const

  it('disparan el renderer de reserva: hero booking, menú con precio, equipo, FAQ y form 3 pasos', () => {
    for (const key of SERVICE_KEYS) {
      const content = templateContentFor(key)
      const hero = content.blocks.find((block) => block.kind === 'hero')
      const reserva = content.blocks.find((block) => block.kind === 'leadForm')
      const items = content.blocks.filter((block) => block.kind === 'items')
      assert.equal(hero && hero.kind === 'hero' ? hero.layout : undefined, 'booking', key)
      assert.equal(hero && hero.kind === 'hero' ? hero.primaryCta.action : undefined, 'lead-form', key)
      assert.equal(reserva && reserva.kind === 'leadForm' ? reserva.layout : undefined, 'booking', key)
      assert.equal(content.blocks.some((block) => block.kind === 'team'), true, key)
      assert.equal(content.blocks.some((block) => block.kind === 'faq'), true, key)
      assert.equal(content.blocks.some((block) => block.kind === 'testimonials'), true, key)
      assert.ok(items.length >= 1, key)
      assert.equal(
        items.every((block) => block.kind === 'items' && block.items.every((item) => Boolean(item.priceLabel))),
        true,
        key
      )
    }
  })

  it('belleza es visual; salud explica la primera visita', () => {
    assert.equal(kindsOf('salon_belleza').includes('gallery'), true)
    assert.equal(kindsOf('spa').includes('gallery'), true)
    assert.equal(kindsOf('clinica').includes('benefits'), true)
    assert.equal(kindsOf('barberia').includes('benefits'), false)
    const spa = templateContentFor('spa')
    const clinica = templateContentFor('clinica')
    assert.notEqual(spa.theme.primary, clinica.theme.primary)
    assert.equal(spa.blocks.some((block) => block.kind === 'items' && block.id === 'paquetes'), true)
  })

  it('agrupa el menú por categoría', () => {
    const salon = templateContentFor('salon_belleza')
    assert.equal(isServiceBookingContent(salon), true)
    const groups = groupServiceItems(collectServiceOptions(salon))
    const labels = groups.map((group) => group.category)
    assert.equal(labels.includes('Uñas'), true)
    assert.equal(labels.includes('Cabello'), true)
    assert.equal(labels.includes('Paquetes'), true)
  })
})
