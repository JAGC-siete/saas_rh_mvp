import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { requireAdmin } from '../../../../lib/auth/api-auth-fixed'

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
    // Use standardized admin authentication
    const { user, userProfile, role } = await requireAdmin(req, res)

    // Use admin client to bypass RLS for queries
    const adminClient = createAdminClient()

    // Build query - super_admin can see all invitations, others see only their company
    let query = adminClient
      .from('employee_invitations')
      .select(`
        id,
        email,
        status,
        expires_at,
        created_at,
        accepted_at,
        employee_id,
        company_id,
        employees(
          name,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false })

    // Filter by company if not super_admin
    if (role !== 'super_admin' && userProfile.company_id) {
      query = query.eq('company_id', userProfile.company_id)
    }

    const { data: invitations, error: invitationsError } = await query

    if (invitationsError) {
      logger.error('Failed to fetch invitations', { error: invitationsError })
      return res.status(500).json({
        success: false,
        error: 'Error obteniendo invitaciones'
      })
    }

    logger.info('Invitations retrieved', {
      userId: user.id,
      role,
      count: invitations?.length || 0
    })

    return res.status(200).json({
      success: true,
      invitations: invitations || []
    })

  } catch (error: any) {
    // Handle authentication errors
    if (error.message === 'UNAUTHORIZED' || error.message === 'ADMIN_REQUIRED') {
      return // Response already sent
    }
    
    logger.error('List invitations error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}
