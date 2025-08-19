import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import formidable from 'formidable'
import { authenticateUser } from '../../../lib/auth-helpers'
import { logger } from '../../../lib/logger'

export const config = {
  api: {
    bodyParser: false,
  },
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function handleGetLeaveRequests(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authResult = await authenticateUser(req, res, ['can_manage_employees'])
    if (!authResult.success || !authResult.user || !authResult.userProfile) {
      return res.status(401).json({ error: authResult.error || 'Authentication failed' })
    }

    const { user, userProfile } = authResult

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        employee:employees(id, first_name, last_name, email, dni, company_id),
        leave_type:leave_types(id, name, color, is_paid, requires_approval)
      `)
      .order('created_at', { ascending: false })

    // Filter by company for non-super_admin users
    if (userProfile.role !== 'super_admin') {
      query = query.eq('employee.company_id', userProfile.company_id)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching leave requests:', { error: error.message, userId: user.id })
      return res.status(500).json({ error: 'Error fetching leave requests' })
    }

    logger.info('Leave requests fetched successfully', { 
      count: data?.length || 0, 
      userId: user.id,
      userRole: userProfile.role 
    })

    res.status(200).json(data || [])
  } catch (error: any) {
    logger.error('Unexpected error in handleGetLeaveRequests:', { error: error.message })
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleCreateLeaveRequest(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authResult = await authenticateUser(req, res, ['can_manage_employees'])
    if (!authResult.success || !authResult.user || !authResult.userProfile) {
      return res.status(401).json({ error: authResult.error || 'Authentication failed' })
    }

    const { user, userProfile } = authResult

    // Parse form data
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB
      filter: ({ name, originalFilename }) => {
        if (name === 'attachment') {
          const ext = originalFilename?.toLowerCase().split('.').pop()
          return ext === 'pdf' || ext === 'jpg' || ext === 'jpeg'
        }
        return true
      }
    })

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        else resolve([fields, files])
      })
    })

    // Extract form data
    const employee_dni = fields.employee_dni?.[0] as string
    const leave_type_id = fields.leave_type_id?.[0] as string
    const start_date = fields.start_date?.[0] as string
    const end_date = fields.end_date?.[0] as string
    const duration_type = fields.duration_type?.[0] as 'hours' | 'days'
    const duration_hours = fields.duration_hours?.[0] ? parseFloat(fields.duration_hours[0]) : undefined
    const is_half_day = fields.is_half_day?.[0] === 'true'
    const reason = fields.reason?.[0] as string
    const attachment = files.attachment?.[0]

    // Validate required fields
    if (!employee_dni || !leave_type_id || !start_date || !end_date || !duration_type) {
      return res.status(400).json({ 
        error: 'Missing required fields: employee_dni, leave_type_id, start_date, end_date, duration_type' 
      })
    }

    // Validate dates
    const startDate = new Date(start_date)
    const endDate = new Date(end_date)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' })
    }
    if (endDate < startDate) {
      return res.status(400).json({ error: 'End date cannot be before start date' })
    }

    // Validate duration for hourly permissions
    if (duration_type === 'hours') {
      if (is_half_day && duration_hours !== 4) {
        return res.status(400).json({ error: 'Half-day permissions must be exactly 4 hours' })
      }
      if (!is_half_day && (!duration_hours || duration_hours <= 0 || duration_hours > 24)) {
        return res.status(400).json({ error: 'Duration hours must be between 1 and 24' })
      }
    }

    // Find employee by DNI
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, company_id')
      .eq('dni', employee_dni)
      .single()

    if (empError || !employee) {
      logger.warn('Employee not found by DNI', { dni: employee_dni, userId: user.id })
      return res.status(404).json({ error: 'Employee not found' })
    }

    // Verify employee belongs to user's company (unless super_admin)
    if (userProfile.role !== 'super_admin' && employee.company_id !== userProfile.company_id) {
      logger.warn('User trying to create leave request for employee from different company', {
        userId: user.id,
        userCompanyId: userProfile.company_id,
        employeeCompanyId: employee.company_id
      })
      return res.status(403).json({ error: 'Access denied' })
    }

    // Calculate days_requested based on duration type
    let days_requested: number
    if (duration_type === 'hours') {
      const actualHours = is_half_day ? 4 : (duration_hours || 8)
      days_requested = actualHours / 8.0 // Convert hours to days (8-hour workday)
    } else {
      // For daily permissions, calculate actual days
      const timeDiff = endDate.getTime() - startDate.getTime()
      days_requested = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1
    }

    // Handle file upload
    let attachment_url: string | undefined
    let attachment_type: 'pdf' | 'jpg' | undefined
    let attachment_name: string | undefined

    if (attachment) {
      const fileExtension = attachment.originalFilename?.toLowerCase().split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`

      // Move file to uploads directory
      const fs = require('fs')
      const path = require('path')
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      
      // Ensure uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }

      fs.copyFileSync(attachment.filepath, path.join(uploadsDir, fileName))
      fs.unlinkSync(attachment.filepath) // Clean up temp file

      attachment_url = `/uploads/${fileName}`
      attachment_type = fileExtension === 'pdf' ? 'pdf' : 'jpg'
      attachment_name = attachment.originalFilename || undefined

      logger.info('File uploaded successfully', {
        fileName,
        originalName: attachment.originalFilename,
        size: attachment.size,
        userId: user.id
      })
    }

    // Create leave request
    const { data: leaveRequest, error: createError } = await supabase
      .from('leave_requests')
      .insert([{
        employee_id: employee.id,
        leave_type_id,
        employee_dni,
        start_date,
        end_date,
        days_requested,
        duration_type,
        duration_hours: duration_type === 'hours' ? (is_half_day ? 4 : duration_hours) : undefined,
        is_half_day: duration_type === 'hours' ? is_half_day : false,
        reason,
        attachment_url,
        attachment_type,
        attachment_name,
        status: 'pending'
      }])
      .select()
      .single()

    if (createError) {
      logger.error('Error creating leave request:', { 
        error: createError.message, 
        userId: user.id,
        employeeId: employee.id 
      })
      return res.status(500).json({ error: 'Error creating leave request' })
    }

    logger.info('Leave request created successfully', {
      leaveRequestId: leaveRequest.id,
      employeeId: employee.id,
      userId: user.id,
      durationType: duration_type,
      daysRequested: days_requested
    })

    res.status(201).json(leaveRequest)
  } catch (error: any) {
    logger.error('Unexpected error in handleCreateLeaveRequest:', { error: error.message })
    res.status(500).json({ error: 'Internal server error' })
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  try {
    switch (method) {
      case 'GET':
        await handleGetLeaveRequests(req, res)
        break
      case 'POST':
        await handleCreateLeaveRequest(req, res)
        break
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        res.status(405).json({ error: `Method ${method} Not Allowed` })
    }
  } catch (error: any) {
    logger.error('Unexpected error in leave API:', { error: error.message, method })
    res.status(500).json({ error: 'Internal server error' })
  }
}
