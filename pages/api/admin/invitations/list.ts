import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

interface ListInvitationsResponse {
  success: boolean
  invitations?: any[]
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ListInvitationsResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    // Verificar autenticación y permisos de admin
    const supabase = createClient(req, res)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'No autorizado' 
      })
    }

    // Verificar que el usuario es admin
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['super_admin', 'admin'].includes(userProfile.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Permisos insuficientes' 
      })
    }

    // Obtener invitaciones de la empresa del admin
    const { data: invitations, error: invitationsError } = await supabase
      .from('employee_invitations')
      .select(`
        id,
        email,
        status,
        expires_at,
        created_at,
        accepted_at,
        employees!inner(
          name,
          email,
          role
        )
      `)
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false })

    if (invitationsError) {
      logger.error('Failed to fetch invitations', { error: invitationsError })
      return res.status(500).json({
        success: false,
        error: 'Error obteniendo invitaciones'
      })
    }

    return res.status(200).json({
      success: true,
      invitations: invitations || []
    })

  } catch (error) {
    logger.error('List invitations error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}
