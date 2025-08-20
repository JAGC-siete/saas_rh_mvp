import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth-utils'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now()
  
  try {
    // Log request
    logger.info('Leave types API request', {
      method: req.method,
      path: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    })

    // Authenticate user
    const authResult = await authenticateUser(req, res, ['can_manage_employees'])
    if (!authResult.success) {
      logger.warn('Leave types API authentication failed', {
        error: authResult.error,
        userId: authResult.user?.id
      })
      return res.status(401).json({ error: authResult.error, message: authResult.message })
    }

    const { user, userProfile } = authResult
    const supabase = createClient(req, res)

    // Log successful authentication
    logger.info('Leave types API authenticated', {
      userId: user.id,
      userRole: userProfile.role,
      companyId: userProfile.company_id
    })

    switch (req.method) {
      case 'GET':
        return await handleGetLeaveTypes(req, res, supabase, userProfile)
      
      case 'POST':
        return await handleCreateLeaveType(req, res, supabase, userProfile)
      
      default:
        logger.warn('Leave types API method not allowed', { method: req.method })
        return res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Leave types API error', error, {
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

async function handleGetLeaveTypes(
  req: NextApiRequest, 
  res: NextApiResponse, 
  supabase: any, 
  userProfile: any
) {
  try {
    let query = supabase
      .from('leave_types')
      .select('*')
      .order('name')

    // Filter by company if not super_admin
    if (userProfile.role !== 'super_admin' && userProfile.company_id) {
      query = query.eq('company_id', userProfile.company_id)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching leave types', error)
      return res.status(500).json({ error: 'Error fetching leave types' })
    }

    logger.info('Leave types fetched successfully', {
      count: data?.length || 0,
      userId: userProfile.id,
      role: userProfile.role
    })

    return res.status(200).json({ data })

  } catch (error) {
    logger.error('Error in handleGetLeaveTypes', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleCreateLeaveType(
  req: NextApiRequest, 
  res: NextApiResponse, 
  supabase: any, 
  userProfile: any
) {
  try {
    const { name, max_days_per_year, is_paid, requires_approval, color } = req.body

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'El nombre del tipo de permiso es obligatorio'
      })
    }

    // Only super_admin, company_admin, and hr_manager can create leave types
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(userProfile.role)) {
      logger.warn('Permission denied for leave type creation', {
        userId: userProfile.id,
        userRole: userProfile.role
      })
      return res.status(403).json({ error: 'Access denied' })
    }

    // Prepare leave type data
    const leaveTypeData: any = {
      name,
      max_days_per_year: max_days_per_year || null,
      is_paid: is_paid !== undefined ? is_paid : true,
      requires_approval: requires_approval !== undefined ? requires_approval : true,
      color: color || '#3498db'
    }

    // Set company_id if not super_admin
    if (userProfile.role !== 'super_admin' && userProfile.company_id) {
      leaveTypeData.company_id = userProfile.company_id
    }

    // Create leave type
    const { data, error } = await supabase
      .from('leave_types')
      .insert([leaveTypeData])
      .select()
      .single()

    if (error) {
      logger.error('Error creating leave type', error)
      return res.status(500).json({ error: 'Error creating leave type' })
    }

    logger.info('Leave type created successfully', {
      leaveTypeId: data.id,
      name: data.name,
      userId: userProfile.id,
      userRole: userProfile.role
    })

    return res.status(201).json({ data })

  } catch (error) {
    logger.error('Error in handleCreateLeaveType', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
