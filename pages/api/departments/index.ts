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

    // Get user (more secure than getSession)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user's company_id (optional for now)
    let companyId = '00000000-0000-0000-0000-000000000001' // Default company ID
    
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single()

      if (!profileError && userProfile?.company_id) {
        companyId = userProfile.company_id
      }
    } catch (error) {
      console.log('⚠️ No user profile found, using default company ID')
    }

    // 1. Obtener todos los departamentos de la compañía del usuario
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name, description, created_at')
      .eq('company_id', companyId)
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
      .eq('company_id', companyId)
      .eq('status', 'active')

    if (empError) {
      console.error('❌ Error fetching employees:', empError)
      return res.status(500).json({ error: 'Error fetching employees' })
    }

    console.log('✅ Empleados activos obtenidos:', employees?.length || 0)

    // 3. Generar estadísticas por departamento
    const departmentStats: { [key: string]: any } = {}
    let totalSalary = 0

    // Si no hay departamentos, calcular salario total de todos los empleados
    if (!departments || departments.length === 0) {
      totalSalary = employees?.reduce((sum, emp) => sum + (emp.base_salary || 0), 0) || 0
    } else {
      departments.forEach(dept => {
        const deptEmployees = employees?.filter(emp => emp.department_id === dept.id) || []
        const deptSalary = deptEmployees.reduce((sum, emp) => sum + (emp.base_salary || 0), 0)
        const avgSalary = deptEmployees.length > 0 ? deptSalary / deptEmployees.length : 0
        
        departmentStats[dept.name] = {
          id: dept.id,
          name: dept.name,
          description: dept.description || '',
          employeeCount: deptEmployees.length,
          totalSalary: deptSalary,
          averageSalary: avgSalary,
          employees: deptEmployees
        }
        
        totalSalary += deptSalary
      })
    }

    const response = {
      departments: departments || [],
      departmentStats,
      summary: {
        totalDepartments: departments?.length || 0,
        totalEmployees: employees?.length || 0,
        totalSalary,
        averageSalary: employees?.length > 0 ? totalSalary / employees.length : 0
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