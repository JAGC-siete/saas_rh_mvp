import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

interface PermissionRequest {
  leave_type_id: string
  start_date: string
  end_date: string
  duration_hours?: number // For hourly permissions (2, 4, 6, 8 hours)
  reason: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetPermissions(req, res)
  } else if (req.method === 'POST') {
    return handleCreatePermission(req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetPermissions(req: NextApiRequest, res: NextApiResponse) {
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
        .select('employee_id')
        .eq('id', user.id)
        .single()
      
      if (profileError || !userProfile?.employee_id) {
        logger.error('User profile not found or missing employee_id', {
          userId: user.id,
          email: user.email,
          profileError: profileError?.message
        })
        return res.status(404).json({ error: 'Perfil de empleado no encontrado' })
      }
      
      employeeId = userProfile.employee_id
    }

    // Get employee's permission requests
    const { data: permissions, error: permissionsError } = await supabase
      .from('leave_requests')
      .select(`
        id,
        start_date,
        end_date,
        days_requested,
        reason,
        status,
        created_at,
        leave_type:leave_types(id, name, color, is_paid)
      `)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })

    if (permissionsError) {
      logger.error('Failed to fetch employee permissions', {
        employeeId,
        error: permissionsError
      })
      return res.status(500).json({ error: 'Error al obtener permisos' })
    }

    logger.info('Employee permissions fetched', {
      employeeId,
      count: permissions?.length || 0
    })

    return res.status(200).json(permissions || [])

  } catch (error) {
    logger.error('Employee permissions API error', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function handleCreatePermission(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createClient(req, res)
    
    // Use standard Supabase Auth like admin portal
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }
    
    // Get employee_id from user_metadata (primary) or user_profiles (fallback)
    let employeeId = user.user_metadata?.employee_id
    let companyId = user.user_metadata?.company_id
    
    // Fallback: buscar en user_profiles si no está en user_metadata
    if (!employeeId) {
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('employee_id, company_id')
        .eq('id', user.id)
        .single()
      
      if (profileError || !userProfile?.employee_id) {
        logger.error('User profile not found or missing employee_id', {
          userId: user.id,
          email: user.email,
          profileError: profileError?.message
        })
        return res.status(404).json({ error: 'Perfil de empleado no encontrado' })
      }
      
      employeeId = userProfile.employee_id
      companyId = userProfile.company_id
    }

    const body: PermissionRequest = req.body

    // Validate required fields
    if (!body.leave_type_id || !body.start_date || !body.end_date || !body.reason) {
      return res.status(400).json({ 
        error: 'Faltan campos obligatorios: leave_type_id, start_date, end_date, reason' 
      })
    }

    // Validate dates
    const startDate = new Date(body.start_date)
    const endDate = new Date(body.end_date)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Formato de fecha inválido' })
    }
    if (endDate < startDate) {
      return res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la fecha de inicio' })
    }

    // Get employee details for DNI
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('dni')
      .eq('id', employeeId)
      .single()

    if (employeeError || !employee) {
      logger.error('Failed to fetch employee details', {
        employeeId,
        error: employeeError
      })
      return res.status(404).json({ error: 'Empleado no encontrado' })
    }

    // Calculate days_requested based on whether it's hourly or daily permission
    let days_requested: number
    
    if (body.duration_hours && body.duration_hours > 0) {
      // For hourly permissions, convert hours to days (8-hour workday)
      days_requested = body.duration_hours / 8.0
    } else {
      // For daily permissions, calculate actual days between dates
      const timeDiff = endDate.getTime() - startDate.getTime()
      days_requested = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1
    }

    // Create permission request - status = 'approved' since it's pre-authorized
    const { data: permissionRequest, error: createError } = await supabase
      .from('leave_requests')
      .insert([{
        employee_id: employeeId,
        leave_type_id: body.leave_type_id,
        employee_dni: employee.dni,
        start_date: body.start_date,
        end_date: body.end_date,
        days_requested,
        reason: body.reason,
        status: 'approved', // Pre-authorized permissions are automatically approved
        approved_by: employeeId, // Self-approved since it's pre-authorized
        approved_at: new Date().toISOString()
      }])
      .select(`
        id,
        start_date,
        end_date,
        days_requested,
        reason,
        status,
        created_at,
        leave_type:leave_types(id, name, color, is_paid)
      `)
      .single()

    if (createError) {
      logger.error('Error creating permission request:', { 
        error: createError.message, 
        employeeId,
        requestData: body
      })
      return res.status(500).json({ error: 'Error al crear registro de permiso' })
    }

    logger.info('Pre-authorized permission registered successfully', {
      permissionId: permissionRequest.id,
      employeeId,
      leaveType: body.leave_type_id,
      durationHours: body.duration_hours,
      daysRequested: days_requested
    })

    return res.status(201).json(permissionRequest)

  } catch (error) {
    logger.error('Employee permission creation API error', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
