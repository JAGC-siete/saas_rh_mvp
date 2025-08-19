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

    const { startDate, endDate } = req.query
    
    // Validaciones
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Fechas de inicio y fin requeridas' })
    }

    // Obtener tendencias de asistencia
    const trends = await getAttendanceTrends(supabase, userProfile, startDate as string, endDate as string)

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

async function getAttendanceTrends(supabase: any, userProfile: any, startDate: string, endDate: string) {
  const companyId = userProfile?.company_id

  // Obtener registros de asistencia del período - FILTRADO POR COMPANY
  // attendance_records podría no tener company_id; filtrar por empleados de la empresa si aplica
  let attendanceQuery = supabase
    .from('attendance_records')
    .select('date, status, check_in, employee_id')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')

  if (companyId) {
    // Obtener IDs de empleados de la empresa
    const { data: companyEmployees } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
    const employeeIds = (companyEmployees || []).map((e: any) => e.id)
    if (employeeIds.length > 0) {
      attendanceQuery = attendanceQuery.in('employee_id', employeeIds)
    } else {
      attendanceQuery = attendanceQuery.eq('employee_id', '__none__')
    }
  }

  const { data, error } = await attendanceQuery

  if (error) throw error

  // Agrupar por fecha y contar presentes/tarde; ausentes = empleados_activos - (presentes + tarde)
  const trendMap = new Map<string, { present: number; late: number }>()

  data?.forEach((record: any) => {
    const date = record.date
    if (!trendMap.has(date)) {
      trendMap.set(date, { present: 0, late: 0 })
    }

    const trend = trendMap.get(date)!
    if (record.status === 'present') {
      trend.present++
    } else if (record.status === 'late') {
      trend.late++
    }
  })

  // Determinar base de empleados
  let employeesCount = 0
  if (companyId) {
    // companyEmployees fue consultado arriba
    const { data: companyEmployees } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
    employeesCount = (companyEmployees || []).length
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
    }
  })

  return trends
}
