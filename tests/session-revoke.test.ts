import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import {
  extractSessionIdFromJwt,
  extractSessionIdFromSession,
  revokeOtherSupabaseAuthSessions,
} from '../lib/auth/session-revoke'

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString(
    'base64url'
  )
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.sig`
}

describe('extractSessionIdFromJwt', () => {
  it('prefers session_id over jti', () => {
    const token = makeJwt({
      session_id: '11111111-1111-4111-8111-111111111111',
      jti: 'legacy-jti',
    })
    assert.equal(
      extractSessionIdFromJwt(token),
      '11111111-1111-4111-8111-111111111111'
    )
  })

  it('falls back to jti when session_id missing', () => {
    const token = makeJwt({ jti: 'only-jti' })
    assert.equal(extractSessionIdFromJwt(token), 'only-jti')
  })

  it('returns null for invalid token', () => {
    assert.equal(extractSessionIdFromJwt('not-a-jwt'), null)
  })
})

describe('extractSessionIdFromSession', () => {
  it('reads from access_token', () => {
    const token = makeJwt({ session_id: '22222222-2222-4222-8222-222222222222' })
    assert.equal(
      extractSessionIdFromSession({
        access_token: token,
        user: { id: 'u1' },
        expires_at: 123,
      }),
      '22222222-2222-4222-8222-222222222222'
    )
  })
})

describe('revokeOtherSupabaseAuthSessions', () => {
  it('calls signOut with scope others', async () => {
    const signOut = mock.fn(async () => ({ error: null }))
    const result = await revokeOtherSupabaseAuthSessions({
      auth: { signOut },
    })
    assert.deepEqual(result, { ok: true })
    assert.equal(signOut.mock.calls.length, 1)
    assert.deepEqual(signOut.mock.calls[0].arguments[0], { scope: 'others' })
  })

  it('returns failure when Auth errors', async () => {
    const signOut = mock.fn(async () => ({ error: { message: 'boom' } }))
    const result = await revokeOtherSupabaseAuthSessions({
      auth: { signOut },
    })
    assert.deepEqual(result, { ok: false, message: 'boom' })
  })
})
