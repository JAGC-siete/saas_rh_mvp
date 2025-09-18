import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'

interface EmployeeDashboardResponse {
  employee: {
    id: string
    name: string
    dni_masked: string
    role: string
    email?: string
    phone?: string
    hire_date?: string
    department?: {
      id: string
      name: string
    }
    work_schedule?: {
      id: string
      name: string
      [key: string]: any
    }
    base_salary_masked: boolean
    status: string
  }
  attendance_summary: {
    summary: {
      totalDays: number
      presentDays: number
      absentDays: number
      lateDays: number
      totalHours: number
      averageHours: number
    }
  }
  recent_attendance: Array<{
    id: string
    date: string
    check_in?: string
    check_out?: string
    status: string
    hours_worked?: number
  }>
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)
    
    // Get current user from Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }
    
    // Get employee ID from user metadata
    const employeeId = user.user_metadata?.employee_id
    if (!employeeId) {
      return res.status(401).json({ error: 'Datos de empleado no encontrados' })
    }

    // Get employee profile
    const { data: employeeDetails, error: profileError } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        dni,
        role,
        email,
        phone,
        hire_date,
        status,
        departments:department_id(
          id,
          name
        ),
        work_schedules:work_schedule_id(
          id,
          name,
          monday_start,
          monday_end,
          tuesday_start,
          tuesday_end,
          wednesday_start,
          wednesday_end,
          thursday_start,
          thursday_end,
          friday_start,
          friday_end,
          saturday_start,
          saturday_end,
          sunday_start,
          sunday_end
        )
      `)
      .eq('id', employeeId)
      .single()

    if (profileError || !employeeDetails) {
      logger.error('Failed to get employee details', profileError)
      return res.status(404).json({ error: 'Empleado no encontrado' })
    }

    // Get attendance data for current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance_records')
      .select(`
        id,
        date,
        check_in,
        check_out,
        status,
        hours_worked
      `)
      .eq('employee_id', employeeId)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .order('date', { ascending: false })

    if (attendanceError) {
      logger.error('Failed to get attendance records', attendanceError)
    }

    // Calculate attendance summary
    const records = attendanceRecords || []
    const totalDays = records.length
    const presentDays = records.filter(r => r.status === 'present').length
    const absentDays = records.filter(r => r.status === 'absent').length
    const lateDays = records.filter(r => r.status === 'late').length
    const totalHours = records.reduce((sum, r) => sum + (r.hours_worked || 0), 0)
    const averageHours = totalDays > 0 ? totalHours / totalDays : 0

    // Mask sensitive information
    const dniMasked = employeeDetails.dni?.length > 9 
      ? `${employeeDetails.dni.substring(0, 4)}****${employeeDetails.dni.slice(-5)}`
      : `****${employeeDetails.dni?.slice(-5) || ''}`

    // Log access for audit
    logger.info('Employee accessed dashboard', {
      employeeId: employeeId,
      employeeName: employeeDetails.name,
      userId: user.id,
      action: 'view_dashboard'
    })

    const response: EmployeeDashboardResponse = {
      employee: {
        id: employeeDetails.id,
        name: employeeDetails.name,
        dni_masked: dniMasked,
        role: employeeDetails.role || 'Empleado',
        email: employeeDetails.email || undefined,
        phone: employeeDetails.phone || undefined,
        hire_date: employeeDetails.hire_date || undefined,
        department: (employeeDetails.departments as any) ? {
          id: (employeeDetails.departments as any).id,
          name: (employeeDetails.departments as any).name
        } : undefined,
        work_schedule: (employeeDetails.work_schedules as any) ? {
          id: (employeeDetails.work_schedules as any).id,
          name: (employeeDetails.work_schedules as any).name,
          monday_start: (employeeDetails.work_schedules as any).monday_start,
          monday_end: (employeeDetails.work_schedules as any).monday_end,
          tuesday_start: (employeeDetails.work_schedules as any).tuesday_start,
          tuesday_end: (employeeDetails.work_schedules as any).tuesday_end,
          wednesday_start: (employeeDetails.work_schedules as any).wednesday_start,
          wednesday_end: (employeeDetails.work_schedules as any).wednesday_end,
          thursday_start: (employeeDetails.work_schedules as any).thursday_start,
          thursday_end: (employeeDetails.work_schedules as any).thursday_end,
          friday_start: (employeeDetails.work_schedules as any).friday_start,
          friday_end: (employeeDetails.work_schedules as any).friday_end,
          saturday_start: (employeeDetails.work_schedules as any).saturday_start,
          saturday_end: (employeeDetails.work_schedules as any).saturday_end,
          sunday_start: (employeeDetails.work_schedules as any).sunday_start,
          sunday_end: (employeeDetails.work_schedules as any).sunday_end
        } : undefined,
        base_salary_masked: true,
        status: employeeDetails.status
      },
      attendance_summary: {
        summary: {
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          totalHours,
          averageHours
        }
      },
      recent_attendance: records.slice(0, 10).map(record => ({
        id: record.id,
        date: record.date,
        check_in: record.check_in,
        check_out: record.check_out,
        status: record.status,
        hours_worked: record.hours_worked
      }))
    }

    return res.status(200).json(response)

  } catch (error) {
    logger.error('Employee dashboard error', error)
    return res.status(500).json({
      error: 'Error interno del servidor'
    })
  }
}
