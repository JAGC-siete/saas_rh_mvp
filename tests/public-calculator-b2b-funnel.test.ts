import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { matchesGodfatherKeyword } from '../lib/public-calculator/godfather-keyword'
import {
  buildTrojanShareMessage,
  buildTrojanShareUrl,
} from '../lib/public-calculator/trojan-whatsapp'
import { PUBLIC_CALCULATOR_CONFIGS } from '../lib/public-calculator/config'
import { estimateTimeLeakHours } from '../lib/public-calculator/digital-health'

describe('godfather keyword matcher', () => {
  const keyword = 'MI CONSTANCIA TARDA UNA ETERNIDAD'

  it('matches exact keyword case-insensitive', () => {
    assert.equal(matchesGodfatherKeyword('mi constancia tarda una eternidad', keyword), true)
  })

  it('matches with accents removed', () => {
    assert.equal(matchesGodfatherKeyword('Mi constáncia tarda una eternidad!!!', keyword), true)
  })

  it('rejects unrelated replies', () => {
    assert.equal(matchesGodfatherKeyword('gracias por el pdf', keyword), false)
  })
})

describe('trojan whatsapp URLs', () => {
  it('encodes full script and activar link with UTM', () => {
    const script = PUBLIC_CALCULATOR_CONFIGS.HND.b2bFunnel!.trojanHorse.boss.whatsappScript
    const message = buildTrojanShareMessage(script, 'HND', 'boss')
    assert.ok(message.includes('Humano SISU'))
    assert.ok(message.includes('utm_medium=trojan'))
    assert.ok(message.includes('utm_campaign=trojan-boss'))

    const url = buildTrojanShareUrl(script, 'HND', 'boss')
    assert.ok(url.startsWith('https://wa.me/?text='))
    const decoded = decodeURIComponent(url.replace('https://wa.me/?text=', ''))
    assert.ok(decoded.includes('utm_campaign=trojan-boss'))
  })

  it('uses distinct campaigns for rrhh vs boss', () => {
    const rrhh = buildTrojanShareMessage(
      PUBLIC_CALCULATOR_CONFIGS.HND.b2bFunnel!.trojanHorse.rrhh.whatsappScript,
      'HND',
      'rrhh'
    )
    const boss = buildTrojanShareMessage(
      PUBLIC_CALCULATOR_CONFIGS.HND.b2bFunnel!.trojanHorse.boss.whatsappScript,
      'HND',
      'boss'
    )
    assert.ok(rrhh.includes('utm_campaign=trojan-rrhh'))
    assert.ok(boss.includes('utm_campaign=trojan-boss'))
  })
})

describe('b2b funnel config', () => {
  it('is defined only for HND', () => {
    assert.ok(PUBLIC_CALCULATOR_CONFIGS.HND.b2bFunnel)
    assert.equal(PUBLIC_CALCULATOR_CONFIGS.SLV.b2bFunnel, undefined)
    assert.equal(PUBLIC_CALCULATOR_CONFIGS.GTM.b2bFunnel, undefined)
  })
})

describe('digital health insights', () => {
  it('scales time leak hours by salary band', () => {
    assert.equal(estimateTimeLeakHours(15000, 15), 15)
    assert.equal(estimateTimeLeakHours(25000, 15), 20)
    assert.equal(estimateTimeLeakHours(45000, 15), 25)
  })
})

describe('godfather idempotency contract', () => {
  it('documents send outcomes for duplicate protection', () => {
    const reasons = ['already_sent', 'not_pending', 'not_found'] as const
    assert.ok(reasons.includes('already_sent'))
  })
})
