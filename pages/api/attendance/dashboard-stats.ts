import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // 1. Obtener total de empleados activos
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, employee_code, base_salary, department_id')
      .eq('status', 'active')

    if (empError) {
      console.error('Error fetching employees:', empError)
      return res.status(500).json({ error: 'Error fetching employees' })
    }

    const totalEmployees = employees?.length || 0

    // 2. Obtener registros de asistencia de hoy
    const { data: todayAttendance, error: attError } = await supabase
      .from('attendance_records')
      .select(`
        *,
        employees:employee_id (
          id,
          name,
          employee_code,
          base_salary,
          department_id
        )
      `)
      .eq('date', today)

    if (attError) {
      console.error('Error fetching attendance:', attError)
      return res.status(500).json({ error: 'Error fetching attendance' })
    }

    // 3. Obtener registros de los últimos 7 días para estadísticas
    const { data: weeklyAttendance, error: weekError } = await supabase
      .from('attendance_records')
      .select('date, employee_id')
      .gte('date', sevenDaysAgo)
      .lte('date', today)

    if (weekError) {
      console.error('Error fetching weekly attendance:', weekError)
      return res.status(500).json({ error: 'Error fetching weekly attendance' })
    }

    // 4. Calcular estadísticas del día
    const presentToday = todayAttendance?.length || 0
    const absentToday = totalEmployees - presentToday
    const lateToday = todayAttendance?.filter((r: any) => r.late_minutes > 0).length || 0
    const onTimeToday = presentToday - lateToday

    // 5. Calcular costo del día
    const dailyCost = todayAttendance?.reduce((total: number, record: any) => {
      const employee = record.employees
      if (employee?.base_salary) {
        // Calcular salario diario (asumiendo 22 días laborales por mes)
        const dailySalary = employee.base_salary / 22
        return total + dailySalary
      }
      return total
    }, 0) || 0

    // 6. Calcular estadísticas de los últimos 7 días
    const dailyStats = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const dayAttendance = weeklyAttendance?.filter(r => r.date === date) || []
      const attendanceRate = totalEmployees > 0 ? (dayAttendance.length / totalEmployees) * 100 : 0
      
      dailyStats.push({
        date,
        attendanceCount: dayAttendance.length,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      })
    }

    // 7. Obtener empleados con permisos aprobados (si existe tabla de permisos)
    // Por ahora, asumimos 0 ya que no tenemos esa tabla específica
    const employeesWithApprovedLeave = 0

    // 8. Agrupar por departamento
    const departmentStats = {}
    todayAttendance?.forEach(record => {
      const deptId = record.employees?.department_id || 'Sin Departamento'
      if (!departmentStats[deptId]) {
        departmentStats[deptId] = { present: 0, total: 0 }
      }
      departmentStats[deptId].present++
    })

    // Agregar totales por departamento
    employees?.forEach(emp => {
      const deptId = emp.department_id || 'Sin Departamento'
      if (!departmentStats[deptId]) {
        departmentStats[deptId] = { present: 0, total: 0 }
      }
      departmentStats[deptId].total++
    })

    const stats = {
      // Estadísticas del día
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      onTimeToday,
      employeesWithApprovedLeave,
      dailyCost: Math.round(dailyCost * 100) / 100,
      
      // Estadísticas semanales
      dailyStats,
      
      // Estadísticas por departamento
      departmentStats,
      
      // Datos detallados para la tabla
      todayAttendance: todayAttendance?.map(record => ({
        id: record.id,
        employee_id: record.employee_id,
        employee_name: record.employees?.name,
        employee_code: record.employees?.employee_code,
        check_in: record.check_in,
        check_out: record.check_out,
        late_minutes: record.late_minutes,
        status: record.status,
        justification: record.justification
      })) || []
    }

    res.status(200).json(stats)

  } catch (error) {
    console.error('Error in dashboard stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 