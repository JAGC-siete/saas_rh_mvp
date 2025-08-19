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

    console.log('🔐 Usuario autenticado para dashboard stats:', { 
      userId: user.id, 
      role: userProfile?.role,
      companyId: userProfile?.company_id 
    })

    const { startDate, endDate } = req.query
    
    // Validaciones
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Fechas de inicio y fin requeridas' })
    }

    // Obtener estadísticas del dashboard
    const stats = await getDashboardStats(supabase, userProfile, startDate as string, endDate as string)

    return res.status(200).json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

async function getDashboardStats(supabase: any, userProfile: any, startDate: string, endDate: string) {
  const companyId = userProfile?.company_id

  // Total y empleados activos - FILTRADO POR COMPANY
  let employeesQuery = supabase
    .from('employees')
    .select('id, status')
    .eq('company_id', companyId)

  const { data: employees, error: employeesError } = await employeesQuery

  if (employeesError) throw employeesError

  const totalEmployees = employees?.length || 0
  const activeEmployees = employees?.filter((emp: any) => emp.status === 'active').length || 0

  // Asistencia del período - FILTRADO POR COMPANY
  let attendanceQuery = supabase
    .from('attendance_records')
    .select('id, status, date')
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate)

  const { data: attendance, error: attendanceError } = await attendanceQuery

  if (attendanceError) throw attendanceError

  const totalAttendance = attendance?.length || 0
  const presentDays = attendance?.filter((r: any) => r.status === 'present').length || 0
  const lateDays = attendance?.filter((r: any) => r.status === 'late').length || 0
  const absentDays = attendance?.filter((r: any) => r.status === 'absent').length || 0

  // Nóminas pendientes - FILTRADO POR COMPANY
  let payrollQuery = supabase
    .from('payroll_records')
    .select('id, status')
    .eq('status', 'draft')

  if (companyId) {
    payrollQuery = payrollQuery.eq('company_id', companyId)
  }

  const { data: payrolls, error: payrollsError } = await payrollQuery

  if (payrollsError) throw payrollsError

  const pendingPayrolls = payrolls?.length || 0

  // Permisos del período - FILTRADO POR COMPANY
  let leavesQuery = supabase
    .from('leave_requests')
    .select('id, status, start_date, end_date')
    .gte('start_date', startDate)
    .lte('end_date', endDate)
    .eq('status', 'approved')

  if (companyId) {
    leavesQuery = leavesQuery.eq('company_id', companyId)
  }

  const { data: leaves, error: leavesError } = await leavesQuery

  if (leavesError) throw leavesError

  const thisPeriodLeaves = leaves?.length || 0

  // Calcular métricas
  const attendanceRate = totalAttendance > 0 ? ((presentDays + lateDays) / totalAttendance * 100) : 0
  const punctualityRate = totalAttendance > 0 ? (presentDays / totalAttendance * 100) : 0

  return {
    totalEmployees,
    activeEmployees,
    totalAttendance,
    presentDays,
    lateDays,
    absentDays,
    attendanceRate: Math.round(attendanceRate * 100) / 100,
    punctualityRate: Math.round(punctualityRate * 100) / 100,
    pendingPayrolls,
    thisPeriodLeaves,
    period: { startDate, endDate }
  }
}
