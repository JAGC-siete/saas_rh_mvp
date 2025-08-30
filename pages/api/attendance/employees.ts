import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createAdminClient()
    
    // Obtener empleados activos con información básica
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        dni,
        employee_code,
        status,
        company_id
      `)
      .eq('status', 'active')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching employees:', error)
      return res.status(500).json({ error: 'Error al obtener empleados' })
    }

    // Filtrar solo empleados con company_id válido (opcional)
    const validEmployees = employees?.filter(emp => emp.company_id) || []

    res.status(200).json(validEmployees)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
