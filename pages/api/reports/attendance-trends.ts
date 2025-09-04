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
    .select('date, status, check_in, employee_id, late_minutes')
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
    
    // FILTRAR POR EMPLEADO ESPECÍFICO si se proporciona
    if (employeeId && employeeId.trim() !== '') {
      employeeIds = employeeIds.filter((id: string) => id === employeeId.trim())
    }
    
    if (employeeIds.length > 0) {
      attendanceQuery = attendanceQuery.in('employee_id', employeeIds)
    } else {
      attendanceQuery = attendanceQuery.eq('employee_id', '__none__')
    }
  }

  const { data, error } = await attendanceQuery

  if (error) throw error

  // Agrupar por fecha y contar presentes/tarde; ausentes = empleados_activos - (presentes + tarde)
  const trendMap = new Map<string, { present: number; late: number; checkInTimes: string[] }>()

  data?.forEach((record: any) => {
    const date = record.date
    if (!trendMap.has(date)) {
      trendMap.set(date, { present: 0, late: 0, checkInTimes: [] })
    }

    const trend = trendMap.get(date)!
    if (record.status === 'present') {
      trend.present++
    } else if (record.status === 'late') {
      trend.late++
    }
    
    // Agregar hora de entrada si existe
    if (record.check_in) {
      trend.checkInTimes.push(record.check_in)
    }
  })

  // Determinar base de empleados (ajustado para empleado específico)
  let employeesCount = 0
  if (employeeId && employeeId.trim() !== '') {
    // Si filtramos por empleado específico, la base es 1
    employeesCount = 1
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
    const absent = Math.max(0, employeesCount - (counts.present + counts.late))
    return {
      date,
      present: counts.present,
      late: counts.late,
      absent,
      checkInTimes: counts.checkInTimes, // Incluir horas de entrada
    }
  })

  return trends
}
