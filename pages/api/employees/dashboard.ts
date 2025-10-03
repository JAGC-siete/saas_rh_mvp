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
  permissions_summary: {
    summary: {
      totalPermissions: number
      permissionsThisMonth: number
      hoursUsed: number
      daysUsed: number
    }
  }
  recent_attendance: Array<{
    id: string
    date: string
    check_in: string | null
    check_out: string | null
    status: string | null
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
    
    // Get employee_id from user_metadata (primary) or user_profiles (fallback)
    let employeeId = user.user_metadata?.employee_id
    let companyId = user.user_metadata?.company_id
    
    // Fallback: buscar en user_profiles si no está en user_metadata
    if (!employeeId) {
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
          userMetadata: user.user_metadata
        })
        return res.status(404).json({ 
          error: 'Perfil de empleado no encontrado',
          debug: {
            userId: user.id,
            email: user.email,
            hint: 'El usuario no tiene un employee_id en user_metadata ni en user_profiles'
          }
        })
      }
      
      employeeId = userProfile.employee_id
      companyId = userProfile.company_id
    }
    
    logger.info('Employee dashboard access', {
      supabaseUserId: user.id,
      employeeId: employeeId,
      email: user.email,
      companyId: companyId
    })

    // Debug: Log the date range being used
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    
    logger.info('Dashboard date range', {
      employeeId,
      startOfMonth,
      endOfMonth,
      currentDate: now.toISOString()
    })

    // Get employee profile - try direct query first (RLS might be blocking JOINs)
    const { data: employeeDetails, error: employeeError } = await supabase
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

    // Get attendance data for current month (dates already calculated above)

    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance_records')
      .select(`
        id,
        date,
        check_in,
        check_out,
        status
      `)
      .eq('employee_id', employeeId)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .order('date', { ascending: false })

    if (attendanceError) {
      logger.error('Failed to get attendance records', attendanceError)
    }

    // Debug: Log attendance query results
    logger.info('Attendance query results', {
      employeeId,
      dateRange: { startOfMonth, endOfMonth },
      recordsFound: attendanceRecords?.length || 0,
      records: attendanceRecords?.slice(0, 3), // First 3 records for debugging
      error: attendanceError?.message
    })

    // Calculate attendance summary with proper working days calculation
    const records = attendanceRecords || []
    
    // Calculate total working days in current month (excluding weekends)
    const getWorkingDaysInMonth = (year: number, month: number) => {
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      let workingDays = 0
      
      for (let day = firstDay; day <= lastDay; day.setDate(day.getDate() + 1)) {
        const dayOfWeek = day.getDay()
        // Count Monday (1) through Friday (5) as working days
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          workingDays++
        }
      }
      
      return workingDays
    }
    
    const currentDate = new Date()
    const totalWorkingDays = getWorkingDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())
    
    // Count attendance by status
    const presentDays = records.filter(r => r.status === 'present').length
    const lateDays = records.filter(r => r.status === 'late').length
    const absentDays = records.filter(r => r.status === 'absent').length
    
    // Calculate actual absent days (working days without any attendance record)
    const daysWithRecords = new Set(records.map(r => r.date))
    const actualAbsentDays = totalWorkingDays - daysWithRecords.size
    
    // Calculate total hours from check-in/check-out times
    const totalHours = records.reduce((sum, r) => {
      if (r.check_in && r.check_out) {
        const checkIn = new Date(r.check_in)
        const checkOut = new Date(r.check_out)
        const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
        return sum + Math.max(0, hours)
      }
      return sum
    }, 0)
    
    // Calculate average hours per working day (not per attendance record)
    const averageHours = totalWorkingDays > 0 ? totalHours / totalWorkingDays : 0

    // Debug: Log attendance calculations
    logger.info('Attendance calculations', {
      employeeId,
      totalWorkingDays,
      recordsLength: records.length,
      presentDays,
      lateDays,
      absentDays,
      actualAbsentDays,
      totalHours,
      averageHours
    })

    // Get permissions data for current month
    const { data: permissionsRecords, error: permissionsError } = await supabase
      .from('leave_requests')
      .select(`
        id,
        start_date,
        end_date,
        days_requested,
        status
      `)
      .eq('employee_id', employeeId)
      .gte('start_date', startOfMonth)
      .lte('end_date', endOfMonth)
      .eq('status', 'approved')

    if (permissionsError) {
      logger.error('Failed to get permissions records', permissionsError)
    }

    // Debug: Log permissions query results
    logger.info('Permissions query results', {
      employeeId,
      dateRange: { startOfMonth, endOfMonth },
      recordsFound: permissionsRecords?.length || 0,
      records: permissionsRecords?.slice(0, 3), // First 3 records for debugging
      error: permissionsError?.message
    })

    // Calculate permissions summary
    const permissions = permissionsRecords || []
    const permissionsThisMonth = permissions.length
    const hoursUsed = permissions.reduce((sum, p) => {
      // Convert days_requested back to hours for hourly permissions
      // If days_requested is less than 1, it's likely an hourly permission
      if (p.days_requested < 1) {
        return sum + (p.days_requested * 8) // Convert fractional days back to hours
      }
      return sum
    }, 0)
    const daysUsed = permissions.reduce((sum, p) => {
      return sum + (p.days_requested || 0)
    }, 0)

    // Get total permissions (all time)
    const { data: totalPermissionsRecords } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('status', 'approved')

    const totalPermissions = totalPermissionsRecords?.length || 0

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
          totalDays: totalWorkingDays,
          presentDays,
          absentDays: actualAbsentDays,
          lateDays,
          totalHours,
          averageHours
        }
      },
      permissions_summary: {
        summary: {
          totalPermissions,
          permissionsThisMonth,
          hoursUsed,
          daysUsed
        }
      },
      recent_attendance: records.slice(0, 10).map(record => ({
        id: record.id,
        date: record.date,
        check_in: record.check_in,
        check_out: record.check_out,
        status: record.status,
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
