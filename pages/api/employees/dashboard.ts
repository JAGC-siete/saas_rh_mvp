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
    
    // Use standard Supabase Auth like admin portal
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }
    
    // First, get user profile to find employee_id
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('employee_id, company_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !userProfile?.employee_id) {
      logger.error('User profile not found or missing employee_id', {
        userId: user.id,
        email: user.email,
        profileError: profileError?.message,
        userProfile
      })
      return res.status(404).json({ 
        error: 'Perfil de empleado no encontrado',
        debug: {
          userId: user.id,
          email: user.email,
          hint: 'El usuario no tiene un employee_id asociado en user_profiles'
        }
      })
    }
    
    const employeeId = userProfile.employee_id
    
    logger.info('Employee dashboard access', {
      supabaseUserId: user.id,
      employeeId: employeeId,
      email: user.email,
      companyId: userProfile.company_id
    })

    // First, let's check if employee exists at all
    const { data: employeeCheck, error: checkError } = await supabase
      .from('employees')
      .select('id, name, email, status, company_id')
      .eq('id', employeeId)

    logger.info('Employee existence check', {
      employeeId,
      found: employeeCheck?.length || 0,
      employee: employeeCheck?.[0],
      error: checkError
    })

    // If not found by ID, try by email (maybe ID mismatch)
    if (!employeeCheck || employeeCheck.length === 0) {
      const { data: emailCheck, error: emailError } = await supabase
        .from('employees')
        .select('id, name, email, status, company_id')
        .eq('email', 'user@example.com')
        .eq('company_id', '00000000-0000-0000-0000-000000000001')

      logger.info('Employee email fallback check', {
        emailFound: emailCheck?.length || 0,
        employee: emailCheck?.[0],
        error: emailError
      })

      if (emailCheck && emailCheck.length > 0) {
        return res.status(400).json({
          error: 'ID mismatch detected',
          debug: {
            tokenEmployeeId: employeeId,
            actualEmployeeId: emailCheck[0].id,
            employeeName: emailCheck[0].name,
            hint: 'El token tiene un employee_id diferente al de la base de datos'
          }
        })
      }
    }

    // Get employee profile - try direct query first (RLS might be blocking JOINs)
    let employeeDetails: any = null
    let profileError: any = null

    // Try simple query first
    const { data: simpleEmployee, error: simpleError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single()

    if (employeeError || !employeeDetails) {
      logger.error('Failed to fetch employee details', {
        employeeId,
        error: employeeError,
        hint: 'Employee not found or RLS blocking access'
      })
      return res.status(404).json({
        error: 'Empleado no encontrado',
        debug: {
          employeeId,
          errorMessage: employeeError?.message,
          hint: 'Verificar políticas RLS y que el empleado existe'
        }
      })
    }

    // Get related data separately (avoid JOIN issues with RLS)
    const { data: department } = await supabase
      .from('departments')
      .select('id, name')
      .eq('id', employeeDetails.department_id)
      .single()

    const { data: workSchedule } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('id', employeeDetails.work_schedule_id)
      .single()

    // Add related data to employee object
    employeeDetails.departments = department
    employeeDetails.work_schedules = workSchedule

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
