import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { getCompanyData } from '../../../lib/helpers/company-filter'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const { startDate, endDate } = req.query
    
    // Validaciones
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Fechas de inicio y fin requeridas' })
    }

    // Obtener estadísticas del dashboard
    const stats = await getDashboardStats(supabase, companyId, startDate as string, endDate as string)

    return res.status(200).json({
      success: true,
      data: stats
    })

  } catch (error: any) {
    console.error('Error obteniendo estadísticas del dashboard:', error)
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({
      error: error.message || 'Internal server error'
    })
  }
}

async function getDashboardStats(supabase: any, companyId: string, startDate: string, endDate: string) {
  // Total y empleados activos - usando getCompanyData
  const { data: employees, error: employeesError } = await getCompanyData(
    supabase,
    'employees',
    companyId,
    'id, status'
  )

  if (employeesError) throw employeesError

  const totalEmployees = employees?.length || 0
  const activeEmployees = employees?.filter((emp: any) => emp.status === 'active').length || 0

  // Asistencia del período - filtrar por empleados de la empresa
  const employeeIds = (employees || []).map((e: any) => e.id)
  
  let attendanceQuery = supabase
    .from('attendance_records')
    .select('id, status, date, employee_id')
    .gte('date', startDate)
    .lte('date', endDate)

  if (employeeIds.length > 0) {
    attendanceQuery = attendanceQuery.in('employee_id', employeeIds)
  } else {
    attendanceQuery = attendanceQuery.eq('employee_id', '__none__')
  }

  const { data: attendance, error: attendanceError } = await attendanceQuery

  if (attendanceError) throw attendanceError

  const totalAttendance = attendance?.length || 0
  const presentDays = attendance?.filter((r: any) => r.status === 'present').length || 0
  const lateDays = attendance?.filter((r: any) => r.status === 'late').length || 0
  const absentDays = attendance?.filter((r: any) => r.status === 'absent').length || 0

  // Nóminas pendientes - usando getCompanyData
  const { data: payrolls, error: payrollsError } = await getCompanyData(
    supabase,
    'payroll_records',
    companyId,
    'id, status',
    { status: 'draft' }
  )

  if (payrollsError) throw payrollsError

  const pendingPayrolls = payrolls?.length || 0

  // Permisos del período - usando getCompanyData
  const { data: leaves, error: leavesError } = await getCompanyData(
    supabase,
    'leave_requests',
    companyId,
    'id, status, start_date, end_date',
    { 
      status: 'approved',
      start_date: { gte: startDate },
      end_date: { lte: endDate }
    }
  )

  if (leavesError) throw leavesError

  const thisPeriodLeaves = leaves?.length || 0

  // Calcular métricas normalizadas por día del período
  const start = new Date(startDate)
  const end = new Date(endDate)
  const daysInRange = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  const expectedAttendances = (activeEmployees || 0) * daysInRange
  const attendanceRate = expectedAttendances > 0 ? ((presentDays + lateDays) / expectedAttendances * 100) : 0
  const punctualityRate = expectedAttendances > 0 ? (presentDays / expectedAttendances * 100) : 0

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
