/**
 * API endpoint para revocar todas las sesiones excepto la actual
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

    // Extract current session token
    const cookies = req.cookies as Record<string, string>
    const authToken = cookies['sb-auth-token'] || cookies['sb-access-token']
    let currentSessionToken: string | null = null

    if (authToken) {
      try {
        const parsed = JSON.parse(authToken)
        currentSessionToken = parsed.session?.access_token?.jti || parsed.jti || null
      } catch {
        // Invalid token format
      }
    }

    // Revoke all sessions except current
    const { data: result, error: revokeError } = await supabase
      .rpc('revoke_all_user_sessions', {
        p_user_id: user.id,
        p_exclude_token: currentSessionToken
      })

    if (revokeError) {
      logger.error('Error revoking all sessions', revokeError)
      return res.status(500).json({ error: 'Error revoking sessions' })
    }

    res.status(200).json({
      success: true,
      sessions_revoked: result || 0,
      message: 'All other sessions revoked successfully'
    })

  } catch (error) {
    logger.error('Revoke all sessions API error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
