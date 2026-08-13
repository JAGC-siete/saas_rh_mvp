import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPainPoint1Text,
  buildPainPoint2Text,
  buildPainPoint3Text,
  buildPainPoint4Text,
  buildPainPoint5Text,
  buildWelcomeText,
} from '../lib/marketing/email-sequence-ledger'
import {
  getMissionDef,
  stripMissionTextFooter,
  stripTrailingSignOff,
  type MissionId,
} from '../lib/marketing/mission-config'
import { buildSequenceEmailHtml, buildWelcomeEmailHtml } from '../lib/marketing/sequence-email-html'

const SOURCES = ['info', 'suscripcion', 'activar', 'ventas'] as const
const PAIN_BUILDERS = [
  buildPainPoint1Text,
  buildPainPoint2Text,
  buildPainPoint3Text,
  buildPainPoint4Text,
  buildPainPoint5Text,
] as const

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0
  let count = 0
  let idx = 0
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count += 1
    idx += needle.length
  }
  return count
}

describe('sequence email audit (all sources and steps)', () => {
  for (const source of SOURCES) {
    for (let step = 1; step <= 5; step++) {
      const missionId = step as MissionId

      it(`${source} pain point ${step}: plain text mission footer is clean`, () => {
        const body = PAIN_BUILDERS[step - 1]({
          nombre: 'Ana',
          email: 'a@x.com',
          source,
          leadToken: 'tok',
        })

        assert.ok(!body.includes('Campo ·'), 'must not contain Campo label')
        assert.ok(!/→ [^\n]+: https?:\/\//.test(body), 'URLs must be on their own line')
        assert.ok(body.includes('Pregunta rápida') || body.includes('Respuesta rápida'))

        const stripped = stripMissionTextFooter(body)
        const question = getMissionDef(missionId, source).question

        assert.ok(!stripped.includes('choice='), 'strip must remove choice URLs')
        assert.ok(!stripped.includes(question), 'strip must remove mission question')
      })

      it(`${source} pain point ${step}: HTML renders mission block once`, () => {
        const body = PAIN_BUILDERS[step - 1]({
          nombre: 'Ana',
          email: 'a@x.com',
          source,
          leadToken: 'tok',
        })
        const question = getMissionDef(missionId, source).question

        const html = buildSequenceEmailHtml({
          subject: `Nota #${step}`,
          bodyText: body,
          unsubscribeToken: 'tok',
          missionId,
          leadToken: 'tok',
          source,
        })

        assert.ok(!html.includes('Campo ·'))
        assert.equal(countOccurrences(html, question), 1)
        assert.ok(html.includes('choice='), 'HTML must keep choice links in buttons')
        assert.equal(countOccurrences(html, '>Jorge<'), 1)
      })
    }

    it(`${source} welcome: single Jorge sign-off in HTML`, () => {
      const body = buildWelcomeText(source)
      const html = buildWelcomeEmailHtml({
        subject: 'Welcome',
        bodyText: stripTrailingSignOff(body),
        unsubscribeToken: 'tok',
        source,
      })

      assert.equal(countOccurrences(html, '>Jorge<'), 1)
    })
  }
})
