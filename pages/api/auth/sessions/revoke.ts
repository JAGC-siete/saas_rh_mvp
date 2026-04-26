/**
 * API endpoint para revocar una sesión específica
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { session_token } = req.body

    if (!session_token) {
      return res.status(400).json({ error: 'session_token is required' })
    }

    // Verify the session belongs to the current user
    // session_token can be either the session id or the actual session_token
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('user_id, session_token, id')
      .or(`id.eq.${session_token},session_token.eq.${session_token}`)
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .single()

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Revoke the session using the actual session_token
    const { error: revokeError } = await supabase
      .rpc('revoke_user_session', {
        p_session_token: session.session_token,
        p_reason: 'manual_revocation'
      })

    if (revokeError) {
      logger.error('Error revoking session', revokeError)
      return res.status(500).json({ error: 'Error revoking session' })
    }

    res.status(200).json({
      success: true,
      message: 'Session revoked successfully'
    })

  } catch (error) {
    logger.error('Revoke session API error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
