/**
 * Revoke Supabase Auth sessions (refresh tokens) alongside app tracking rows.
 *
 * Auth scopes (GoTrue):
 * - global: all sessions
 * - local: current session only
 * - others: all except current
 */

import crypto from 'crypto'
import { logger } from '../logger'
import { createAdminClient } from '../supabase/server'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type SignOutCapableClient = {
  auth: {
    signOut: (options?: {
      scope?: 'global' | 'local' | 'others'
    }) => Promise<{ error: { message?: string } | null }>
  }
}

/** Prefer Auth `session_id` claim; fall back to `jti` for older tokens. */
export function extractSessionIdFromJwt(accessToken: string): string | null {
  try {
    const parts = accessToken.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const id = payload.session_id || payload.jti
    return typeof id === 'string' && id.length > 0 ? id : null
  } catch {
    return null
  }
}

export function extractSessionIdFromSession(session: {
  access_token?: string
  user?: { id?: string }
  expires_at?: number
} | null): string | null {
  if (!session?.access_token) return null
  const fromJwt = extractSessionIdFromJwt(session.access_token)
  if (fromJwt) return fromJwt

  // Deterministic fallback (legacy parity with createSessionOnLogin)
  if (session.user?.id && session.expires_at) {
    return crypto
      .createHash('sha256')
      .update(session.user.id + String(session.expires_at))
      .digest('hex')
      .substring(0, 32)
  }

  return null
}

/** Keep current Auth session; revoke refresh tokens on every other device. */
export async function revokeOtherSupabaseAuthSessions(
  supabase: SignOutCapableClient
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.auth.signOut({ scope: 'others' })
  if (error) {
    logger.error('Failed to revoke other Supabase Auth sessions', error)
    return { ok: false, message: error.message || 'Auth revoke failed' }
  }
  return { ok: true }
}

/**
 * Best-effort: delete one row from auth.sessions when session_token is a UUID.
 * PostgREST may not expose auth schema — failures are logged, not thrown.
 */
export async function revokeSupabaseAuthSessionById(
  userId: string,
  sessionId: string
): Promise<{ ok: boolean; skipped?: boolean; message?: string }> {
  if (!UUID_RE.test(sessionId)) {
    return {
      ok: false,
      skipped: true,
      message: 'session token is not an auth.sessions UUID',
    }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .schema('auth')
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId)

    if (error) {
      logger.warn('auth.sessions delete failed (schema may be unexposed)', {
        userId,
        sessionIdPrefix: sessionId.slice(0, 8),
        message: error.message,
      })
      return { ok: false, message: error.message }
    }

    return { ok: true }
  } catch (err: any) {
    logger.warn('auth.sessions delete threw', {
      userId,
      message: err?.message || String(err),
    })
    return { ok: false, message: err?.message || String(err) }
  }
}
