import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isViernesLeadEntry,
  normalizeLeadSource,
  buildWelcomeText,
  buildPainPoint1Text,
} from '../lib/marketing/email-sequence-ledger'
import { isInfoAcceleratedLead } from '../lib/marketing/info-sequence-timing'
import { isSuscripcionAcceleratedLead } from '../lib/marketing/suscripcion-sequence-timing'
import {
  buildInfoPackEmailBody,
  INFO_PACK_SUBJECT_VIERNES,
} from '../lib/marketing/info-field-notes-email'
import { buildInfoPackSubject } from '../lib/marketing/info-pack-email'

describe('viernes → info sequence (Paper Bridge)', () => {
  it('normalizeLeadSource maps viernes and legacy info:viernes to info', () => {
    assert.equal(normalizeLeadSource('viernes'), 'info')
    assert.equal(normalizeLeadSource('info:viernes'), 'info')
    assert.equal(normalizeLeadSource('viernes:landing'), 'info')
    assert.equal(normalizeLeadSource('info'), 'info')
    assert.equal(isViernesLeadEntry('viernes'), true)
    assert.equal(isViernesLeadEntry('info'), false)
  })

  it('accelerated info cron includes viernes; suscripcion excludes it', () => {
    assert.equal(isInfoAcceleratedLead('viernes'), true)
    assert.equal(isInfoAcceleratedLead('info:viernes'), true)
    assert.equal(isInfoAcceleratedLead('info'), true)
    assert.equal(isSuscripcionAcceleratedLead('viernes'), false)
  })

  it('pack variant viernes uses recuperar-el-viernes opener + same Paper Bridge body', () => {
    assert.equal(buildInfoPackSubject('viernes'), INFO_PACK_SUBJECT_VIERNES)
    const pack = buildInfoPackEmailBody({
      nombre: 'Ana',
      email: 'a@x.com',
      variant: 'viernes',
    })
    assert.ok(pack.includes('recuperar el viernes'))
    assert.ok(pack.includes('puente de papel'))
    assert.ok(!pack.includes('CHECKLIST DE CIERRE'))
    assert.ok(!pack.includes('tocar el cielo'))
  })

  it('welcome and pain points use info (paces) copy, not checklist track', () => {
    const welcome = buildWelcomeText('viernes')
    assert.ok(welcome.includes('siempre lo hemos hecho así'))
    assert.ok(!welcome.includes('Digitalizar no es dejar de reprocesar'))

    const pp1 = buildPainPoint1Text({
      nombre: 'Ana',
      email: 'a@x.com',
      source: 'viernes',
    })
    assert.ok(pp1.includes('Siempre lo hemos hecho así'))
    assert.ok(!pp1.includes('4 horas el domingo a 4 minutos'))
  })
})
