import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)
    
    // Get current month dates
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    // Get sample attendance records from the system
    const { data: sampleAttendance, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('employee_id, date, status, check_in, check_out')
      .order('date', { ascending: false })
      .limit(10)

    // Get employees count
    const { data: employeesCount, error: employeesError } = await supabase
      .from('employees')
      .select('id', { count: 'exact' })

    // Get attendance records count
    const { data: attendanceCount, error: attendanceCountError } = await supabase
      .from('attendance_records')
      .select('id', { count: 'exact' })

    // Get attendance records for current month
    const { data: currentMonthAttendance, error: currentMonthError } = await supabase
      .from('attendance_records')
      .select('employee_id, date, status')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .limit(20)

    // Get permissions count
    const { data: permissionsCount, error: permissionsCountError } = await supabase
      .from('leave_requests')
      .select('id', { count: 'exact' })

    // Get permissions for current month
    const { data: currentMonthPermissions, error: currentMonthPermissionsError } = await supabase
      .from('leave_requests')
      .select('employee_id, start_date, end_date, status')
      .gte('start_date', startOfMonth)
      .lte('end_date', endOfMonth)
      .limit(20)

    const debugData = {
      dates: {
        startOfMonth,
        endOfMonth,
        currentDate: now.toISOString()
      },
      counts: {
        employees: employeesCount?.length || 0,
        totalAttendance: attendanceCount?.length || 0,
        totalPermissions: permissionsCount?.length || 0,
        currentMonthAttendance: currentMonthAttendance?.length || 0,
        currentMonthPermissions: currentMonthPermissions?.length || 0
      },
      sampleData: {
        attendance: sampleAttendance?.slice(0, 5),
        currentMonthAttendance: currentMonthAttendance?.slice(0, 5),
        currentMonthPermissions: currentMonthPermissions?.slice(0, 5)
      },
      errors: {
        attendance: attendanceError?.message,
        employees: employeesError?.message,
        attendanceCount: attendanceCountError?.message,
        currentMonth: currentMonthError?.message,
        permissionsCount: permissionsCountError?.message,
        currentMonthPermissions: currentMonthPermissionsError?.message
      }
    }

    logger.info('Debug attendance data', debugData)

    return res.status(200).json(debugData)

  } catch (error) {
    logger.error('Debug attendance data error', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
