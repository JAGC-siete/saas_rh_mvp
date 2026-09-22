import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { LANDING_TEMPLATE_KEYS } from '../lib/landings/page-schema'
import { applyBusinessToTemplate, templateContentFor } from '../lib/landings/templates'
import { allocatePreviewSlug } from '../lib/marketing/webycitas-publish'
import {
  buildWebycitasPreviewContent,
  coerceServicesForRubro,
  templateKeyForRubro,
} from '../lib/marketing/webycitas-preview'

describe('webycitas preview bridge', () => {
  it('retail de form usa plantilla de visita, no catálogo de WhatsApp', () => {
    assert.equal(templateKeyForRubro('barberia'), 'barberia')
    assert.equal(templateKeyForRubro('salon'), 'salon_belleza')
    assert.equal(templateKeyForRubro('spa'), 'spa')
    assert.equal(templateKeyForRubro('ferreteria'), 'ferreteria')
    assert.equal(templateKeyForRubro('mercadito'), 'mercadito')
    assert.equal(templateKeyForRubro('papeleria'), 'papeleria')
    assert.equal(templateKeyForRubro('supermercado'), 'supermercado')
    assert.equal(templateKeyForRubro('cafeteria'), 'comercial')
    const ferreteria = templateContentFor('ferreteria')
    const hero = ferreteria.blocks.find((block) => block.kind === 'hero')
    assert.equal(hero && hero.kind === 'hero' ? hero.layout : undefined, 'visit')
    assert.equal(ferreteria.blocks.some((block) => block.kind === 'leadForm'), false)
  })

  it('spa publica plantilla propia de reserva, no salón', () => {
    const content = buildWebycitasPreviewContent({
      rubro: 'spa',
      businessName: 'Spa Luna',
      city: 'Tegucigalpa',
      phone: '3222-6773',
    })
    const hero = content.blocks.find((block) => block.kind === 'hero')
    assert.equal(templateKeyForRubro('spa'), 'spa')
    assert.equal(hero && hero.kind === 'hero' ? hero.layout : undefined, 'booking')
    assert.equal(content.blocks.some((block) => block.kind === 'team'), true)
    assert.equal(content.meta.noindex, true)
  })

  it('retail no admite booking', () => {
    assert.deepEqual(coerceServicesForRubro('mercadito', ['landing', 'booking']), ['landing'])
    assert.deepEqual(coerceServicesForRubro('barberia', ['booking']), ['booking'])
  })

  it('inyecta nombre y WhatsApp y marca noindex', () => {
    const content = buildWebycitasPreviewContent({
      rubro: 'ferreteria',
      businessName: 'El Clavo SPS',
      city: 'San Pedro Sula',
      phone: '3222-6773',
    })
    assert.equal(content.business.name, 'El Clavo SPS')
    assert.equal(content.business.whatsapp, '3222-6773')
    assert.equal(content.business.city, 'San Pedro Sula')
    assert.equal(content.meta.noindex, true)
    const hero = content.blocks.find((block) => block.kind === 'hero')
    assert.equal(hero && hero.kind === 'hero' ? hero.badge : undefined, 'San Pedro Sula')
    assert.equal(hero && hero.kind === 'hero' ? hero.layout : undefined, 'visit')
  })

  it('arma slug único con sufijo', () => {
    assert.equal(allocatePreviewSlug('Ferretería El Clavo', '4f8a'), 'ferreteria-el-clavo-4f8a')
    assert.equal(allocatePreviewSlug('??', 'ab12'), 'negocio-ab12')
  })

  it('las plantillas nuevas validan el contrato', () => {
    for (const key of LANDING_TEMPLATE_KEYS) {
      const content = templateContentFor(key)
      assert.equal(content.version, 1)
      assert.ok(content.blocks.length > 0)
    }
    const branded = applyBusinessToTemplate(templateContentFor('clinica'), { name: 'Clínica Norte' })
    assert.match(branded.business.name, /Clínica Norte/)
    assert.equal(branded.meta.seoTitle.startsWith('Clínica Norte'), true)
    assert.ok(branded.meta.seoTitle.length <= 70)
  })
})
