import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildPainPoint2Text } from '../lib/marketing/email-sequence-ledger'
import { stripMissionTextFooter } from '../lib/marketing/mission-config'
import { buildSequenceEmailHtml } from '../lib/marketing/sequence-email-html'

describe('sequence email HTML mission block', () => {
  it('stripMissionTextFooter removes mission choices from plain text', () => {
    const body = buildPainPoint2Text({
      nombre: 'Ana',
      email: 'a@x.com',
      source: 'info',
      leadToken: 'tok',
    })

    const stripped = stripMissionTextFooter(body)
    assert.ok(!stripped.includes('choice=difficult'))
    assert.ok(!stripped.includes('Campo ·'))
    assert.ok(!stripped.includes('— Jorge'))
    assert.ok(stripped.includes('Una herramienta moderna'))
  })

  it('buildSequenceEmailHtml renders mission once in HTML, not as duplicated paragraphs', () => {
    const body = buildPainPoint2Text({
      nombre: 'Ana',
      email: 'a@x.com',
      source: 'info',
      leadToken: 'tok',
    })

    const html = buildSequenceEmailHtml({
      subject: 'Nota de campo #2',
      bodyText: body,
      unsubscribeToken: 'tok',
      missionId: 2,
      leadToken: 'tok',
      source: 'info',
    })

    assert.ok(html.includes('Que sea muy difícil'))
    assert.ok(html.includes('choice=difficult'))
    assert.ok(!html.includes('Campo ·'))
    assert.ok(!html.includes('Campo &middot;'))
    assert.equal((html.match(/¿Qué es lo que más te frena/g) ?? []).length, 1)
  })
})
