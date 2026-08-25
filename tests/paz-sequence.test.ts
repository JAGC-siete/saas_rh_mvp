import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isPazLeadEntry,
  isViernesLeadEntry,
  normalizeLeadSource,
} from '../lib/marketing/email-sequence-ledger'
import { isInfoAcceleratedLead } from '../lib/marketing/info-sequence-timing'
import { isSuscripcionAcceleratedLead } from '../lib/marketing/suscripcion-sequence-timing'
import {
  buildInfoPackEmailBody,
  INFO_PACK_SUBJECT_PAZ,
} from '../lib/marketing/info-field-notes-email'
import { buildInfoPackSubject } from '../lib/marketing/info-pack-email'
import { buildInfoPackEmailHtml } from '../lib/marketing/info-pack-email-html'
import {
  PAZ_YOUTUBE_WATCH_URL,
  pazUnlockPath,
} from '../lib/marketing/paz-video'

describe('paz → info sequence (video pack)', () => {
  it('normalizeLeadSource maps paz to info without colliding with viernes', () => {
    assert.equal(normalizeLeadSource('paz'), 'info')
    assert.equal(normalizeLeadSource('info:paz'), 'info')
    assert.equal(normalizeLeadSource('paz:landing'), 'info')
    assert.equal(isPazLeadEntry('paz'), true)
    assert.equal(isPazLeadEntry('info:paz'), true)
    assert.equal(isPazLeadEntry('info'), false)
    assert.equal(isViernesLeadEntry('paz'), false)
    assert.equal(isPazLeadEntry('viernes'), false)
  })

  it('accelerated info cron includes paz; suscripcion excludes it', () => {
    assert.equal(isInfoAcceleratedLead('paz'), true)
    assert.equal(isInfoAcceleratedLead('info:paz'), true)
    assert.equal(isSuscripcionAcceleratedLead('paz'), false)
  })

  it('pack variant paz includes video + unlock links and Paper Bridge body', () => {
    assert.equal(buildInfoPackSubject('paz'), INFO_PACK_SUBJECT_PAZ)
    const pack = buildInfoPackEmailBody({
      nombre: 'Ana',
      email: 'a@x.com',
      variant: 'paz',
    })
    assert.ok(pack.includes('método revelado'))
    assert.ok(pack.includes(PAZ_YOUTUBE_WATCH_URL))
    assert.ok(pack.includes(pazUnlockPath()))
    assert.ok(pack.includes('puente de papel'))
    assert.ok(!pack.includes('recuperar el viernes'))
  })

  it('html pack variant paz includes watch and unlock hrefs', () => {
    const html = buildInfoPackEmailHtml({
      nombre: 'Ana',
      email: 'a@x.com',
      unsubscribeToken: 'token',
      variant: 'paz',
    })
    assert.ok(html.includes(PAZ_YOUTUBE_WATCH_URL))
    assert.ok(html.includes(pazUnlockPath()))
    assert.ok(html.includes('Método revelado'))
  })
})
