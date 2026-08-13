import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth-utils'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { getHondurasTimestamp, nowInHonduras } from '../../../lib/timezone'
import { fetchLeaveAttendanceSummaryForRange } from '../../../lib/leave/leave-attendance-summary'

const leaveEmployeeGateSelect = `
  id,
  company_id,
  department_id,
  departments!employees_department_id_fkey(manager_id)
`

function departmentManagerId(employee: {
  departments?: { manager_id: string | null } | { manager_id: string | null }[] | null
}): string | null {
  const d = employee.departments
  if (!d) return null
  const row = Array.isArray(d) ? d[0] : d
  return row?.manager_id ?? null
}

function canAccessLeaveRequestForId(
  userProfile: { role: string; company_id: string | null; employee_id: string | null },
  employee: { company_id: string; departments?: { manager_id: string | null } | { manager_id: string | null }[] | null }
): boolean {
  const role = userProfile.role
  if (role === 'super_admin') return true
  if (role === 'company_admin' || role === 'hr_manager') {
    return employee.company_id === userProfile.company_id
  }
  if (role === 'manager') {
    const mid = departmentManagerId(employee)
    return !!mid && !!userProfile.employee_id && mid === userProfile.employee_id
  }
  return false
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = nowInHonduras().getTime()
  const { id } = req.query
  
  try {
    // Log request
    logger.info('Leave API request by ID', {
      method: req.method,
      path: req.url,
      leaveRequestId: id,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    })

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid leave request ID' })
    }

    // Authenticate user (managers con can_approve_leave alineado a RLS de leave_requests)
    const authResult = await authenticateUser(req, res, ['can_approve_leave'])
    if (!authResult.success) {
      logger.warn('Leave API authentication failed', {
        error: authResult.error,
        userId: authResult.user?.id,
        leaveRequestId: id
      })
      return res.status(401).json({ error: authResult.error, message: authResult.message })
    }

    const { user, userProfile } = authResult
    const supabase = createClient(req, res)

    // Log successful authentication
    logger.info('Leave API authenticated', {
      userId: user.id,
      userRole: userProfile.role,
      companyId: userProfile.company_id,
      leaveRequestId: id
    })

    switch (req.method) {
      case 'GET': {
        const wantSummary =
          req.query.attendance_summary === '1' ||
          req.query.attendance_summary === 'true'
        if (wantSummary) {
          return await handleGetLeaveAttendanceSummary(req, res, supabase, userProfile, id)
        }
        logger.warn('Leave API method not allowed', { method: req.method, leaveRequestId: id })
        return res.status(405).json({ error: 'Method not allowed' })
      }

      case 'PUT':
        return await handleUpdateLeaveRequest(req, res, supabase, userProfile, id)

      case 'DELETE':
        return await handleDeleteLeaveRequest(req, res, supabase, userProfile, id)

      default:
        logger.warn('Leave API method not allowed', { method: req.method, leaveRequestId: id })
        return res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    const duration = nowInHonduras().getTime() - startTime
    logger.error('Leave API error', error, {
      method: req.method,
      path: req.url,
      leaveRequestId: id,
      duration
    })
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Ocurrió un error procesando la solicitud'
    })
  }
}

async function handleGetLeaveAttendanceSummary(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  userProfile: { role: string; company_id: string | null; employee_id: string | null },
  leaveRequestId: string
) {
  try {
    const { data: currentRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select(`
        id,
        employee_id,
        start_date,
        end_date,
        status,
        leave_type:leave_types(is_paid),
        employee:employees!leave_requests_employee_id_fkey(${leaveEmployeeGateSelect})
      `)
      .eq('id', leaveRequestId)
      .single()

    if (fetchError || !currentRequest) {
      return res.status(404).json({ error: 'Leave request not found' })
    }

    if (!canAccessLeaveRequestForId(userProfile, currentRequest.employee)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const result = await fetchLeaveAttendanceSummaryForRange(supabase, {
      leave_request_id: leaveRequestId,
      employee_id: currentRequest.employee_id,
      start_date: currentRequest.start_date,
      end_date: currentRequest.end_date,
      leave_status: currentRequest.status,
      leave_is_paid: currentRequest.leave_type?.is_paid,
    })

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error })
    }

    return res.status(200).json({ data: result.data })
  } catch (error) {
    logger.error('Error in handleGetLeaveAttendanceSummary', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleUpdateLeaveRequest(
  req: NextApiRequest, 
  res: NextApiResponse, 
  supabase: any, 
  userProfile: any,
  leaveRequestId: string
) {
  try {
    const { status, rejection_reason } = req.body

    // Validate status
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        message: 'El estado debe ser "approved" o "rejected"'
      })
    }

    // Get current leave request to verify permissions
    const { data: currentRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select(`
        *,
        employee:employees!leave_requests_employee_id_fkey(${leaveEmployeeGateSelect})
      `)
      .eq('id', leaveRequestId)
      .single()

    if (fetchError || !currentRequest) {
      return res.status(404).json({ error: 'Leave request not found' })
    }

    if (!canAccessLeaveRequestForId(userProfile, currentRequest.employee)) {
      logger.warn('Permission denied for leave request update', {
        userId: userProfile.id,
        userRole: userProfile.role,
        leaveRequestId,
        employeeCompanyId: currentRequest.employee.company_id,
        userCompanyId: userProfile.company_id
      })
      return res.status(403).json({ error: 'Access denied' })
    }

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: getHondurasTimestamp()
    }

    if (status === 'approved') {
      // FK leave_requests_approved_by_fkey → employees.id (no usar auth user id)
      updateData.approved_by = userProfile.employee_id ?? null
      updateData.approved_at = getHondurasTimestamp()
      updateData.rejection_reason = null
    } else if (status === 'rejected') {
      updateData.rejection_reason = rejection_reason || 'Rechazado por el administrador'
      updateData.approved_by = null
      updateData.approved_at = null
    }

    const leaveSelectEnriched = `
      *,
      employee:employees!leave_requests_employee_id_fkey(id, name, email, dni, company_id),
      leave_type:leave_types(id, name, color, is_paid, requires_approval)
    `

    // Update leave request (misma forma enriquecida que GET /api/leave para el cliente)
    const { data, error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', leaveRequestId)
      .select(leaveSelectEnriched)
      .single()

    if (error) {
      logger.error('Error updating leave request', error)
      return res.status(500).json({ error: 'Error updating leave request' })
    }

    logger.info('Leave request updated successfully', {
      leaveRequestId,
      newStatus: status,
      userId: userProfile.id,
      userRole: userProfile.role
    })

    return res.status(200).json({ data })

  } catch (error) {
    logger.error('Error in handleUpdateLeaveRequest', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleDeleteLeaveRequest(
  req: NextApiRequest, 
  res: NextApiResponse, 
  supabase: any, 
  userProfile: any,
  leaveRequestId: string
) {
  try {
    // Only super_admin and company_admin can delete leave requests
    if (!['super_admin', 'company_admin'].includes(userProfile.role)) {
      logger.warn('Permission denied for leave request deletion', {
        userId: userProfile.id,
        userRole: userProfile.role,
        leaveRequestId
      })
      return res.status(403).json({ error: 'Access denied' })
    }

    // Get current leave request to verify company access
    const { data: currentRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select(`
        *,
        employee:employees!leave_requests_employee_id_fkey(
          company_id
        )
      `)
      .eq('id', leaveRequestId)
      .single()

    if (fetchError || !currentRequest) {
      return res.status(404).json({ error: 'Leave request not found' })
    }

    // Verify company access (unless super_admin)
    if (userProfile.role !== 'super_admin' && userProfile.company_id) {
      if (currentRequest.employee.company_id !== userProfile.company_id) {
        logger.warn('Company access denied for leave request deletion', {
          userId: userProfile.id,
          userCompanyId: userProfile.company_id,
          requestCompanyId: currentRequest.employee.company_id,
          leaveRequestId
        })
        return res.status(403).json({ error: 'Access denied' })
      }
    }

    // Delete leave request
    const { error } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', leaveRequestId)

    if (error) {
      logger.error('Error deleting leave request', error)
      return res.status(500).json({ error: 'Error deleting leave request' })
    }

    logger.info('Leave request deleted successfully', {
      leaveRequestId,
      userId: userProfile.id,
      userRole: userProfile.role
    })

    return res.status(200).json({ message: 'Leave request deleted successfully' })

  } catch (error) {
    logger.error('Error in handleDeleteLeaveRequest', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
