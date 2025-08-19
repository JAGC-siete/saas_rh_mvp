import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth-utils'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import formidable from 'formidable'
import { promises as fs } from 'fs'
import path from 'path'

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}

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
          dni,
          company_id
        ),
        leave_type:leave_types(
          id,
          name,
          max_days_per_year,
          is_paid,
          requires_approval,
          color
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
    // Parse form data with file upload
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'public', 'uploads'),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: (part) => {
        // Only allow PDF and JPG files
        if (part.mimetype) {
          return part.mimetype.includes('pdf') || part.mimetype.includes('image')
        }
        return true
      }
    })

    const [fields, files] = await form.parse(req)
    
    const employee_dni = fields.employee_dni?.[0]
    const leave_type_id = fields.leave_type_id?.[0]
    const start_date = fields.start_date?.[0]
    const end_date = fields.end_date?.[0]
    const reason = fields.reason?.[0]
    const attachment = files.attachment?.[0]

    // Validate required fields
    if (!employee_dni || !leave_type_id || !start_date || !end_date) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'DNI, tipo de permiso, fecha de inicio y fecha de fin son obligatorios'
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

    // Find employee by DNI
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, company_id, dni')
      .eq('dni', employee_dni)
      .single()

    if (empError || !employee) {
      return res.status(404).json({ 
        error: 'Employee not found',
        message: 'No se encontró un empleado con ese DNI'
      })
    }

    // Verify employee belongs to user's company (unless super_admin)
    if (userProfile.role !== 'super_admin' && userProfile.company_id) {
      if (employee.company_id !== userProfile.company_id) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'No tiene acceso a empleados de otra empresa'
        })
      }
    }

    // Handle file upload if present
    let attachmentData = {}
    if (attachment) {
      const fileExtension = path.extname(attachment.originalFilename || '').toLowerCase()
      const attachmentType = fileExtension === '.pdf' ? 'pdf' : 'jpg'
      
      // Generate unique filename
      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`
      const uploadPath = path.join(process.cwd(), 'public', 'uploads', uniqueFilename)
      
      // Move file to uploads directory
      await fs.rename(attachment.filepath, uploadPath)
      
      attachmentData = {
        attachment_url: `/uploads/${uniqueFilename}`,
        attachment_type: attachmentType,
        attachment_name: attachment.originalFilename || uniqueFilename
      }
    }

    // Create leave request
    const { data, error } = await supabase
      .from('leave_requests')
      .insert([{
        employee_id: employee.id,
        leave_type_id,
        employee_dni,
        start_date,
        end_date,
        days_requested: daysRequested,
        reason: reason || null,
        status: 'pending',
        ...attachmentData
      }])
      .select()
      .single()

    if (error) {
      logger.error('Error creating leave request', error)
      return res.status(500).json({ error: 'Error creating leave request' })
    }

    logger.info('Leave request created successfully', {
      leaveRequestId: data.id,
      employeeDni: employee_dni,
      userId: userProfile.id
    })

    return res.status(201).json({ data })

  } catch (error) {
    logger.error('Error in handleCreateLeaveRequest', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
