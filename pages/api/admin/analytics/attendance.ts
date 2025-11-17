import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'

interface AttendanceResponse {
  success: boolean
  data?: any[]
  metadata?: {
    total: number
    page: number
    pageSize: number
    filters?: any
  }
  error?: string
  message?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AttendanceResponse>
) {
  try {
    await requireSuperAdmin(req, res)

    if (req.method === 'GET') {
      return await getAttendance(req, res)
    }

    res.setHeader('Allow', ['GET'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: `Method ${req.method} not allowed`
    })
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return
    }
    logger.error('Error in attendance admin API', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to process request'
    })
  }
}

async function getAttendance(req: NextApiRequest, res: NextApiResponse<AttendanceResponse>) {
  try {
    const adminClient = createAdminClient()

    const companyId = req.query.company_id as string | undefined
    const employeeId = req.query.employee_id as string | undefined
    const status = req.query.status as string | undefined
    const startDate = req.query.start_date as string | undefined
    const endDate = req.query.end_date as string | undefined
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Base query with employee and company info
    let query = adminClient
      .from('attendance_records')
      .select(`
        id,
        employee_id,
        date,
        check_in,
        check_out,
        expected_check_in,
        expected_check_out,
        late_minutes,
        early_departure_minutes,
        justification,
        status,
        approved_by,
        approved_at,
        created_at,
        updated_at,
        employees (
          id,
          name,
          employee_code,
          company_id,
          companies (
            id,
            name
          )
        )
      `, { count: 'exact' })

    // Apply filters
    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('date', startDate)
    }

    if (endDate) {
      query = query.lte('date', endDate)
    }

    // Order by most recent
    query = query.order('date', { ascending: false }).range(from, to)

    const { data: records, error, count } = await query

    if (error) {
      throw error
    }

    // Filter by company if needed
    let filteredRecords = records || []
    if (companyId) {
      filteredRecords = filteredRecords.filter((record: any) => 
        record.employees?.company_id === companyId
      )
    }

    // Format response
    const recordsFormatted = filteredRecords.map((record: any) => ({
      id: record.id,
      employee_id: record.employee_id,
      employee_name: record.employees?.name || 'Unknown',
      employee_code: record.employees?.employee_code || '-',
      company_id: record.employees?.company_id || null,
      company_name: record.employees?.companies?.name || 'Unknown',
      date: record.date,
      check_in: record.check_in,
      check_out: record.check_out,
      expected_check_in: record.expected_check_in,
      expected_check_out: record.expected_check_out,
      late_minutes: record.late_minutes || 0,
      early_departure_minutes: record.early_departure_minutes || 0,
      justification: record.justification,
      status: record.status,
      approved_by: record.approved_by,
      approved_at: record.approved_at,
      created_at: record.created_at,
      updated_at: record.updated_at
    }))

    logger.info('Attendance records retrieved', {
      count: recordsFormatted.length,
      total: count,
      filters: { companyId, employeeId, status, startDate, endDate }
    })

    return res.status(200).json({
      success: true,
      data: recordsFormatted,
      metadata: {
        total: companyId ? recordsFormatted.length : (count || 0),
        page,
        pageSize,
        filters: {
          company_id: companyId || null,
          employee_id: employeeId || null,
          status: status || null,
          start_date: startDate || null,
          end_date: endDate || null
        }
      }
    })
  } catch (error) {
    logger.error('Error fetching attendance records', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance records',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

