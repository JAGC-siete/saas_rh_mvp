import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildBulkManualWelcomeText,
  buildWelcomeText,
  isMoreSpecificSource,
  normalizeLeadSource,
  SEQUENCE_CONTENT,
  SEQUENCE_STEP,
  WELCOME_BODY_AFTER_GREETING,
  WELCOME_GREETINGS,
} from '../lib/marketing/email-sequence-ledger'

describe('marketing welcome greetings by source', () => {
  it('normalizeLeadSource maps API and backfill source strings', () => {
    assert.equal(normalizeLeadSource('suscripcion-page'), 'suscripcion')
    assert.equal(normalizeLeadSource('landing'), 'suscripcion')
    assert.equal(normalizeLeadSource('web-subscription'), 'suscripcion')
    assert.equal(normalizeLeadSource('ventas'), 'ventas')
    assert.equal(normalizeLeadSource('ventas:backfill'), 'ventas')
    assert.equal(normalizeLeadSource('activar'), 'activar')
    assert.equal(normalizeLeadSource('activaciones:trial_pending_data'), 'activar')
    assert.equal(normalizeLeadSource(undefined), 'suscripcion')
  })

  it('buildWelcomeText uses source-specific first line only', () => {
    const ventas = buildWelcomeText('ventas')
    assert.ok(ventas.startsWith(WELCOME_GREETINGS.ventas))
    assert.ok(ventas.includes(WELCOME_BODY_AFTER_GREETING))

    const activar = buildWelcomeText('activar')
    assert.ok(activar.startsWith(WELCOME_GREETINGS.activar))
    assert.ok(activar.includes(WELCOME_BODY_AFTER_GREETING))

    const subs = buildWelcomeText('suscripcion-page')
    assert.ok(subs.startsWith(WELCOME_GREETINGS.suscripcion))
    assert.ok(subs.includes(WELCOME_BODY_AFTER_GREETING))
  })

  it('welcome body after greeting is identical across sources', () => {
    const ventasBody = buildWelcomeText('ventas').split('\n\n').slice(1).join('\n\n')
    const activarBody = buildWelcomeText('activar').split('\n\n').slice(1).join('\n\n')
    const subsBody = buildWelcomeText('suscripcion-page').split('\n\n').slice(1).join('\n\n')

    assert.equal(ventasBody, WELCOME_BODY_AFTER_GREETING)
    assert.equal(activarBody, WELCOME_BODY_AFTER_GREETING)
    assert.equal(subsBody, WELCOME_BODY_AFTER_GREETING)
    assert.equal(ventasBody, activarBody)
  })

  it('SEQUENCE_CONTENT welcome uses default suscripcion greeting', () => {
    assert.ok(SEQUENCE_CONTENT[SEQUENCE_STEP.WELCOME].text.startsWith(WELCOME_GREETINGS.suscripcion))
  })

  it('isMoreSpecificSource ranks activar > ventas > suscripcion', () => {
    assert.equal(isMoreSpecificSource('activar', 'ventas'), true)
    assert.equal(isMoreSpecificSource('ventas', 'suscripcion-page'), true)
    assert.equal(isMoreSpecificSource('suscripcion-page', 'activar'), false)
    assert.equal(isMoreSpecificSource('ventas', 'ventas'), false)
  })

  it('buildBulkManualWelcomeText uses personalized opener for one-time bulk send', () => {
    const text = buildBulkManualWelcomeText('Delia')
    assert.ok(text.startsWith('Hola Delia, me dejaste en el olvido.'))
    assert.ok(text.includes(WELCOME_BODY_AFTER_GREETING))
    assert.ok(!text.includes('gracias por unirte'))
  })
})

describe('sendSequenceEmail welcome source (unit)', () => {
  it('step 0 with source uses buildWelcomeText; pain points use SEQUENCE_CONTENT only', () => {
    const welcomeVentas = buildWelcomeText('ventas')
    const painPoint1 = SEQUENCE_CONTENT[SEQUENCE_STEP.PAIN_POINT_1].text

    assert.ok(welcomeVentas.startsWith('Hola, estás más cerca que nunca.'))
    assert.ok(painPoint1.startsWith('Hola.'))
    assert.ok(!painPoint1.includes('estás más cerca'))
  })
})
