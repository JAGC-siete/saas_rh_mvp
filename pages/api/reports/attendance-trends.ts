import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
import { withInputValidation, createSecureErrorResponse } from '../../../lib/security/input-validation'
import { withReportsRateLimit } from '../../../lib/security/rate-limiting'
import { getDateRange } from '../../../lib/attendance'

// Aplicar rate limiting y validación de entrada
const handlerWithSecurity = withReportsRateLimit()(
  withInputValidation(attendanceTrendsHandler)
)

export default handlerWithSecurity

async function attendanceTrendsHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 🔒 AUTENTICACIÓN REQUERIDA CON PERMISOS DE REPORTS
    const authResult = await authenticateUser(req, res, ['can_view_reports'])
    
    if (!authResult.success) {
      return res.status(401).json({ 
        error: authResult.error,
        message: authResult.message
      })
    }

    const { user, userProfile } = authResult
    const supabase = createClient(req, res)

    console.log('🔐 Usuario autenticado para tendencias de asistencia:', { 
      userId: user.id.substring(0, 8) + '...', // Ocultar ID completo
      role: userProfile?.role,
      companyId: '***' // Ocultar company_id
    })

    // Obtener parámetros de query (preset o fechas específicas)
    const { preset, startDate, endDate, employee_id, role } = req.query
    
    // Usar preset si está disponible, sino usar fechas específicas
    let dateRange: { startDate: string; endDate: string }
    if (preset && typeof preset === 'string') {
      const range = getDateRange(preset)
      dateRange = { startDate: range.from.split('T')[0], endDate: range.to.split('T')[0] }
    } else {
      dateRange = { 
        startDate: (startDate as string) || new Date().toISOString().split('T')[0], 
        endDate: (endDate as string) || new Date().toISOString().split('T')[0] 
      }
    }

    // Obtener tendencias de asistencia con filtro de empleado y role
    const trends = await getAttendanceTrends(supabase, userProfile, dateRange.startDate, dateRange.endDate, employee_id as string, role as string)

    return res.status(200).json({
      success: true,
      data: trends
    })

  } catch (error) {
    console.error('Error obteniendo tendencias de asistencia:', error)
    return res.status(500).json(createSecureErrorResponse(error, 'obtener tendencias de asistencia'))
  }
}

async function getAttendanceTrends(supabase: any, userProfile: any, startDate: string, endDate: string, employeeId?: string, role?: string) {
  const companyId = userProfile?.company_id

  // Obtener registros de asistencia del período - FILTRADO POR COMPANY Y EMPLEADO
  let attendanceQuery = supabase
    .from('attendance_records')
    .select(`
      date, 
      status, 
      check_in, 
      employee_id, 
      late_minutes,
      employees!attendance_records_employee_id_fkey(name, employee_code)
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')

  if (companyId) {
    // Obtener IDs de empleados de la empresa con filtro por role
    let employeeQuery = supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'active')
    
    // Aplicar filtro por role si se proporciona
    if (role && role.trim() !== '') {
      employeeQuery = employeeQuery.eq('role', role.trim())
    }
    
    const { data: companyEmployees } = await employeeQuery
    let employeeIds = (companyEmployees || []).map((e: any) => e.id)
    
    console.log('👥 Company employees found:', employeeIds.length)
    console.log('🔍 Employee filter:', { employeeId, hasFilter: !!employeeId })
    console.log('🔍 Role filter:', { role, hasFilter: !!role })
    
    // FILTRAR POR EMPLEADO ESPECÍFICO si se proporciona
    if (employeeId && employeeId.trim() !== '') {
      employeeIds = employeeIds.filter((id: string) => id === employeeId.trim())
      console.log('🎯 Filtered to specific employee:', employeeIds)
    }
    
    if (employeeIds.length > 0) {
      attendanceQuery = attendanceQuery.in('employee_id', employeeIds)
      console.log('✅ Query filtered to employee IDs:', employeeIds)
    } else {
      attendanceQuery = attendanceQuery.eq('employee_id', '__none__')
      console.log('❌ No employees found, using fallback filter')
    }
  }

  const { data, error } = await attendanceQuery

  if (error) throw error

  // Debug: Log exact data being returned for September 1st investigation
  console.log('🔍 DEBUG - Attendance trends query results:')
  console.log('📅 Date range:', { startDate, endDate })
  console.log('📊 Total records found:', data?.length || 0)
  
  if (data && data.length > 0) {
    // Filter for September 1st specifically
    const sept1Records = data.filter((r: any) => r.date === '2025-09-01')
    console.log('🚨 SEPTEMBER 1st RECORDS:', sept1Records.length)
    if (sept1Records.length > 0) {
      console.log('📋 September 1st data:', sept1Records.map((r: any) => ({
        employee_id: r.employee_id,
        employee_name: r.employees?.name,
        check_in: r.check_in,
        date: r.date
      })))
    }
    
    // Show all dates in the data
    const allDates = [...new Set(data.map((r: any) => r.date))].sort()
    console.log('📅 All dates in results:', allDates)
    
    // Show all records for debugging
    console.log('📋 ALL RECORDS:', data.map((r: any) => ({
      date: r.date,
      employee: r.employees?.name,
      check_in: r.check_in
    })))
  }

  // Agrupar por fecha y contar presentes/tarde; ausentes = empleados_activos - (presentes + tarde)
  const trendMap = new Map<string, { present: number; late: number; checkInTimes: Array<{time: string, employee: string}> }>()

  data?.forEach((record: any) => {
    const date = record.date
    if (!trendMap.has(date)) {
      trendMap.set(date, { present: 0, late: 0, checkInTimes: [] })
    }

    const trend = trendMap.get(date)!
    if (record.late_minutes !== null) {
      if (record.late_minutes < -5) {
        // Early - count as present
        trend.present++
      } else if (record.late_minutes > 5) {
        trend.late++
      } else {
        // On time - count as present
        trend.present++
      }
    }
    
    // Agregar hora de entrada con nombre del empleado si existe
    if (record.check_in) {
      trend.checkInTimes.push({
        time: record.check_in,
        employee: record.employees?.name || record.employees?.employee_code || 'Empleado'
      })
    }
  })

  // Determinar base de empleados (ajustado para empleado específico)
  let employeesCount = 0
  if (employeeId && employeeId.trim() !== '') {
    // Si filtramos por empleado específico, la base es el número de días laborales en el período
    const start = new Date(startDate)
    const end = new Date(endDate)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    employeesCount = Math.max(1, daysDiff) // Mínimo 1 día
  } else if (companyId) {
    let employeeCountQuery = supabase
      .from('employees')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('status', 'active')
    
    // Aplicar filtro por role si se proporciona
    if (role && role.trim() !== '') {
      employeeCountQuery = employeeCountQuery.eq('role', role.trim())
    }
    
    const { data: companyEmployees } = await employeeCountQuery
    employeesCount = (companyEmployees || []).length
  } else {
    // Fallback: usar empleados observados en registros
    employeesCount = new Set((data || []).map((r: any) => r.employee_id)).size
  }

  const trends = Array.from(trendMap.entries()).map(([date, counts]) => {
    // Si no hay registros de asistencia para esta fecha, no asumir que todos estuvieron ausentes
    // Podría ser un día no laboral (oficina cerrada, feriado, etc.)
    const hasAttendanceRecords = counts.present > 0 || counts.late > 0 || counts.checkInTimes.length > 0
    
    // Solo calcular ausentes si hay registros de asistencia para esa fecha
    // Esto evita mostrar "todos ausentes" en días no laborales
    const absent = hasAttendanceRecords 
      ? Math.max(0, employeesCount - (counts.present + counts.late))
      : 0
    
    return {
      date,
      present: counts.present,
      late: counts.late,
      absent,
      checkInTimes: counts.checkInTimes, // Incluir horas de entrada
    }
  }).filter(trend => {
    // Filtrar fechas que no tienen registros de asistencia para evitar mostrar días no laborales
    // Solo mostrar fechas donde realmente hubo actividad
    return trend.present > 0 || trend.late > 0 || trend.checkInTimes.length > 0
  })

  return trends
}
