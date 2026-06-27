import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildMissionPageUrl,
  buildMissionTextFooter,
  isValidMissionChoice,
  MISSIONS,
} from '../lib/marketing/mission-config'

describe('marketing mission config', () => {
  it('builds mission page URLs with lead token and choice', () => {
    const url = buildMissionPageUrl(1, 'abc123token', '5-15')
    assert.ok(url.includes('/secreto/m/1'))
    assert.ok(url.includes('lead=abc123token'))
    assert.ok(url.includes('choice=5-15'))
  })

  it('validates mission choices', () => {
    assert.equal(isValidMissionChoice(1, '15plus'), true)
    assert.equal(isValidMissionChoice(1, 'invalid'), false)
    assert.equal(isValidMissionChoice(5, 'shadow'), true)
  })

  it('buildMissionTextFooter includes all choice links', () => {
    const footer = buildMissionTextFooter(2, 'tok')
    assert.ok(footer.includes(MISSIONS[2].question))
    assert.ok(footer.includes('Que sea muy difícil'))
    assert.ok(footer.includes('choice=difficult'))
  })
})
