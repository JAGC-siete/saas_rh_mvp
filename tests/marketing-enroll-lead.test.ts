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
    assert.ok(ventas.includes('propuesta en PDF'))
    assert.ok(ventas.includes('— Jorge'))
    assert.ok(!ventas.includes(WELCOME_BODY_AFTER_GREETING))

    const activar = buildWelcomeText('activar')
    assert.ok(activar.includes('Encendiste el motor'))
    assert.ok(activar.includes('— Jorge'))
    assert.ok(!activar.includes(WELCOME_BODY_AFTER_GREETING))

    const subs = buildWelcomeText('suscripcion-page')
    assert.ok(subs.startsWith('Hola,'))
    assert.ok(subs.includes('Te quedaste'))
    assert.ok(subs.includes('recibo no coincide'))
    assert.ok(!subs.includes(WELCOME_BODY_AFTER_GREETING))

    const info = buildWelcomeText('info')
    assert.ok(info.startsWith('Hola,'))
    assert.ok(info.includes('Te quedaste'))
    assert.ok(info.includes('siempre lo hemos hecho así'))
    assert.ok(!info.includes(WELCOME_BODY_AFTER_GREETING))
  })

  it('welcome body after greeting is generic only for legacy sources without field notes', () => {
    const ventasBody = buildWelcomeText('ventas')
    assert.ok(ventasBody.includes('propuesta en PDF'))
    assert.ok(!ventasBody.includes(WELCOME_BODY_AFTER_GREETING))
  })

  it('SEQUENCE_CONTENT welcome uses suscripcion field-notes welcome', () => {
    assert.ok(SEQUENCE_CONTENT[SEQUENCE_STEP.WELCOME].text.includes('recibo no coincide'))
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

    assert.ok(welcomeVentas.includes('propuesta en PDF'))
    assert.ok(welcomeVentas.includes('— Jorge'))
    assert.ok(painPoint1.startsWith('Hola María,'))
    assert.ok(painPoint1.includes('extracto del sobre'))
    assert.ok(painPoint1.includes('siempre lo hemos hecho así'))
    assert.ok(!painPoint1.includes('6 meses de implementación'))

    const subsPp1 = buildPainPoint1Text({
      nombre: 'María',
      email: 'm@x.com',
      source: 'suscripcion',
    })
    assert.ok(subsPp1.includes('recibo siempre sale'))
    assert.ok(subsPp1.includes('lo que siempre me han pagado') === false)
  })

  it('pain point 2 adapts intro and closing by lead source', () => {
    const info = buildPainPoint2Text({ nombre: 'Ana', email: 'a@x.com', source: 'info' })
    const infoWithMission = buildPainPoint2Text({
      nombre: 'Ana',
      email: 'a@x.com',
      source: 'info',
      leadToken: 'tok',
    })
    const ventas = buildPainPoint2Text({ nombre: 'Ana', email: 'a@x.com', source: 'ventas' })
    const activar = buildPainPoint2Text({ nombre: 'Ana', email: 'a@x.com', source: 'activar' })

    assert.ok(info.startsWith('Hola Ana,'))
    assert.ok(info.includes('sistemas nuevos es complicado'))
    assert.ok(info.includes('WhatsApp como sistema operativo'))
    assert.ok(infoWithMission.includes('Nota #2 · Pregunta rápida'))
    assert.ok(ventas.includes('72 horas'))
    assert.ok(ventas.includes('20%'))
    assert.ok(activar.includes('encendiste el entorno'))
    assert.ok(activar.includes('10 minutos'))
    assert.ok(!activar.includes('SISU puede servirte'))
  })

  it('pain point 3 adapts intro, SISU line, and teaser by lead source', () => {
    const info = buildPainPoint3Text({ nombre: 'Luis', email: 'l@x.com', source: 'info' })
    const ventas = buildPainPoint3Text({ nombre: 'Luis', email: 'l@x.com', source: 'ventas' })
    const activar = buildPainPoint3Text({ nombre: 'Luis', email: 'l@x.com', source: 'activar' })

    assert.ok(info.startsWith('Hola Luis,'))
    assert.ok(info.includes('se escapa algo'))
    assert.ok(info.includes('¿Lo hicimos bien?'))
    assert.ok(ventas.includes('objeción'))
    assert.ok(ventas.includes('biométrico'))
    assert.ok(!ventas.includes('evaluando una cotización'))
    assert.ok(activar.includes('confiar en el número'))
    assert.ok(activar.includes('¿Está bien esta planilla?'))
    assert.ok(!activar.includes('primer corte de asistencia'))
  })

  it('pain point 4 adapts intro, tools line, and closing teaser by lead source', () => {
    const info = buildPainPoint4Text({ nombre: 'Carla', email: 'c@x.com', source: 'info' })
    const ventas = buildPainPoint4Text({ nombre: 'Carla', email: 'c@x.com', source: 'ventas' })
    const activar = buildPainPoint4Text({ nombre: 'Carla', email: 'c@x.com', source: 'activar' })

    assert.ok(info.startsWith('Hola Carla,'))
    assert.ok(info.includes('Biométrico en la puerta'))
    assert.ok(info.includes('reprocesamiento disfrazado'))
    assert.ok(ventas.includes('/app/login'))
    assert.ok(ventas.includes('trial incluido'))
    assert.ok(!ventas.includes('final_v2'))
    assert.ok(activar.includes('Biométrico en la entrada'))
    assert.ok(activar.includes('reprocesando la ejecución'))
    assert.ok(!activar.includes('frenando el salto a SISU'))
  })

  it('pain point 5 is the closing email with source-specific CTA', () => {
    const info = buildPainPoint5Text({
      nombre: 'Pedro',
      email: 'p@x.com',
      source: 'info',
      leadToken: 'tok',
    })
    const ventas = buildPainPoint5Text({ nombre: 'Pedro', email: 'p@x.com', source: 'ventas' })
    const activar = buildPainPoint5Text({ nombre: 'Pedro', email: 'p@x.com', source: 'activar' })

    assert.ok(info.startsWith('Hola Pedro,'))
    assert.ok(info.includes('Última nota de esta serie'))
    assert.ok(info.includes('prueba en la sombra'))
    assert.ok(info.includes('Sí, muéstrame'))
    assert.ok(info.includes('/activar'))
    assert.ok(ventas.includes('contratación'))
    assert.ok(ventas.includes('WhatsApp'))
    assert.ok(!ventas.includes('/activar'))
    assert.ok(!ventas.includes('dar el primer paso'))
    assert.ok(activar.includes('/ventas'))
    assert.ok(!activar.includes('dar el primer paso'))
    assert.ok(!activar.includes('/activar'))
  })
})
