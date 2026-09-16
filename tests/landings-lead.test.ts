import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  LANDING_LEAD_MESSAGE_MAX,
  landingLeadFieldErrors,
  looksLikeBot,
  parseLandingLead,
} from '../lib/landings/lead-schema'
import { buildLandingLeadNotification } from '../lib/landings/lead-email'
import { LANDING_LEAD_API_PATH, landingAdminLeadsPath, landingPublicUrl } from '../lib/landings/paths'
import { landingLeadsToCsv } from '../lib/landings/leads-csv'
import { getAllPublicRoutes } from '../middleware.config'

const validLead = {
  slug: 'barberia-el-corte',
  blockId: 'reserva',
  fullName: 'María López',
  email: 'maria@example.com',
  phone: '3222-6773',
  message: 'Quiero turno el sábado por la mañana.',
  consent: true,
}

describe('landings: validación del lead público', () => {
  it('acepta un envío completo', () => {
    const parsed = parseLandingLead(validLead)
    assert.equal(parsed.success, true)
  })

  it('acepta solo teléfono, sin correo', () => {
    const { email, ...sinCorreo } = validLead
    void email
    const parsed = parseLandingLead(sinCorreo)
    assert.equal(parsed.success, true)
  })

  it('rechaza cuando no hay ni correo ni teléfono', () => {
    const { email, phone, ...sinContacto } = validLead
    void email
    void phone
    const parsed = parseLandingLead(sinContacto)
    assert.equal(parsed.success, false)
    if (!parsed.success) {
      assert.match(landingLeadFieldErrors(parsed.error).email ?? '', /correo o un teléfono/)
    }
  })

  it('rechaza sin consentimiento', () => {
    const parsed = parseLandingLead({ ...validLead, consent: false })
    assert.equal(parsed.success, false)
  })

  it('exige identificar la página con slug o landingId', () => {
    const { slug, ...sinPagina } = validLead
    void slug
    assert.equal(parseLandingLead(sinPagina).success, false)
    assert.equal(
      parseLandingLead({ ...sinPagina, landingId: '6f3f0a4e-6c3f-4a1b-9c2e-2f0c1d8e7a55' }).success,
      true
    )
  })

  it('rechaza un slug con formato inválido', () => {
    assert.equal(parseLandingLead({ ...validLead, slug: 'Barbería El Corte' }).success, false)
  })

  it('corta mensajes más largos que el máximo', () => {
    const parsed = parseLandingLead({ ...validLead, message: 'x'.repeat(LANDING_LEAD_MESSAGE_MAX + 1) })
    assert.equal(parsed.success, false)
  })

  it('normaliza el correo a minúsculas', () => {
    const parsed = parseLandingLead({ ...validLead, email: 'MARIA@Example.COM' })
    assert.equal(parsed.success, true)
    if (parsed.success) assert.equal(parsed.data.email, 'maria@example.com')
  })
})

describe('landings: honeypot', () => {
  it('un envío sin el campo oculto no parece bot', () => {
    const parsed = parseLandingLead(validLead)
    assert.equal(parsed.success, true)
    if (parsed.success) assert.equal(looksLikeBot(parsed.data), false)
  })

  it('un envío con el campo oculto lleno parece bot', () => {
    const parsed = parseLandingLead({ ...validLead, website: 'http://spam.example' })
    assert.equal(parsed.success, true)
    if (parsed.success) assert.equal(looksLikeBot(parsed.data), true)
  })

  it('un campo oculto vacío o con espacios no parece bot', () => {
    const parsed = parseLandingLead({ ...validLead, website: '   ' })
    assert.equal(parsed.success, true)
    if (parsed.success) assert.equal(looksLikeBot(parsed.data), false)
  })
})

describe('landings: correo de aviso', () => {
  it('incluye los datos del interesado y responde al lead', () => {
    const parsed = parseLandingLead(validLead)
    assert.equal(parsed.success, true)
    if (!parsed.success) return

    const mail = buildLandingLeadNotification({
      lead: parsed.data,
      landingTitle: 'Barbería El Corte',
      slug: 'barberia-el-corte',
      receivedAt: new Date('2026-09-16T15:30:00.000Z'),
    })

    assert.match(mail.subject, /Nuevo lead/)
    assert.match(mail.subject, /María López/)
    assert.ok(mail.html.includes('María López'))
    assert.ok(mail.html.includes('maria@example.com'))
    assert.ok(mail.html.includes(landingPublicUrl('barberia-el-corte')))
    assert.equal(mail.replyTo, 'maria@example.com')
  })

  it('no rompe cuando el lead solo dejó teléfono', () => {
    const { email, ...sinCorreo } = validLead
    void email
    const parsed = parseLandingLead(sinCorreo)
    assert.equal(parsed.success, true)
    if (!parsed.success) return

    const mail = buildLandingLeadNotification({
      lead: parsed.data,
      landingTitle: 'Barbería El Corte',
      slug: 'barberia-el-corte',
      receivedAt: new Date('2026-09-16T15:30:00.000Z'),
    })

    assert.equal(mail.replyTo, undefined)
    assert.ok(mail.html.includes('3222-6773'))
  })
})

describe('landings: inventario de rutas públicas', () => {
  it('el endpoint de leads está declarado como público', () => {
    assert.ok(getAllPublicRoutes().includes(LANDING_LEAD_API_PATH))
  })

  it('las landings publicadas están declaradas como públicas', () => {
    assert.ok(getAllPublicRoutes().includes('/p/*'))
  })
})

describe('landings: bandeja y CSV', () => {
  it('la ruta de bandeja cuelga del id de la landing', () => {
    assert.equal(
      landingAdminLeadsPath('6f3f0a4e-6c3f-4a1b-9c2e-2f0c1d8e7a55'),
      '/app/landings/6f3f0a4e-6c3f-4a1b-9c2e-2f0c1d8e7a55/leads'
    )
  })

  it('escapa comillas, comas y saltos de línea', () => {
    const csv = landingLeadsToCsv([
      {
        created_at: '2026-09-16T16:00:00.000Z',
        full_name: 'María "La Barbera" López',
        email: 'maria@example.com',
        phone: '3222-6773',
        message: 'Quiero turno,\npor la mañana.',
      },
    ])

    assert.match(csv, /^Fecha,Nombre,Correo,Teléfono,Mensaje\r\n/)
    assert.match(csv, /"María ""La Barbera"" López"/)
    assert.match(csv, /"Quiero turno,\npor la mañana\."/)
    assert.match(csv, /maria@example.com/)
  })

  it('deja celdas vacías cuando no hay correo, teléfono o mensaje', () => {
    const csv = landingLeadsToCsv([
      {
        created_at: '2026-09-16T16:00:00.000Z',
        full_name: 'Sin contacto extra',
        email: null,
        phone: null,
        message: null,
      },
    ])
    const dataLine = csv.split('\r\n')[1]
    assert.ok(dataLine.endsWith(',,,'))
  })
})
