import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'

interface LeaveRequestsResponse {
  success: boolean
  data?: any
  metadata?: {
    total?: number
    page?: number
    pageSize?: number
    filters?: any
  }
  error?: string
  message?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeaveRequestsResponse>
) {
  try {
    const { user } = await requireSuperAdmin(req, res)

    switch (req.method) {
      case 'GET':
        return await getLeaveRequests(req, res)
      case 'PATCH':
        return await updateLeaveRequest(req, res, user.id)
      default:
        res.setHeader('Allow', ['GET', 'PATCH'])
        return res.status(405).json({
          success: false,
          error: 'Method not allowed',
          message: `Method ${req.method} not allowed`
        })
    }
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return
    }
    logger.error('Error in leave-requests admin API', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to process request'
    })
  }
}

async function getLeaveRequests(req: NextApiRequest, res: NextApiResponse<LeaveRequestsResponse>) {
  try {
    const adminClient = createAdminClient()

    const companyId = req.query.company_id as string | undefined
    const status = req.query.status as string | undefined
    const startDate = req.query.start_date as string | undefined
    const endDate = req.query.end_date as string | undefined
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Base query
    let query = adminClient
      .from('leave_requests')
      .select(`
        id,
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        days_requested,
        duration_hours,
        duration_type,
        reason,
        status,
        approved_by,
        approved_at,
        rejection_reason,
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
        ),
        leave_types (
          id,
          name,
          color,
          is_paid
        )
      `, { count: 'exact' })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('start_date', startDate)
    }

    if (endDate) {
      query = query.lte('end_date', endDate)
    }

    // Order by most recent
    query = query.order('created_at', { ascending: false }).range(from, to)

    const { data: requests, error, count } = await query

    if (error) {
      throw error
    }

    // Filter by company if needed
    let filteredRequests = requests || []
    if (companyId) {
      filteredRequests = filteredRequests.filter((req: any) => 
        req.employees?.company_id === companyId
      )
    }

    // Format response
    const requestsFormatted = filteredRequests.map((request: any) => ({
      id: request.id,
      employee_id: request.employee_id,
      employee_name: request.employees?.name || 'Unknown',
      employee_code: request.employees?.employee_code || '-',
      company_id: request.employees?.company_id || null,
      company_name: request.employees?.companies?.name || 'Unknown',
      leave_type_id: request.leave_type_id,
      leave_type_name: request.leave_types?.name || 'Unknown',
      leave_type_color: request.leave_types?.color || '#3498db',
      is_paid: request.leave_types?.is_paid || false,
      start_date: request.start_date,
      end_date: request.end_date,
      days_requested: request.days_requested || 0,
      duration_hours: request.duration_hours || null,
      duration_type: request.duration_type || 'days',
      reason: request.reason,
      status: request.status,
      approved_by: request.approved_by,
      approved_at: request.approved_at,
      rejection_reason: request.rejection_reason,
      created_at: request.created_at,
      updated_at: request.updated_at
    }))

    logger.info('Leave requests retrieved', {
      count: requestsFormatted.length,
      total: count,
      filters: { companyId, status, startDate, endDate }
    })

    return res.status(200).json({
      success: true,
      data: requestsFormatted,
      metadata: {
        total: companyId ? requestsFormatted.length : (count || 0),
        page,
        pageSize,
        filters: {
          company_id: companyId || null,
          status: status || null,
          start_date: startDate || null,
          end_date: endDate || null
        }
      }
    })
  } catch (error) {
    logger.error('Error fetching leave requests', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch leave requests',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function updateLeaveRequest(
  req: NextApiRequest,
  res: NextApiResponse<LeaveRequestsResponse>,
  userId: string
) {
  try {
    const adminClient = createAdminClient()
    const { id, status, rejection_reason } = req.body

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing request ID',
        message: 'Leave request ID is required'
      })
    }

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: 'Status must be either approved or rejected'
      })
    }

    // Build update object
    const updates: any = {
      status,
      approved_by: userId,
      approved_at: new Date().toISOString()
    }

    if (status === 'rejected' && rejection_reason) {
      updates.rejection_reason = rejection_reason
    }

    // Update leave request
    const { data: request, error: updateError } = await adminClient
      .from('leave_requests')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        employees (
          name,
          employee_code
        )
      `)
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Leave request not found',
          message: 'The specified leave request does not exist'
        })
      }
      throw updateError
    }

    logger.info('Leave request updated', {
      requestId: id,
      status,
      updatedBy: userId
    })

    return res.status(200).json({
      success: true,
      message: `Leave request ${status} successfully`,
      data: request
    })
  } catch (error) {
    logger.error('Error updating leave request', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update leave request',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

