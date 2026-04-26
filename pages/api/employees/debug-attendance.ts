import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { isServerDiagnosticsEnabled } from '../../../lib/server-diagnostics'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isServerDiagnosticsEnabled()) {
    return res.status(404).json({ error: 'Not found' })
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

    // Fallback: buscar en user_profiles si no está en user_metadata
    if (!employeeId) {
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('employee_id, company_id, role')
        .eq('id', user.id)
        .single()

      if (profileError || !userProfile?.employee_id) {
        return res.status(404).json({ error: 'Perfil de empleado no encontrado' })
      }

      employeeId = userProfile.employee_id
    }

    // Get current month dates
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    // Debug: Get all attendance records for this employee
    const { data: allAttendanceRecords, error: allAttendanceError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false })
      .limit(10)

    // Debug: Get attendance records for current month
    const { data: monthlyAttendanceRecords, error: monthlyAttendanceError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .order('date', { ascending: false })

    // Debug: Get employee details
    const { data: employeeDetails, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single()

    // Debug: Check if there are any attendance records in the system
    const { data: anyAttendanceRecords, error: anyAttendanceError } = await supabase
      .from('attendance_records')
      .select('employee_id, date, status')
      .limit(5)

    const debugInfo = {
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      },
      employee: {
        id: employeeId,
        details: employeeDetails,
        error: employeeError?.message
      },
      dates: {
        startOfMonth,
        endOfMonth,
        currentDate: now.toISOString()
      },
      attendance: {
        allRecords: allAttendanceRecords?.length || 0,
        allRecordsError: allAttendanceError?.message,
        monthlyRecords: monthlyAttendanceRecords?.length || 0,
        monthlyRecordsError: monthlyAttendanceError?.message,
        sampleAllRecords: allAttendanceRecords?.slice(0, 3),
        sampleMonthlyRecords: monthlyAttendanceRecords?.slice(0, 3)
      },
      system: {
        anyRecordsInSystem: anyAttendanceRecords?.length || 0,
        anyRecordsError: anyAttendanceError?.message,
        sampleSystemRecords: anyAttendanceRecords?.slice(0, 3)
      }
    }

    logger.info('Employee attendance debug', debugInfo)

    return res.status(200).json(debugInfo)

  } catch (error) {
    logger.error('Employee attendance debug error', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
