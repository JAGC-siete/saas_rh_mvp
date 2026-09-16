import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseCreateLanding } from '../lib/landings/admin-schema'
import { parseLandingIdParam } from '../lib/landings/admin-auth'
import { LANDING_STUDIO_COMPANY_ID } from '../lib/landings/studio-company'
import { applyBusinessToTemplate, templateContentFor } from '../lib/landings/templates'

describe('landings: alta de ejemplo sin empresa de sesión', () => {
  it('acepta solo nombre, slug y rubro', () => {
    const parsed = parseCreateLanding({
      title: 'Barbería El Corte',
      slug: 'barberia-el-corte',
      templateType: 'barberia',
    })
    assert.equal(parsed.success, true)
  })

  it('omite ciudad, teléfono y correo vacíos', () => {
    const parsed = parseCreateLanding({
      title: 'Papelería Central',
      slug: 'papeleria-central',
      templateType: 'papeleria',
      city: '  ',
      address: '',
      phone: '',
      whatsapp: '',
      email: '  ',
    })
    assert.equal(parsed.success, true)
    if (parsed.success) {
      assert.equal(parsed.data.city, undefined)
      assert.equal(parsed.data.email, undefined)
    }
  })

  it('guarda los datos básicos del negocio cuando vienen llenos', () => {
    const parsed = parseCreateLanding({
      title: 'Salón Luna',
      slug: 'salon-luna-sps',
      templateType: 'salon_belleza',
      city: 'San Pedro Sula',
      address: '2 calle, local 4',
      phone: '2550-1234',
      whatsapp: '9999-0000',
      email: 'Hola@SalonLuna.hn',
    })
    assert.equal(parsed.success, true)
    if (parsed.success) {
      assert.equal(parsed.data.city, 'San Pedro Sula')
      assert.equal(parsed.data.email, 'hola@salonluna.hn')
    }
  })

  it('rechaza un teléfono de visita incompleto', () => {
    const parsed = parseCreateLanding({
      title: 'Comercial Reyes',
      slug: 'comercial-reyes',
      templateType: 'comercial',
      phone: '12',
    })
    assert.equal(parsed.success, false)
  })
})

describe('landings: plantilla con datos de visita', () => {
  it('copia nombre, ciudad, WhatsApp y mapsQuery', () => {
    const content = applyBusinessToTemplate(templateContentFor('barberia'), {
      name: 'El Corte',
      city: 'Comayagua',
      address: 'Parque central',
      whatsapp: '9999-1111',
    })
    assert.equal(content.business.name, 'El Corte')
    assert.equal(content.business.city, 'Comayagua')
    assert.equal(content.business.whatsapp, '9999-1111')
    assert.equal(content.business.mapsQuery, 'Parque central, Comayagua')
  })
})

describe('landings: id de ruta', () => {
  it('acepta un UUID y rechaza basura', () => {
    const ok = parseLandingIdParam({
      query: { id: '6f3f0a4e-6c3f-4a1b-9c2e-2f0c1d8e7a55' },
    } as never)
    const bad = parseLandingIdParam({ query: { id: 'no-uuid' } } as never)
    assert.equal(ok, '6f3f0a4e-6c3f-4a1b-9c2e-2f0c1d8e7a55')
    assert.equal(bad, null)
  })
})

describe('landings: contenedor de superadmin', () => {
  it('usa un UUID estable para la empresa estudio', () => {
    assert.match(LANDING_STUDIO_COMPANY_ID, /^[0-9a-f-]{36}$/i)
  })
})
