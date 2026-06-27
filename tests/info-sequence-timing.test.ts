import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  INFO_SEQUENCE_PP_DELAY_HOURS,
  INFO_SEQUENCE_WELCOME_DELAY_HOURS,
  isInfoPainPointDue,
  isInfoWelcomeDue,
} from '../lib/marketing/info-sequence-timing'
import { SEQUENCE_STEP } from '../lib/marketing/email-sequence-ledger'

describe('info sequence timing', () => {
  const registeredAt = new Date('2026-06-01T10:00:00.000Z')

  it('exposes 24h welcome and 48h pain-point cadence', () => {
    assert.equal(INFO_SEQUENCE_WELCOME_DELAY_HOURS, 24)
    assert.equal(INFO_SEQUENCE_PP_DELAY_HOURS, 48)
  })

  it('welcome is due 24h after info pack', () => {
    const due = new Date(registeredAt.getTime() + 24 * 60 * 60 * 1000)
    assert.equal(
      isInfoWelcomeDue({ infoPackSentAt: registeredAt.toISOString(), now: due }),
      true
    )
    assert.equal(
      isInfoWelcomeDue({
        infoPackSentAt: registeredAt.toISOString(),
        now: new Date(registeredAt.getTime() + 23 * 60 * 60 * 1000),
      }),
      false
    )
  })

  it('PP1 is due 48h after registration', () => {
    const due = new Date(registeredAt.getTime() + 48 * 60 * 60 * 1000)
    assert.equal(
      isInfoPainPointDue({
        currentStep: SEQUENCE_STEP.PAIN_POINT_1,
        infoPackSentAt: registeredAt.toISOString(),
        lastMailSentAt: new Date(registeredAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        now: due,
      }),
      true
    )
  })

  it('PP2+ is due 48h after the previous email', () => {
    const pp1Sent = new Date(registeredAt.getTime() + 48 * 60 * 60 * 1000)
    const due = new Date(pp1Sent.getTime() + 48 * 60 * 60 * 1000)

    assert.equal(
      isInfoPainPointDue({
        currentStep: SEQUENCE_STEP.PAIN_POINT_2,
        infoPackSentAt: registeredAt.toISOString(),
        lastMailSentAt: pp1Sent.toISOString(),
        now: due,
      }),
      true
    )
    assert.equal(
      isInfoPainPointDue({
        currentStep: SEQUENCE_STEP.PAIN_POINT_2,
        infoPackSentAt: registeredAt.toISOString(),
        lastMailSentAt: pp1Sent.toISOString(),
        now: new Date(pp1Sent.getTime() + 47 * 60 * 60 * 1000),
      }),
      false
    )
  })
})
