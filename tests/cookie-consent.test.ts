import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  analyticsAllowed,
  cookieConsentSetCookieString,
  COOKIE_CONSENT_COOKIE,
  COOKIE_CONSENT_MAX_AGE_SEC,
  isCookieConsentChoice,
  parseCookieConsentStatus,
} from '../lib/analytics/cookie-consent'

describe('cookie consent helpers', () => {
  it('parses only accepted | rejected as a choice', () => {
    assert.equal(isCookieConsentChoice('accepted'), true)
    assert.equal(isCookieConsentChoice('rejected'), true)
    assert.equal(isCookieConsentChoice('unset'), false)
    assert.equal(isCookieConsentChoice(''), false)
    assert.equal(isCookieConsentChoice(null), false)
  })

  it('maps unknown values to unset', () => {
    assert.equal(parseCookieConsentStatus('accepted'), 'accepted')
    assert.equal(parseCookieConsentStatus('rejected'), 'rejected')
    assert.equal(parseCookieConsentStatus('granted'), 'unset')
    assert.equal(parseCookieConsentStatus(undefined), 'unset')
  })

  it('allows analytics only after explicit accept', () => {
    assert.equal(analyticsAllowed('accepted'), true)
    assert.equal(analyticsAllowed('rejected'), false)
    assert.equal(analyticsAllowed('unset'), false)
  })

  it('serializes a one-year SameSite=Lax cookie', () => {
    assert.equal(
      cookieConsentSetCookieString('accepted'),
      `${COOKIE_CONSENT_COOKIE}=accepted;path=/;max-age=${COOKIE_CONSENT_MAX_AGE_SEC};samesite=lax`
    )
    assert.equal(
      cookieConsentSetCookieString('rejected'),
      `${COOKIE_CONSENT_COOKIE}=rejected;path=/;max-age=${COOKIE_CONSENT_MAX_AGE_SEC};samesite=lax`
    )
  })
})
