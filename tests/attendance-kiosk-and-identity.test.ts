/**
 * Public kiosk last5/DNI is disabled; portal identity ignores user_metadata.
 * Run: npm run test:security
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveEmployeeAndCompanyId } from '../lib/employee-portal/company-settings'
import {
  appendAttendanceWebhookToken,
  hashAttendanceWebhookSecret,
  issueAttendanceWebhookSecret,
  redactAttendanceWebhookUrl,
  signAttendanceWebhookBody,
  verifyAttendanceWebhookAuth,
} from '../lib/attendance/webhook-auth'
import { PUBLIC_ATTENDANCE_KIOSK_GONE } from '../lib/attendance/kiosk-disabled'

function mockSupabase(profile: { employee_id: string | null; company_id: string | null } | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: profile }),
        }),
      }),
    }),
  } as any
}

describe('resolveEmployeeAndCompanyId', () => {
  it('ignores attacker-controlled user_metadata and uses user_profiles', async () => {
    const ctx = await resolveEmployeeAndCompanyId(mockSupabase({
      employee_id: 'emp-real',
      company_id: 'co-real',
    }), {
      id: 'user-1',
      user_metadata: { employee_id: 'emp-attacker', company_id: 'co-other' },
    } as any)
    assert.equal(ctx?.employeeId, 'emp-real')
    assert.equal(ctx?.companyId, 'co-real')
  })

  it('returns null when profile has no company_id', async () => {
    const ctx = await resolveEmployeeAndCompanyId(mockSupabase({
      employee_id: 'emp-real',
      company_id: null,
    }), { id: 'user-1' })
    assert.equal(ctx, null)
  })
})

describe('attendance webhook HMAC', () => {
  it('rejects missing token or missing stored hash; allows Hikvision token-only', () => {
    const { token, hash } = issueAttendanceWebhookSecret()
    const body = Buffer.from('{"eventType":"heartBeat"}')
    assert.equal(
      verifyAttendanceWebhookAuth({
        presentedToken: null,
        presentedSignature: signAttendanceWebhookBody(token, body),
        storedSecretHash: hash,
        rawBody: body,
      }).ok,
      false
    )
    assert.equal(
      verifyAttendanceWebhookAuth({
        presentedToken: token,
        presentedSignature: null,
        storedSecretHash: hash,
        rawBody: body,
      }).ok,
      true
    )
    assert.equal(
      verifyAttendanceWebhookAuth({
        presentedToken: token,
        presentedSignature: signAttendanceWebhookBody(token, body),
        storedSecretHash: null,
        rawBody: body,
      }).ok,
      false
    )
  })

  it('accepts matching HMAC and rejects a mutated body', () => {
    const { token, hash } = issueAttendanceWebhookSecret()
    const body = Buffer.from('{"AccessControllerEvent":{"cardNo":"1"}}')
    const ok = verifyAttendanceWebhookAuth({
      presentedToken: token,
      presentedSignature: `sha256=${signAttendanceWebhookBody(token, body)}`.replace('sha256=', ''),
      storedSecretHash: hash,
      rawBody: body,
    })
    assert.equal(ok.ok, true)

    const mutated = Buffer.from('{"AccessControllerEvent":{"cardNo":"2"}}')
    const bad = verifyAttendanceWebhookAuth({
      presentedToken: token,
      presentedSignature: signAttendanceWebhookBody(token, body),
      storedSecretHash: hash,
      rawBody: mutated,
    })
    assert.equal(bad.ok, false)
  })

  it('hash of issued secret is sha256 hex', () => {
    const { token, hash } = issueAttendanceWebhookSecret()
    assert.equal(hash, hashAttendanceWebhookSecret(token))
    assert.match(hash, /^[0-9a-f]{64}$/)
  })

  it('redacts token from provision URLs', () => {
    const url = appendAttendanceWebhookToken(
      'https://humanosisu.net/api/webhooks/attendance?company_id=abc',
      'supersecret'
    )
    assert.match(url, /token=supersecret/)
    assert.equal(redactAttendanceWebhookUrl(url).includes('supersecret'), false)
  })
})

describe('public kiosk disable', () => {
  it('exposes a gone message', () => {
    assert.match(PUBLIC_ATTENDANCE_KIOSK_GONE, /deshabilitado/i)
  })
})
