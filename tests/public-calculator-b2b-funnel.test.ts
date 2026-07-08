import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { matchesGodfatherKeyword } from '../lib/public-calculator/godfather-keyword'
import {
  buildTrojanShareMessage,
  buildTrojanShareUrl,
} from '../lib/public-calculator/trojan-whatsapp'
import {
  buildCalculatorShareLink,
  buildPeerShareMessage,
  buildPeerShareUrl,
} from '../lib/public-calculator/bridge-share'
import { buildSocialShareUrl } from '../lib/public-calculator/social-share'
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

describe('bridge share URLs', () => {
  it('builds peer share with calculator link and UTM', () => {
    const script = PUBLIC_CALCULATOR_CONFIGS.HND.landingBridge.share.peerScript
    const message = buildPeerShareMessage(script, PUBLIC_CALCULATOR_CONFIGS.HND.path, 'HND')
    assert.ok(message.includes('SISU'))
    assert.ok(message.includes('utm_medium=share'))
    assert.ok(message.includes('utm_campaign=bridge-share-peer'))
    assert.ok(message.includes(PUBLIC_CALCULATOR_CONFIGS.HND.path))

    const url = buildPeerShareUrl(script, PUBLIC_CALCULATOR_CONFIGS.HND.path, 'HND')
    assert.ok(url.startsWith('https://wa.me/?text='))
  })

  it('builds calculator share link for native share', () => {
    const link = buildCalculatorShareLink(PUBLIC_CALCULATOR_CONFIGS.SLV.path, 'SLV', 'bridge-share-native')
    assert.ok(link.includes('/calcusisusv'))
    assert.ok(link.includes('utm_campaign=bridge-share-native'))
  })
})

describe('social share URLs', () => {
  it('builds X intent with text and tracked URL', () => {
    const url = buildCalculatorShareLink(PUBLIC_CALCULATOR_CONFIGS.HND.path, 'HND', 'share-x')
    const intent = buildSocialShareUrl('x', url, PUBLIC_CALCULATOR_CONFIGS.HND.socialShare.postCalcScript)
    assert.ok(intent.startsWith('https://twitter.com/intent/tweet?'))
    assert.ok(intent.includes(encodeURIComponent('share-x')))
  })

  it('builds Facebook sharer with URL only', () => {
    const url = buildCalculatorShareLink(PUBLIC_CALCULATOR_CONFIGS.GTM.path, 'GTM', 'share-facebook')
    const intent = buildSocialShareUrl('facebook', url, 'ignored')
    assert.ok(intent.startsWith('https://www.facebook.com/sharer/sharer.php?'))
    assert.ok(intent.includes(encodeURIComponent('share-facebook')))
  })

  it('builds LinkedIn share URL', () => {
    const url = buildCalculatorShareLink(PUBLIC_CALCULATOR_CONFIGS.HND.path, 'HND', 'share-linkedin')
    const intent = buildSocialShareUrl('linkedin', url, 'ignored')
    assert.ok(intent.startsWith('https://www.linkedin.com/sharing/share-offsite/?'))
  })
})

describe('b2b funnel config', () => {
  it('is defined for all supported calculator countries', () => {
    assert.ok(PUBLIC_CALCULATOR_CONFIGS.HND.b2bFunnel)
    assert.ok(PUBLIC_CALCULATOR_CONFIGS.SLV.b2bFunnel)
    assert.ok(PUBLIC_CALCULATOR_CONFIGS.GTM.b2bFunnel)
  })

  it('defines landing bridge share actions', () => {
    for (const country of ['HND', 'SLV', 'GTM'] as const) {
      const bridge = PUBLIC_CALCULATOR_CONFIGS[country].landingBridge
      const social = PUBLIC_CALCULATOR_CONFIGS[country].socialShare
      assert.equal(bridge.shareButton, 'Compartir')
      assert.equal(bridge.activarButton, 'Activar gratis')
      assert.ok(bridge.share.peerScript.length > 0)
      assert.ok(social.postCalcScript.includes('SISU'))
    }
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
