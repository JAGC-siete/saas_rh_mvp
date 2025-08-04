import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fwyxmovfrzauebiqxchz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🏢 Departments API: Iniciando fetch de datos...')

    // 1. Obtener todos los departamentos
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name, description, created_at')
      .order('name')

    if (deptError) {
      console.error('❌ Error fetching departments:', deptError)
      return res.status(500).json({ error: 'Error fetching departments' })
    }

    console.log('✅ Departments obtenidos:', departments?.length || 0)

    // 2. Obtener empleados con sus departamentos y salarios
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select(`
        id, 
        name, 
        department_id, 
        base_salary, 
        status,
        departments!inner(name)
      `)
      .eq('status', 'active')

    if (empError) {
      console.error('❌ Error fetching employees:', empError)
      return res.status(500).json({ error: 'Error fetching employees' })
    }

    console.log('✅ Empleados activos obtenidos:', employees?.length || 0)

    // 3. Calcular estadísticas por departamento
    const departmentStats: { [key: string]: any } = {}

    departments?.forEach(dept => {
      const deptEmployees = employees?.filter(emp => emp.department_id === dept.id) || []
      const totalSalary = deptEmployees.reduce((sum, emp) => sum + (emp.base_salary || 0), 0)
      const avgSalary = deptEmployees.length > 0 ? totalSalary / deptEmployees.length : 0

      departmentStats[dept.name] = {
        id: dept.id,
        name: dept.name,
        description: dept.description,
        employeeCount: deptEmployees.length,
        totalSalary: totalSalary,
        averageSalary: avgSalary,
        employees: deptEmployees.map(emp => ({
          id: emp.id,
          name: emp.name,
          base_salary: emp.base_salary,
          status: emp.status
        }))
      }
    })

    // 4. Calcular estadísticas generales
    const totalEmployees = employees?.length || 0
    const totalSalary = employees?.reduce((sum, emp) => sum + (emp.base_salary || 0), 0) || 0
    const averageSalary = totalEmployees > 0 ? totalSalary / totalEmployees : 0

    const response = {
      departments: departments,
      departmentStats: departmentStats,
      summary: {
        totalDepartments: departments?.length || 0,
        totalEmployees: totalEmployees,
        totalSalary: totalSalary,
        averageSalary: averageSalary
      }
    }

    console.log('✅ Departments API: Datos procesados exitosamente')
    console.log('📊 Resumen:', {
      totalDepartments: response.summary.totalDepartments,
      totalEmployees: response.summary.totalEmployees,
      totalSalary: response.summary.totalSalary
    })

    res.status(200).json(response)

  } catch (error) {
    console.error('💥 Departments API: Error inesperado:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 