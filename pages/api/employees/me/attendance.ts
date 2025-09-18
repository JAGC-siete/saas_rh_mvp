import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { getHondurasTimestamp } from '../../../../lib/timezone'

interface AttendanceRecord {
  id: string
  date: string
  check_in?: string
  check_out?: string
  expected_check_in?: string
  expected_check_out?: string
  late_minutes?: number
  early_departure_minutes?: number
  total_hours?: number
  status: 'present' | 'absent' | 'late' | 'early_departure' | 'incomplete'
  justification?: string
}

interface AttendanceResponse {
  records: AttendanceRecord[]
  summary: {
    totalDays: number
    presentDays: number
    absentDays: number
    lateDays: number
    totalHours: number
    averageHours: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Create Supabase client for database queries
    const supabase = createClient(req, res)
    
    // Get current user from Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }
    
    // Extract employee ID from token (format: emp_${employeeId}_${timestamp})
    const authHeader = req.headers.authorization || req.headers.Authorization as string
    const accessToken = req.cookies['sb-access-token'] || authHeader?.replace('Bearer ', '')
    
    if (!accessToken || !accessToken.startsWith('emp_')) {
      return res.status(401).json({ error: 'No autorizado' })
    }
    
    const tokenParts = accessToken.split('_')
    const employeeId = tokenParts[1] // Should be the UUID
    
    if (!employeeId || employeeId.length !== 36) {
      return res.status(401).json({ 
        error: 'Token inválido',
        debug: {
          tokenFormat: accessToken.substring(0, 20) + '...',
          extractedId: employeeId
        }
      })
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
    const limitNum = Math.min(parseInt(limit as string), 100) // Max 100 records
    const offset = (pageNum - 1) * limitNum

    // Build date range (default to current month)
    const now = new Date()
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const finalStartDate = (startDate as string) || defaultStartDate
    const finalEndDate = (endDate as string) || defaultEndDate

    // Validate date range (max 3 months)
    const start = new Date(finalStartDate)
    const end = new Date(finalEndDate)
    const maxRange = 90 * 24 * 60 * 60 * 1000 // 90 days in milliseconds

    if (end.getTime() - start.getTime() > maxRange) {
      return res.status(400).json({ 
        error: 'El rango de fechas no puede ser mayor a 3 meses' 
      })
    }

    // Build query
    let query = supabase
      .from('attendance_records')
      .select(`
        id,
        date,
        check_in,
        check_out,
        expected_check_in,
        expected_check_out,
        late_minutes,
        early_departure_minutes,
        total_hours,
        status,
        justification
      `)
      .eq('employee_id', employeeId)
      .gte('date', finalStartDate)
      .lte('date', finalEndDate)
      .order('date', { ascending: false })

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)
      .gte('date', finalStartDate)
      .lte('date', finalEndDate)

    if (countError) {
      logger.error('Failed to count attendance records', countError)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }

    // Get paginated records
    const { data: records, error: recordsError } = await query
      .range(offset, offset + limitNum - 1)

    if (recordsError) {
      logger.error('Failed to get attendance records', recordsError)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }

    // Calculate summary statistics
    const { data: summaryData, error: summaryError } = await supabase
      .from('attendance_records')
      .select(`
        status,
        total_hours,
        late_minutes
      `)
      .eq('employee_id', employeeId)
      .gte('date', finalStartDate)
      .lte('date', finalEndDate)

    if (summaryError) {
      logger.error('Failed to get attendance summary', summaryError)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }

    // Process summary
    const totalDays = summaryData?.length || 0
    const presentDays = summaryData?.filter((r: any) => r.status === 'present' || r.status === 'late').length || 0
    const absentDays = summaryData?.filter((r: any) => r.status === 'absent').length || 0
    const lateDays = summaryData?.filter((r: any) => r.status === 'late').length || 0
    const totalHours = summaryData?.reduce((sum: number, r: any) => sum + (r.total_hours || 0), 0) || 0
    const averageHours = totalDays > 0 ? totalHours / totalDays : 0

    // Format records for response
    const formattedRecords: AttendanceRecord[] = (records || []).map((record: any) => ({
      id: record.id,
      date: record.date,
      check_in: record.check_in || undefined,
      check_out: record.check_out || undefined,
      expected_check_in: record.expected_check_in || undefined,
      expected_check_out: record.expected_check_out || undefined,
      late_minutes: record.late_minutes || undefined,
      early_departure_minutes: record.early_departure_minutes || undefined,
      total_hours: record.total_hours || undefined,
      status: record.status || 'incomplete',
      justification: record.justification || undefined
    }))

    // Log access for audit
    logger.info('Employee accessed own attendance', {
      employeeId: employeeId,
      action: 'view_attendance',
      dateRange: `${finalStartDate} to ${finalEndDate}`,
      recordCount: formattedRecords.length
    })

    const response: AttendanceResponse = {
      records: formattedRecords,
      summary: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        totalHours: Math.round(totalHours * 100) / 100,
        averageHours: Math.round(averageHours * 100) / 100
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount || 0,
        hasMore: (totalCount || 0) > offset + limitNum
      }
    }

    return res.status(200).json(response)

  } catch (error) {
    if (error instanceof Error && error.message.startsWith('EMPLOYEE_')) {
      // Authentication error already handled
      return
    }

    logger.error('Employee attendance API error', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
