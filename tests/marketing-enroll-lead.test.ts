import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildBulkManualWelcomeText,
  buildPainPoint1Text,
  buildPainPoint2Text,
  buildPainPoint3Text,
  buildPainPoint4Text,
  buildPainPoint5Text,
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
    assert.equal(normalizeLeadSource('info'), 'info')
    assert.equal(normalizeLeadSource('info-page'), 'info')
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

    const info = buildWelcomeText('info')
    assert.ok(info.startsWith(WELCOME_GREETINGS.info))
    assert.ok(info.includes(WELCOME_BODY_AFTER_GREETING))
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
  it('step 0 with source uses buildWelcomeText; pain point 1 is personalized', () => {
    const welcomeVentas = buildWelcomeText('ventas')
    const painPoint1 = buildPainPoint1Text({
      nombre: 'María López',
      email: 'maria@example.com',
      source: 'info',
    })

    assert.ok(welcomeVentas.startsWith('Hola, estás más cerca que nunca.'))
    assert.ok(painPoint1.startsWith('Hola María,'))
    assert.ok(painPoint1.includes('nota con el truco'))
    assert.ok(painPoint1.includes('siempre lo hemos hecho así'))
    assert.ok(!painPoint1.includes('6 meses de implementación'))
  })

  it('pain point 2 adapts intro and closing by lead source', () => {
    const info = buildPainPoint2Text({ nombre: 'Ana', email: 'a@x.com', source: 'info' })
    const ventas = buildPainPoint2Text({ nombre: 'Ana', email: 'a@x.com', source: 'ventas' })
    const activar = buildPainPoint2Text({ nombre: 'Ana', email: 'a@x.com', source: 'activar' })

    assert.ok(info.startsWith('Hola Ana,'))
    assert.ok(info.includes('temor que nos atrapa'))
    assert.ok(info.includes('tres meses instalándolo'))
    assert.ok(info.includes('72 horas o menos'))
    assert.ok(ventas.includes('cotizando o comparando opciones'))
    assert.ok(ventas.includes('cerrar la cotización'))
    assert.ok(activar.includes('activar tu entorno'))
    assert.ok(activar.includes('SISU puede servirte'))
    assert.ok(info.includes('errores "invisibles"'))
  })

  it('pain point 3 adapts intro, SISU line, and teaser by lead source', () => {
    const info = buildPainPoint3Text({ nombre: 'Luis', email: 'l@x.com', source: 'info' })
    const ventas = buildPainPoint3Text({ nombre: 'Luis', email: 'l@x.com', source: 'ventas' })
    const activar = buildPainPoint3Text({ nombre: 'Luis', email: 'l@x.com', source: 'activar' })

    assert.ok(info.startsWith('Hola Luis,'))
    assert.ok(info.includes('errores "invisibles"'))
    assert.ok(info.includes('fugas de dinero'))
    assert.ok(info.includes('dormir tranquilo'))
    assert.ok(ventas.includes('evaluando una cotización'))
    assert.ok(ventas.includes('cotizar y decidir con números claros'))
    assert.ok(ventas.includes('hojas de cálculo'))
    assert.ok(activar.includes('antes de activar tu entorno'))
    assert.ok(activar.includes('primer corte de asistencia o nómina'))
    assert.ok(activar.includes('al momento de activar algo mejor'))
  })

  it('pain point 4 adapts intro, tools line, and closing teaser by lead source', () => {
    const info = buildPainPoint4Text({ nombre: 'Carla', email: 'c@x.com', source: 'info' })
    const ventas = buildPainPoint4Text({ nombre: 'Carla', email: 'c@x.com', source: 'ventas' })
    const activar = buildPainPoint4Text({ nombre: 'Carla', email: 'c@x.com', source: 'activar' })

    assert.ok(info.startsWith('Hola Carla,'))
    assert.ok(info.includes('biométrico análogo'))
    assert.ok(info.includes('pseudo digitalización') === false)
    assert.ok(info.includes('hacer el trabajo doble'))
    assert.ok(info.includes('liberador de tiempo'))
    assert.ok(info.includes('último) correo de esta serie'))
    assert.ok(ventas.includes('armas la cotización'))
    assert.ok(ventas.includes('final_v2'))
    assert.ok(ventas.includes('cerrar la decisión'))
    assert.ok(activar.includes('frenando el salto a SISU'))
    assert.ok(activar.includes('reportes del reloj'))
    assert.ok(activar.includes('activar SISU'))
  })

  it('pain point 5 is the closing email with source-specific CTA', () => {
    const info = buildPainPoint5Text({ nombre: 'Pedro', email: 'p@x.com', source: 'info' })
    const ventas = buildPainPoint5Text({ nombre: 'Pedro', email: 'p@x.com', source: 'ventas' })
    const activar = buildPainPoint5Text({ nombre: 'Pedro', email: 'p@x.com', source: 'activar' })

    assert.ok(info.startsWith('Hola Pedro,'))
    assert.ok(info.includes('último correo de esta serie'))
    assert.ok(info.includes('prueba en la sombra'))
    assert.ok(info.includes('quiero echar un vistazo'))
    assert.ok(info.includes('/activar'))
    assert.ok(ventas.includes('tablas de cotización'))
    assert.ok(ventas.includes('sin compromiso de compra'))
    assert.ok(activar.includes('antes de activar SISU'))
    assert.ok(activar.includes('dar el primer paso'))
  })
})
