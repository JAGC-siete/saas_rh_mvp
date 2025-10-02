import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'

interface ListEmployeesResponse {
  success: boolean
  employees?: any[]
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ListEmployeesResponse>) {
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

    // Obtener empleados de la empresa del admin
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, email, role, status')
      .eq('company_id', userProfile.company_id)
      .eq('status', 'active')
      .order('name', { ascending: true })

    if (employeesError) {
      logger.error('Failed to fetch employees', { error: employeesError })
      return res.status(500).json({
        success: false,
        error: 'Error obteniendo empleados'
      })
    }

    return res.status(200).json({
      success: true,
      employees: employees || []
    })

  } catch (error) {
    logger.error('List employees error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}
