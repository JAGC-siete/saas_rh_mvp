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
  it('mapea rubro de form a plantilla existente', () => {
    assert.equal(templateKeyForRubro('barberia'), 'barberia')
    assert.equal(templateKeyForRubro('salon'), 'salon_belleza')
    assert.equal(templateKeyForRubro('spa'), 'salon_belleza')
    assert.equal(templateKeyForRubro('ferreteria'), 'ferreteria')
    assert.equal(templateKeyForRubro('cafeteria'), 'comercial')
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
