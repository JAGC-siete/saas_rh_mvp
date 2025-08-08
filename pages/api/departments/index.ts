import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🏢 Departments API: Iniciando fetch de datos...')

    // Create Supabase client for Pages API
    const supabase = createClient(req, res)

    // Get user session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session?.user) {
      console.error('❌ Auth error:', authError)
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const user = session.user

    // Get user's company_id
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !userProfile?.company_id) {
      return res.status(400).json({ error: 'User profile not found or no company assigned' })
    }

    // 1. Obtener todos los departamentos de la compañía del usuario
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name, description, created_at')
      .eq('company_id', userProfile.company_id)
      .order('name')

    if (deptError) {
      console.error('❌ Error fetching departments:', deptError)
      return res.status(500).json({ error: 'Error fetching departments' })
    }

    console.log('✅ Departments obtenidos:', departments?.length || 0)

    // 2. Obtener empleados activos de la compañía del usuario
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, department_id, base_salary, status')
      .eq('company_id', userProfile.company_id)
      .eq('status', 'active')

    if (empError) {
      console.error('❌ Error fetching employees:', empError)
      return res.status(500).json({ error: 'Error fetching employees' })
    }

    console.log('✅ Empleados activos obtenidos:', employees?.length || 0)

    const response = {
      departments: departments || [],
      summary: {
        totalDepartments: departments?.length || 0,
        totalEmployees: employees?.length || 0
      }
    }

    console.log('✅ Departments API: Datos procesados exitosamente')
    console.log('📊 Resumen:', {
      totalDepartments: response.summary.totalDepartments,
      totalEmployees: response.summary.totalEmployees
    })

    res.status(200).json(response)

  } catch (error) {
    console.error('💥 Departments API: Error inesperado:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 