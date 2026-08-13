/**
 * Revoke all sessions except the current one.
 * 1) Supabase Auth scope=others (invalidates other refresh tokens)
 * 2) Mark public.user_sessions rows revoked (tracking / SessionManager UI)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import {
  extractSessionIdFromSession,
  revokeOtherSupabaseAuthSessions,
} from '../../../../lib/auth/session-revoke'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Source of truth: kill other Auth refresh tokens, keep this device.
    const authRevoke = await revokeOtherSupabaseAuthSessions(supabase)
    if (!authRevoke.ok) {
      return res.status(502).json({
        error: 'Error revoking auth sessions',
        message: authRevoke.message,
      })
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const currentSessionToken = extractSessionIdFromSession(session)

    const { data: result, error: revokeError } = await supabase.rpc(
      'revoke_all_user_sessions',
      {
        p_user_id: user.id,
        p_exclude_token: currentSessionToken,
      }
    )

    if (revokeError) {
      logger.error('Error syncing user_sessions after Auth revoke-others', revokeError)
      return res.status(200).json({
        success: true,
        sessions_revoked: null,
        auth_revoked: true,
        tracking_sync: false,
        message:
          'Other Auth sessions revoked; tracking table sync failed',
      })
    }

    res.status(200).json({
      success: true,
      sessions_revoked: result || 0,
      auth_revoked: true,
      tracking_sync: true,
      message: 'All other sessions revoked successfully',
    })
  } catch (error) {
    logger.error('Revoke all sessions API error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
