import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
      userId: user.id, 
      role: userProfile?.role,
      companyId: userProfile?.company_id 
    })

    const { startDate, endDate, preset, employee_id } = req.query
    
    // Calcular fechas basado en preset si no se proporcionan fechas específicas
    let finalStartDate = startDate as string
    let finalEndDate = endDate as string
    
    if (!startDate || !endDate) {
      if (preset) {
        const { getDateRange } = require('../../../lib/attendance')
        const range = getDateRange(preset as string)
        finalStartDate = range.from.split('T')[0]
        finalEndDate = range.to.split('T')[0]
      } else {
        return res.status(400).json({ error: 'Fechas de inicio y fin o preset requeridas' })
      }
    }

    // Obtener tendencias de asistencia con filtro de empleado
    const trends = await getAttendanceTrends(supabase, userProfile, finalStartDate, finalEndDate, employee_id as string)

    return res.status(200).json({
      success: true,
      data: trends
    })

  } catch (error) {
    console.error('Error obteniendo tendencias de asistencia:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

async function getAttendanceTrends(supabase: any, userProfile: any, startDate: string, endDate: string, employeeId?: string) {
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
    // Obtener IDs de empleados de la empresa
    const { data: companyEmployees } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'active')
    
    let employeeIds = (companyEmployees || []).map((e: any) => e.id)
    
    console.log('👥 Company employees found:', employeeIds.length)
    console.log('🔍 Employee filter:', { employeeId, hasFilter: !!employeeId })
    
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
    const { data: companyEmployees } = await supabase
      .from('employees')
      .select('id, status')
      .eq('company_id', companyId)
    employeesCount = (companyEmployees || []).filter((e: any) => e.status === 'active').length
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
