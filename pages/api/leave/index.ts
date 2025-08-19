import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth-utils'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now()
  
  try {
    // Log request
    logger.info('Leave API request', {
      method: req.method,
      path: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    })

    // Authenticate user
    const authResult = await authenticateUser(req, res, ['can_manage_employees'])
    if (!authResult.success) {
      logger.warn('Leave API authentication failed', {
        error: authResult.error,
        userId: authResult.user?.id
      })
      return res.status(401).json({ error: authResult.error, message: authResult.message })
    }

    const { user, userProfile } = authResult
    const supabase = createClient(req, res)

    // Log successful authentication
    logger.info('Leave API authenticated', {
      userId: user.id,
      userRole: userProfile.role,
      companyId: userProfile.company_id
    })

    switch (req.method) {
      case 'GET':
        return await handleGetLeaveRequests(req, res, supabase, userProfile)
      
      case 'POST':
        return await handleCreateLeaveRequest(req, res, supabase, userProfile)
      
      default:
        logger.warn('Leave API method not allowed', { method: req.method })
        return res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Leave API error', error, {
      method: req.method,
      path: req.url,
      duration
    })
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Ocurrió un error procesando la solicitud'
    })
  }
}

async function handleGetLeaveRequests(
  req: NextApiRequest, 
  res: NextApiResponse, 
  supabase: any, 
  userProfile: any
) {
  try {
    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        employee:employees(
          id,
          first_name,
          last_name,
          email,
          company_id
        ),
        leave_type:leave_types(
          id,
          name,
          max_days_per_year,
          is_paid,
          requires_approval
        )
      `)
      .order('created_at', { ascending: false })

    // Filter by company if not super_admin
    if (userProfile.role !== 'super_admin' && userProfile.company_id) {
      query = query.eq('employee.company_id', userProfile.company_id)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching leave requests', error)
      return res.status(500).json({ error: 'Error fetching leave requests' })
    }

    logger.info('Leave requests fetched successfully', {
      count: data?.length || 0,
      userId: userProfile.id,
      role: userProfile.role
    })

    return res.status(200).json({ data })

  } catch (error) {
    logger.error('Error in handleGetLeaveRequests', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleCreateLeaveRequest(
  req: NextApiRequest, 
  res: NextApiResponse, 
  supabase: any, 
  userProfile: any
) {
  try {
    const { employee_id, leave_type, start_date, end_date, reason } = req.body

    // Validate required fields
    if (!employee_id || !leave_type || !start_date || !end_date) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Todos los campos obligatorios deben ser completados'
      })
    }

    // Validate dates
    const start = new Date(start_date)
    const end = new Date(end_date)
    if (end < start) {
      return res.status(400).json({ 
        error: 'Invalid dates',
        message: 'La fecha de fin no puede ser anterior a la fecha de inicio'
      })
    }

    // Calculate days requested
    const timeDiff = end.getTime() - start.getTime()
    const daysRequested = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1

    if (daysRequested <= 0) {
      return res.status(400).json({ 
        error: 'Invalid date range',
        message: 'El rango de fechas debe ser válido'
      })
    }

    // Verify employee belongs to user's company (unless super_admin)
    if (userProfile.role !== 'super_admin' && userProfile.company_id) {
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', employee_id)
        .single()

      if (empError || !employee) {
        return res.status(404).json({ error: 'Employee not found' })
      }

      if (employee.company_id !== userProfile.company_id) {
        return res.status(403).json({ error: 'Access denied to employee' })
      }
    }

    // Create leave request
    const { data, error } = await supabase
      .from('leave_requests')
      .insert([{
        employee_id,
        leave_type,
        start_date,
        end_date,
        days_requested: daysRequested,
        reason: reason || null,
        status: 'pending'
      }])
      .select()
      .single()

    if (error) {
      logger.error('Error creating leave request', error)
      return res.status(500).json({ error: 'Error creating leave request' })
    }

    logger.info('Leave request created successfully', {
      leaveRequestId: data.id,
      employeeId: employee_id,
      userId: userProfile.id
    })

    return res.status(201).json({ data })

  } catch (error) {
    logger.error('Error in handleCreateLeaveRequest', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
