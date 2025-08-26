import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { tenant } = req.query

    if (!tenant || typeof tenant !== 'string') {
      return res.status(400).json({ error: 'Tenant requerido' })
    }

    const supabase = createAdminClient()

    // Buscar empresa demo
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, subdomain')
      .eq('name', 'DEMO EMPRESARIAL  - Datos de  Prueba')
      .eq('is_active', true)
      .single()

    if (companyError || !company) {
      console.error('❌ Empresa demo no encontrada:', companyError)
      return res.status(404).json({ error: 'Entorno demo no configurado' })
    }

    console.log('✅ Usando empresa demo:', company.name, 'ID:', company.id)

    // Obtener empleados activos de esta empresa
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select(`
        id, 
        name, 
        employee_code, 
        email, 
        phone, 
        position, 
        base_salary, 
        hire_date, 
        status,
        department_id
      `)
      .eq('company_id', company.id)
      .eq('status', 'active')
      .order('name')

    if (employeesError) {
      return res.status(500).json({ error: 'Error obteniendo empleados', details: employeesError })
    }

    // Obtener departamentos
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .eq('company_id', company.id)
      .order('name')

    if (deptError) {
      console.error('Error obteniendo departamentos:', deptError)
    }

    // Crear mapa de departamentos
    const deptMap = new Map((departments || []).map(d => [d.id, d.name]))

    // Obtener scores de gamificación
    const { data: scores, error: scoresError } = await supabase
      .from('employee_scores')
      .select('employee_id, total_points')
      .eq('company_id', company.id)

    if (scoresError) {
      console.error('Error obteniendo scores:', scoresError)
    }

    // Crear mapa de scores
    const scoresMap = new Map((scores || []).map(s => [s.employee_id, s.total_points]))

    // Enriquecer empleados con información adicional
    const enrichedEmployees = (employees || []).map(emp => ({
      ...emp,
      department_name: emp.department_id ? deptMap.get(emp.department_id) || 'Sin Departamento' : 'Sin Departamento',
      gamification_points: scoresMap.get(emp.id) || 0,
      // Datos simulados para el trial
      attendance_rate: Math.floor(Math.random() * 20) + 80, // 80-100%
      last_attendance: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      performance_rating: (Math.random() * 2 + 3).toFixed(1), // 3.0-5.0
    }))

    const result = {
      company: { id: company.id, name: company.name, subdomain: company.subdomain },
      employees: enrichedEmployees,
      departments: departments || [],
      totalEmployees: enrichedEmployees.length,
      activeEmployees: enrichedEmployees.length,
      summary: {
        totalSalary: enrichedEmployees.reduce((sum, emp) => sum + (emp.base_salary || 0), 0),
        averageSalary: enrichedEmployees.length > 0 ? 
          enrichedEmployees.reduce((sum, emp) => sum + (emp.base_salary || 0), 0) / enrichedEmployees.length : 0,
        totalPoints: enrichedEmployees.reduce((sum, emp) => sum + (emp.gamification_points || 0), 0),
        averagePoints: enrichedEmployees.length > 0 ? 
          enrichedEmployees.reduce((sum, emp) => sum + (emp.gamification_points || 0), 0) / enrichedEmployees.length : 0,
      }
    }

    return res.status(200).json(result)
  } catch (error) {
    console.error('💥 Error en trial employees:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
