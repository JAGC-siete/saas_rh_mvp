import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getTodayInHonduras, getHondurasTime, getHondurasTimeISO } from '../../../lib/timezone'

// Use service role key for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔍 Dashboard stats: Iniciando...')
    // 🌎 Obtener timestamp con zona horaria de Tegucigalpa
    console.log('📅 Timestamp:', getHondurasTimeISO())
    
    // Use Honduras timezone for today's date
    const today = getTodayInHonduras()
    const hondurasTime = getHondurasTime()
    const sevenDaysAgo = new Date(hondurasTime.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log('📅 Fechas calculadas:', { today, sevenDaysAgo })

    // 1. Obtener total de empleados activos
    console.log('👥 PASO 1: Obteniendo empleados activos...')
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, employee_code, base_salary, department_id')
      .eq('status', 'active')

    if (empError) {
      console.error('❌ Error fetching employees:', empError)
      return res.status(500).json({ error: 'Error fetching employees', details: empError })
    }

    console.log('✅ Empleados obtenidos:', employees?.length || 0)
    console.log('📋 Ejemplos de empleados:', employees?.slice(0, 3).map((emp: any) => ({ name: emp.name, code: emp.employee_code })))
    const totalEmployees = employees?.length || 0

    // 2. Obtener registros de asistencia de hoy
    console.log('📊 PASO 2: Obteniendo registros de asistencia de hoy...')
    const { data: todayAttendance, error: attError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('date', today)

    if (attError) {
      console.error('❌ Error fetching attendance:', attError)
      return res.status(500).json({ error: 'Error fetching attendance', details: attError })
    }

    console.log('✅ Asistencia de hoy:', todayAttendance?.length || 0)
    console.log('📋 Ejemplos de registros:', todayAttendance?.slice(0, 3).map((att: any) => ({ 
      employee_id: att.employee_id, 
      check_in: att.check_in, 
      status: att.status, 
      late_minutes: att.late_minutes 
    })))

    // 3. Obtener registros de los últimos 7 días para estadísticas
    console.log('📈 PASO 3: Obteniendo estadísticas semanales...')
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
    console.log('🧮 PASO 4: Calculando estadísticas del día...')
    const presentToday = todayAttendance?.length || 0
    const absentToday = totalEmployees - presentToday
    const lateToday = todayAttendance?.filter((r: any) => r.late_minutes > 0).length || 0
    const onTimeToday = presentToday - lateToday

    console.log('📊 Estadísticas calculadas:', {
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      onTimeToday
    })

    // 5. Calcular costo del día (simplificado)
    const dailyCost = presentToday * 500 // Valor estimado por empleado
    console.log('💰 Costo diario calculado:', dailyCost)

    // 6. Calcular estadísticas de los últimos 7 días
    console.log('📅 PASO 5: Calculando estadísticas de los últimos 7 días...')
    const dailyStats = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(hondurasTime.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const dayAttendance = weeklyAttendance?.filter((r: any) => r.date === date) || []
      const attendanceRate = totalEmployees > 0 ? (dayAttendance.length / totalEmployees) * 100 : 0
      
      dailyStats.push({
        date,
        attendanceCount: dayAttendance.length,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      })
    }

    console.log('📈 Estadísticas diarias generadas:', dailyStats.length, 'días')

    // 7. Empleados con permisos aprobados (simplificado)
    const employeesWithApprovedLeave = 0

    // 8. Agrupar por departamento (simplificado)
    console.log('🏢 PASO 6: Agrupando por departamento...')
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

    console.log('🏢 Estadísticas por departamento:', Object.keys(departmentStats).length, 'departamentos')

    // 9. Asistencia de hoy con detalles
    console.log('📋 PASO 7: Generando detalles de asistencia de hoy...')
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

    console.log('📋 Detalles de asistencia generados:', todayAttendanceDetails.length, 'registros')
    console.log('📋 Ejemplos de detalles:', todayAttendanceDetails.slice(0, 3).map((detail: any) => ({
      name: detail.employee_name,
      code: detail.employee_code,
      status: detail.status,
      late_minutes: detail.late_minutes
    })))

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

    console.log('✅ RESPUESTA FINAL GENERADA:')
    console.log('📊 Resumen:', {
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      onTimeToday,
      dailyCost,
      todayAttendanceCount: todayAttendanceDetails.length
    })

    console.log('🚀 Enviando respuesta al frontend...')
    res.status(200).json(result)
    console.log('✅ Respuesta enviada exitosamente')

  } catch (error) {
    console.error('❌ Error general en dashboard stats:', error)
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
} 