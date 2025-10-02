import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

interface ValidateInvitationResponse {
  success: boolean
  invitation?: any
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ValidateInvitationResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    const { token } = req.query

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Token de invitación requerido' 
      })
    }

    const adminSupabase = createAdminClient()

    // Buscar la invitación válida
    const { data: invitation, error: invitationError } = await adminSupabase
      .from('employee_invitations')
      .select(`
        id,
        email,
        status,
        expires_at,
        employees!inner(
          name,
          email
        )
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (invitationError || !invitation) {
      logger.warn('Invalid invitation token validation', { token, error: invitationError?.message })
      return res.status(400).json({
        success: false,
        error: 'Invitación inválida o expirada'
      })
    }

    return res.status(200).json({
      success: true,
      invitation: invitation
    })

  } catch (error) {
    logger.error('Validate invitation error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}
