import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔍 Dashboard stats: Iniciando...')
    
    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log('📅 Fechas:', { today, sevenDaysAgo })

    // 1. Obtener total de empleados activos
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, employee_code, base_salary, department_id')
      .eq('status', 'active')

    if (empError) {
      console.error('❌ Error fetching employees:', empError)
      return res.status(500).json({ error: 'Error fetching employees', details: empError })
    }

    console.log('✅ Empleados obtenidos:', employees?.length || 0)
    const totalEmployees = employees?.length || 0

    // 2. Obtener registros de asistencia de hoy
    const { data: todayAttendance, error: attError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('date', today)

    if (attError) {
      console.error('❌ Error fetching attendance:', attError)
      return res.status(500).json({ error: 'Error fetching attendance', details: attError })
    }

    console.log('✅ Asistencia de hoy:', todayAttendance?.length || 0)

    // 3. Obtener registros de los últimos 7 días para estadísticas
    const { data: weeklyAttendance, error: weekError } = await supabase
      .from('attendance_records')
      .select('date, employee_id')
      .gte('date', sevenDaysAgo)
      .lte('date', today)

    if (weekError) {
      console.error('❌ Error fetching weekly attendance:', weekError)
      return res.status(500).json({ error: 'Error fetching weekly attendance', details: weekError })
    }

    console.log('✅ Asistencia semanal:', weeklyAttendance?.length || 0)

    // 4. Calcular estadísticas del día
    const presentToday = todayAttendance?.length || 0
    const absentToday = totalEmployees - presentToday
    const lateToday = todayAttendance?.filter((r: any) => r.late_minutes > 0).length || 0
    const onTimeToday = presentToday - lateToday

    // 5. Calcular costo del día (simplificado)
    const dailyCost = presentToday * 500 // Valor estimado por empleado

    // 6. Calcular estadísticas de los últimos 7 días
    const dailyStats = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const dayAttendance = weeklyAttendance?.filter((r: any) => r.date === date) || []
      const attendanceRate = totalEmployees > 0 ? (dayAttendance.length / totalEmployees) * 100 : 0
      
      dailyStats.push({
        date,
        attendanceCount: dayAttendance.length,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      })
    }

    // 7. Empleados con permisos aprobados (simplificado)
    const employeesWithApprovedLeave = 0

    // 8. Agrupar por departamento (simplificado)
    const departmentStats: Record<string, { present: number; total: number }> = {}
    employees?.forEach((emp: any) => {
      const dept = emp.department_id || 'Sin Departamento'
      if (!departmentStats[dept]) {
        departmentStats[dept] = { present: 0, total: 0 }
      }
      departmentStats[dept].total++
      
      // Verificar si el empleado está presente hoy
      const isPresent = todayAttendance?.some((att: any) => att.employee_id === emp.id)
      if (isPresent) {
        departmentStats[dept].present++
      }
    })

    // 9. Asistencia de hoy con detalles
    const todayAttendanceDetails = todayAttendance?.map((att: any) => {
      const employee = employees?.find((emp: any) => emp.id === att.employee_id)
      return {
        id: att.id,
        employee_id: att.employee_id,
        employee_name: employee?.name || 'N/A',
        employee_code: employee?.employee_code || 'N/A',
        check_in: att.check_in,
        check_out: att.check_out,
        late_minutes: att.late_minutes || 0,
        status: att.status || 'present',
        justification: att.justification || ''
      }
    }) || []

    const result = {
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      onTimeToday,
      employeesWithApprovedLeave,
      dailyCost,
      dailyStats,
      departmentStats,
      todayAttendance: todayAttendanceDetails
    }

    console.log('✅ Estadísticas calculadas:', {
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      dailyCost
    })

    res.status(200).json(result)

  } catch (error) {
    console.error('❌ Error general en dashboard stats:', error)
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
} 