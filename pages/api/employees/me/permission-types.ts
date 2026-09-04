import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import {
  assertEmployeePortalEnabled,
  resolveEmployeeAndCompanyId,
} from '../../../../lib/employee-portal/company-settings'

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
    
    const ctx = await resolveEmployeeAndCompanyId(supabase, user)
    if (!ctx) {
      return res.status(404).json({ error: 'Perfil de empleado no encontrado' })
    }
    const { companyId } = ctx

    if (!(await assertEmployeePortalEnabled(supabase, companyId, res))) {
      return
    }

    // Get permission types for the company (employee_self_service = true tras migración)
    const { data: permissionTypes, error: typesError } = await supabase
      .from('leave_types')
      .select('id, name, color, is_paid, requires_approval, max_days_per_year, employee_self_service')
      .eq('company_id', companyId)
      .eq('employee_self_service', true)
      .order('name')

    if (typesError) {
      logger.error('Failed to fetch permission types', {
        companyId,
        error: typesError
      })
      return res.status(500).json({ error: 'Error al obtener tipos de permisos' })
    }

    const employeePermissionTypes = permissionTypes || []

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
