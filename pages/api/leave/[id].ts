import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth-utils'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { getHondurasTimestamp, nowInHonduras } from '../../../lib/timezone'

function enumerateCalendarDays(fromStr: string, toStr: string): string[] {
  const from = fromStr.slice(0, 10)
  const to = toStr.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    return []
  }
  const out: string[] = []
  let cur = from
  while (cur <= to && out.length <= 366) {
    out.push(cur)
    const [y, m, d] = cur.split('-').map(Number)
    const next = new Date(Date.UTC(y, m - 1, d + 1))
    cur = next.toISOString().slice(0, 10)
  }
  return out
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

    // Authenticate user
    const authResult = await authenticateUser(req, res, ['can_manage_employees'])
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
          return await handleGetLeaveAttendanceSummary(req, res, supabase, user, id)
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
  user: { id: string },
  leaveRequestId: string
) {
  try {
    const { data: profileRow, error: profileErr } = await supabase
      .from('user_profiles')
      .select('role, company_id, employee_id')
      .eq('id', user.id)
      .single()

    if (profileErr || !profileRow) {
      return res.status(403).json({ error: 'Perfil no encontrado' })
    }

    const { data: currentRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select(`
        id,
        employee_id,
        start_date,
        end_date,
        employee:employees(
          id,
          company_id,
          department_id
        )
      `)
      .eq('id', leaveRequestId)
      .single()

    if (fetchError || !currentRequest) {
      return res.status(404).json({ error: 'Leave request not found' })
    }

    let hasPermission = false
    if (profileRow.role === 'super_admin') {
      hasPermission = true
    } else if (profileRow.role === 'company_admin' || profileRow.role === 'hr_manager') {
      if (currentRequest.employee.company_id === profileRow.company_id) {
        hasPermission = true
      }
    } else if (profileRow.role === 'manager') {
      if (currentRequest.employee.department_id === profileRow.employee_id) {
        hasPermission = true
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const from = currentRequest.start_date.slice(0, 10)
    const to = currentRequest.end_date.slice(0, 10)
    const daysList = enumerateCalendarDays(from, to)

    if (daysList.length === 0) {
      return res.status(200).json({
        data: {
          days: [],
          employee_id: currentRequest.employee_id,
          leave_request_id: leaveRequestId,
        },
      })
    }

    const { data: timelineRaw, error: timelineError } = await supabase.rpc('attendance_employee_timeline', {
      p_employee_id: currentRequest.employee_id,
      p_from: from,
      p_to: to,
    })

    if (timelineError) {
      logger.error('attendance_employee_timeline (leave summary)', timelineError)
      return res.status(500).json({ error: timelineError.message })
    }

    const byDate = new Map<string, { check_in: string | null; status: string | null }>()
    for (const row of timelineRaw || []) {
      const key = typeof row.date === 'string' ? row.date.slice(0, 10) : String(row.date).slice(0, 10)
      byDate.set(key, { check_in: row.check_in ?? null, status: row.status ?? null })
    }

    const days = daysList.map((date) => {
      const row = byDate.get(date)
      if (!row) {
        return {
          date,
          summary: 'sin_datos' as const,
          has_check_in: false,
          record_status: null as string | null,
        }
      }
      const has_check_in = !!row.check_in
      const st = (row.status || '').toLowerCase()
      let summary: 'sin_datos' | 'presente' | 'ausente'
      if (has_check_in) {
        summary = 'presente'
      } else if (st === 'absent') {
        summary = 'ausente'
      } else {
        summary = 'ausente'
      }
      return {
        date,
        summary,
        has_check_in,
        record_status: row.status,
      }
    })

    return res.status(200).json({
      data: {
        days,
        employee_id: currentRequest.employee_id,
        leave_request_id: leaveRequestId,
      },
    })
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
        employee:employees(
          id,
          company_id,
          department_id
        )
      `)
      .eq('id', leaveRequestId)
      .single()

    if (fetchError || !currentRequest) {
      return res.status(404).json({ error: 'Leave request not found' })
    }

    // Verify permissions based on role
    let hasPermission = false

    if (userProfile.role === 'super_admin') {
      hasPermission = true
    } else if (userProfile.role === 'company_admin' || userProfile.role === 'hr_manager') {
      // Check if employee belongs to user's company
      if (currentRequest.employee.company_id === userProfile.company_id) {
        hasPermission = true
      }
    } else if (userProfile.role === 'manager') {
      // Check if user is manager of the employee's department
      if (currentRequest.employee.department_id === userProfile.employee_id) {
        hasPermission = true
      }
    }

    if (!hasPermission) {
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
      updateData.approved_by = userProfile.employee_id || userProfile.id
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
        employee:employees(
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
