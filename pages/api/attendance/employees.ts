import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { getCompanyData } from '../../../lib/helpers/company-filter'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }
    
    // Obtener empleados activos con información básica filtrados por empresa
    const { data: employees, error } = await getCompanyData(
      supabase,
      'employees',
      companyId,
      `
        id,
        name,
        dni,
        employee_code,
        status,
        company_id,
        department_id,
        departments:department_id(id, name)
      `,
      { status: 'active' }
    ).order('name', { ascending: true })

    if (error) {
      console.error('Error fetching employees:', error)
      return res.status(500).json({ error: 'Error al obtener empleados' })
    }

    res.status(200).json(employees || [])
  } catch (error: any) {
    console.error('Attendance employees API error:', error)
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}
