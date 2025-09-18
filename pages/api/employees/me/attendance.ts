import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

interface AttendanceResponse {
  records: any[]
  total: number
  page: number
  limit: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<AttendanceResponse | { error: string, debug?: any }>) {
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
    
    // Get employee ID from user metadata (same as admin portal)
    const employeeId = user.user_metadata?.employee_id
    if (!employeeId) {
      return res.status(401).json({ error: 'Datos de empleado no encontrados' })
    }

    // Get query parameters
    const {
      page = '1',
      limit = '30',
      startDate,
      endDate,
      status
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    let query = supabase
      .from('attendance_records')
      .select('id, date, check_in, check_out, status, late_minutes, justification')
      .eq('employee_id', employeeId)

    if (startDate) {
      query = query.gte('date', startDate as string)
    }
    if (endDate) {
      query = query.lte('date', endDate as string)
    }
    if (status) {
      query = query.eq('status', status as string)
    }

    const { data: records, error: attendanceError } = await query
      .order('date', { ascending: false })
      .range(offset, offset + limitNum - 1)

    logger.info('Attendance records query result', { 
      attendanceError, 
      recordsCount: records?.length || 0,
      employeeId,
      startDate,
      endDate,
      status
    })

    if (attendanceError) {
      logger.error('Failed to get attendance records', attendanceError)
      return res.status(500).json({ 
        error: 'Error fetching attendance records', 
        details: attendanceError,
        debug: { employeeId, startDate, endDate }
      })
    }

    // Get count separately to avoid issues
    const { count, error: countError } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)

    if (countError) {
      logger.error('Failed to get attendance records count', countError)
      // Continue without count if there's an error
    }

    const response: AttendanceResponse = {
      records: records || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum
    }

    return res.status(200).json(response)

  } catch (error) {
    logger.error('API error fetching employee attendance', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}