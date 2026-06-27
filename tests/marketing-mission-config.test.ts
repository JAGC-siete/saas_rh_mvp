import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildMissionPageUrl,
  buildMissionTextFooter,
  getMissionDef,
  isValidMissionChoice,
} from '../lib/marketing/mission-config'

describe('marketing mission config', () => {
  it('builds mission page URLs with lead token and choice', () => {
    const url = buildMissionPageUrl(1, 'abc123token', '5-15')
    assert.ok(url.includes('/secreto/m/1'))
    assert.ok(url.includes('lead=abc123token'))
    assert.ok(url.includes('choice=5-15'))
  })

  it('validates mission choices by lead source', () => {
    assert.equal(isValidMissionChoice(1, '15plus', 'info'), true)
    assert.equal(isValidMissionChoice(1, 'invalid', 'info'), false)
    assert.equal(isValidMissionChoice(5, 'shadow', 'info'), true)
  })

  it('buildMissionTextFooter includes all choice links', () => {
    const footer = buildMissionTextFooter(2, 'tok', 'info')
    assert.ok(footer.includes('Campo · pregunta'))
    assert.ok(footer.includes('Que sea muy difícil'))
    assert.ok(footer.includes('choice=difficult'))
  })

  it('suscripcion missions use employee-focused questions', () => {
    const mission = getMissionDef(1, 'suscripcion')
    assert.ok(mission.question.includes('recibo'))
    assert.ok(isValidMissionChoice(1, 'yes-once', 'suscripcion'))
    assert.equal(isValidMissionChoice(1, '15plus', 'suscripcion'), false)
  })
})
