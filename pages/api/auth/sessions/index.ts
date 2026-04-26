/**
 * API endpoint para listar sesiones activas del usuario
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

interface Session {
  id: string
  session_token: string
  device_id: string | null
  ip_hash: string | null
  ua_hash: string | null
  created_at: string
  last_activity: string
  expires_at: string
  idle_timeout_at: string
  revoked_at: string | null
  metadata: Record<string, any>
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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
        // Invalid token format, continue without current token
      }
    }

    // Get all active sessions for user
    const { data: sessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('last_activity', { ascending: false })

    if (sessionsError) {
      logger.error('Error fetching sessions', sessionsError)
      return res.status(500).json({ error: 'Error fetching sessions' })
    }

    // Mark current session
    const sessionsWithCurrent = (sessions || []).map((session: Session) => ({
      id: session.id,
      session_token: session.session_token, // Include for reference
      device_id: session.device_id,
      ip_hash: session.ip_hash,
      ua_hash: session.ua_hash,
      created_at: session.created_at,
      last_activity: session.last_activity,
      expires_at: session.expires_at,
      idle_timeout_at: session.idle_timeout_at,
      metadata: session.metadata || {},
      is_current: session.session_token === currentSessionToken
    }))

    res.status(200).json({
      success: true,
      sessions: sessionsWithCurrent
    })

  } catch (error) {
    logger.error('Sessions API error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
