/**
 * Heartbeat Endpoint
 * Updates last_activity for user session
 * Called by client to signal user activity
 * 
 * Based on: https://supabase.com/docs/guides/auth/sessions
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { env } from '../../../lib/env'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Configuración incompleta: Supabase no está configurado en este entorno.',
      })
    }

    const supabase = createClient(req, res)
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        requiresReauth: true 
      })
    }
    
    // Extract session token from cookies
    const cookies = req.cookies as Record<string, string>
    
    // Try to find the session token from various cookie names
    const authToken = cookies['sb-auth-token'] || cookies['sb-access-token']
    
    if (!authToken) {
      // Session tracking not available, but user is authenticated
      // Return success anyway to prevent constant 400 errors
      logger.debug('Heartbeat - no session token found but user authenticated', { userId: user.id })
      return res.status(200).json({
        success: true,
        idleTimeoutMinutes: null,
        warningAt: null
      })
    }
    
    let sessionToken: string
    try {
      const parsed = JSON.parse(authToken)
      sessionToken = parsed.session?.access_token?.jti || parsed.jti
    } catch {
      // Invalid token format, but user is authenticated
      logger.debug('Heartbeat - invalid token format but user authenticated', { userId: user.id })
      return res.status(200).json({
        success: true,
        idleTimeoutMinutes: null,
        warningAt: null
      })
    }
    
    // Update session activity (rate-limited to once per 60s)
    const { data: updated, error: updateError } = await supabase
      .rpc('update_session_activity', {
        p_session_token: sessionToken,
        p_user_id: user.id
      })
    
    if (updateError) {
      logger.error('Error updating session activity', updateError)
      // Don't fail the request if session update fails
      return res.status(200).json({
        success: true,
        idleTimeoutMinutes: null,
        warningAt: null
      })
    }
    
    if (!updated) {
      // Session expired, but allow the request to continue
      logger.debug('Heartbeat - session expired but user authenticated', { userId: user.id })
      return res.status(200).json({
        success: true,
        idleTimeoutMinutes: null,
        warningAt: null
      })
    }
    
    logger.debug('Session activity updated', {
      userId: user.id,
      sessionToken: sessionToken?.substring(0, 8) + '...'
    })
    
    // Get time until expiration for client
    const { data: sessionData } = await supabase
      .from('user_sessions')
      .select('idle_timeout_at, expires_at')
      .eq('session_token', sessionToken)
      .single()
    
    const timeUntilIdleExpiry = sessionData?.idle_timeout_at
      ? Math.max(0, Math.floor((new Date(sessionData.idle_timeout_at).getTime() - Date.now()) / 1000 / 60))
      : null
    
    res.status(200).json({
      success: true,
      idleTimeoutMinutes: timeUntilIdleExpiry,
      warningAt: 10 // Warn user when 10 minutes remain
    })
    
  } catch (error) {
    logger.error('Heartbeat error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

