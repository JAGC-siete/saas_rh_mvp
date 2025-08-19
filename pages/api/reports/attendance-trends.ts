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

  // Obtener registros de asistencia del período - FILTRADO POR COMPANY a través de employees
  // Usar la relación específica attendance_records_employee_id_fkey
  const { data, error } = await supabase
    .from('attendance_records')
    .select(`
      date, 
      status, 
      check_in,
      employees!attendance_records_employee_id_fkey(company_id)
    `)
    .eq('employees.company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')

  if (error) throw error

  // Agrupar por fecha y contar estados
  const trendMap = new Map<string, { present: number; absent: number; late: number }>()
  
  data?.forEach((record: any) => {
    const date = record.date
    if (!trendMap.has(date)) {
      trendMap.set(date, { present: 0, absent: 0, late: 0 })
    }
    
    const trend = trendMap.get(date)!
    if (record.status === 'present') {
      trend.present++
    } else if (record.status === 'absent') {
      trend.absent++
    } else if (record.status === 'late') {
      trend.late++
    }
  })

  const trends = Array.from(trendMap.entries()).map(([date, counts]) => ({
    date,
    ...counts
  }))

  return trends
}
