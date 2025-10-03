import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)
    
    // Use standard Supabase Auth like admin portal
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }
    
    // Get company_id from user_metadata (primary) or user_profiles (fallback)
    let companyId = user.user_metadata?.company_id
    
    // Fallback: buscar en user_profiles si no está en user_metadata
    if (!companyId) {
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      
      if (profileError || !userProfile?.company_id) {
        logger.error('User profile not found or missing company_id', {
          userId: user.id,
          email: user.email,
          profileError: profileError?.message
        })
        return res.status(404).json({ error: 'Perfil de empleado no encontrado' })
      }
      
      companyId = userProfile.company_id
    }

    // Get permission types for the company
    const { data: permissionTypes, error: typesError } = await supabase
      .from('leave_types')
      .select('id, name, color, is_paid, requires_approval, max_days_per_year')
      .eq('company_id', companyId)
      .order('name')

    if (typesError) {
      logger.error('Failed to fetch permission types', {
        companyId,
        error: typesError
      })
      return res.status(500).json({ error: 'Error al obtener tipos de permisos' })
    }

    // Filter to show only relevant permission types for employees
    const employeePermissionTypes = permissionTypes?.filter((type: any) => 
      // Show permission types that are suitable for employee self-registration
      type.name.includes('Permiso') || 
      type.name.includes('Personal') ||
      type.name.includes('Emergencia')
    ) || []

    logger.info('Employee permission types fetched', {
      companyId,
      count: employeePermissionTypes.length
    })

    return res.status(200).json(employeePermissionTypes)

  } catch (error) {
    logger.error('Employee permission types API error', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
