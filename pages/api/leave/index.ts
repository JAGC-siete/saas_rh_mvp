import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { hasPermission } from '../../../lib/auth-utils'
import { logger } from '../../../lib/logger'
import { createAdminClient } from '../../../lib/supabase/server'

export const config = {
  api: {
    bodyParser: false,
  },
}

const LEAVE_SELECT_ENRICHED = `
  *,
  employee:employees!leave_requests_employee_id_fkey(id, name, email, dni, company_id),
  leave_type:leave_types(id, name, color, is_paid, requires_approval)
`

function canListOrCreateLeave(userProfile: { role?: string; permissions?: unknown } | null): boolean {
  if (!userProfile) return false
  return (
    hasPermission(userProfile, 'can_manage_employees') ||
    hasPermission(userProfile, 'can_approve_leave')
  )
}

async function handleGetLeaveRequests(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await requireCompanyAccess(req, res)
    const { supabase, companyId, userProfile } = auth

    if (!canListOrCreateLeave(userProfile)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tiene permiso para consultar solicitudes de permiso',
      })
    }

    let query = supabase
      .from('leave_requests')
      .select(LEAVE_SELECT_ENRICHED)
      .order('created_at', { ascending: false })

    if (companyId) {
      query = query.eq('employee.company_id', companyId)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching leave requests:', { error: error.message, companyId })
      return res.status(500).json({
        error: 'Error fetching leave requests',
        message: error.message,
      })
    }

    const adminSupabase = createAdminClient()
    const BUCKET = 'HR_BUCKET'
    const result = await Promise.all(
      (data || []).map(async (row: Record<string, unknown>) => {
        const url = row.attachment_url
        if (typeof url === 'string' && url.startsWith('leave-attachments/')) {
          try {
            const { data: signed } = await adminSupabase.storage
              .from(BUCKET)
              .createSignedUrl(url, 3600)
            return { ...row, attachment_url: signed?.signedUrl ?? url }
          } catch {
            return row
          }
        }
        return row
      })
    )

    logger.info('Leave requests fetched successfully', {
      count: result?.length || 0,
      companyId,
    })

    res.status(200).json({ data: result })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    logger.error('Leave requests API error:', { error: msg })
    const status =
      msg === 'UNAUTHORIZED'
        ? 401
        : msg === 'COMPANY_ACCESS_REQUIRED'
          ? 400
          : msg === 'PROFILE_REQUIRED' || msg === 'ACCOUNT_DEACTIVATED' || msg === 'INSUFFICIENT_PERMISSIONS'
            ? 403
            : 500
    return res.status(status).json({ error: msg, message: msg })
  }
}

async function signLeaveAttachmentIfNeeded(row: Record<string, unknown>) {
  const url = row.attachment_url
  if (typeof url !== 'string' || !url.startsWith('leave-attachments/')) {
    return row
  }
  try {
    const adminSupabase = createAdminClient()
    const { data: signed } = await adminSupabase.storage.from('HR_BUCKET').createSignedUrl(url, 3600)
    return { ...row, attachment_url: signed?.signedUrl ?? url }
  } catch {
    return row
  }
}

async function handleCreateLeaveRequest(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await requireCompanyAccess(req, res)
    const { supabase, companyId, userProfile } = auth

    if (!canListOrCreateLeave(userProfile)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tiene permiso para crear solicitudes de permiso',
      })
    }

    const form = formidable({
      maxFileSize: 5 * 1024 * 1024,
      filter: ({ name, originalFilename }) => {
        if (name === 'attachment') {
          const ext = originalFilename?.toLowerCase().split('.').pop()
          return ext === 'pdf' || ext === 'jpg' || ext === 'jpeg'
        }
        return true
      },
    })

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, flds, fls) => {
        if (err) reject(err)
        else resolve([flds, fls])
      })
    })

    const employee_dni = fields.employee_dni?.[0] as string
    const leave_type_id = fields.leave_type_id?.[0] as string
    const start_date = fields.start_date?.[0] as string
    const end_date = fields.end_date?.[0] as string
    const duration_type = fields.duration_type?.[0] as 'hours' | 'days'
    const duration_hours = fields.duration_hours?.[0] ? parseFloat(fields.duration_hours[0]) : undefined
    const is_half_day = fields.is_half_day?.[0] === 'true'
    const reason = fields.reason?.[0] as string
    const attachment = files.attachment?.[0]

    if (!employee_dni || !leave_type_id || !start_date || !end_date || !duration_type) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Faltan employee_dni, leave_type_id, start_date, end_date o duration_type',
      })
    }

    const startDate = new Date(start_date)
    const endDate = new Date(end_date)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format', message: 'Fechas inválidas' })
    }
    if (endDate < startDate) {
      return res.status(400).json({
        error: 'Invalid date range',
        message: 'La fecha fin no puede ser anterior al inicio',
      })
    }

    if (duration_type === 'hours') {
      if (is_half_day && duration_hours != null && duration_hours !== 4) {
        return res.status(400).json({
          error: 'Invalid duration',
          message: 'Medio día debe ser exactamente 4 horas',
        })
      }
      if (!is_half_day && (!duration_hours || duration_hours <= 0 || duration_hours > 24)) {
        return res.status(400).json({
          error: 'Invalid duration',
          message: 'Las horas deben estar entre 1 y 24',
        })
      }
    }

    let empQuery = supabase.from('employees').select('id, company_id').eq('dni', employee_dni)
    if (companyId) {
      empQuery = empQuery.eq('company_id', companyId)
    }
    const { data: employee, error: empError } = await empQuery.maybeSingle()

    if (empError || !employee) {
      logger.warn('Employee not found by DNI', { dni: employee_dni, companyId })
      return res.status(404).json({ error: 'Employee not found', message: 'Empleado no encontrado' })
    }

    if (companyId && employee.company_id !== companyId) {
      logger.warn('User trying to create leave request for employee from different company', {
        companyId,
        employeeCompanyId: employee.company_id,
      })
      return res.status(403).json({ error: 'Access denied', message: 'Acceso denegado' })
    }

    const effectiveCompanyId = companyId ?? employee.company_id
    const { data: leaveType, error: ltError } = await supabase
      .from('leave_types')
      .select('id, company_id')
      .eq('id', leave_type_id)
      .maybeSingle()

    if (ltError || !leaveType || leaveType.company_id !== effectiveCompanyId) {
      logger.warn('Invalid leave_type for company', { leave_type_id, effectiveCompanyId })
      return res.status(400).json({
        error: 'Invalid leave type',
        message: 'El tipo de permiso no pertenece a la empresa del empleado',
      })
    }

    let days_requested: number
    if (duration_type === 'hours') {
      const actualHours = is_half_day ? 4 : duration_hours || 8
      days_requested = actualHours / 8.0
    } else {
      const timeDiff = endDate.getTime() - startDate.getTime()
      days_requested = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1
    }

    let attachment_url: string | undefined
    let attachment_type: 'pdf' | 'jpg' | undefined
    let attachment_name: string | undefined

    if (attachment) {
      const ext = attachment.originalFilename?.toLowerCase().split('.').pop()
      const safeExt = ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' ? ext : 'pdf'
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${safeExt}`
      const storagePath = `leave-attachments/${effectiveCompanyId}/${employee.id}/${fileName}`

      const fs = await import('fs/promises')
      const fileBuffer = await fs.readFile(attachment.filepath)
      const adminSupabase = createAdminClient()

      const { error: uploadError } = await adminSupabase.storage
        .from('HR_BUCKET')
        .upload(storagePath, fileBuffer, {
          contentType: attachment.mimetype || (safeExt === 'pdf' ? 'application/pdf' : 'image/jpeg'),
          upsert: false,
        })

      try {
        await fs.unlink(attachment.filepath)
      } catch {
        /* ignore */
      }

      if (uploadError) {
        logger.error('Failed to upload leave attachment', { error: uploadError, storagePath })
        return res.status(500).json({
          error: 'Error al subir el archivo adjunto',
          message: uploadError.message,
        })
      }

      attachment_url = storagePath
      attachment_type = safeExt === 'pdf' ? 'pdf' : 'jpg'
      attachment_name = attachment.originalFilename || undefined

      logger.info('File uploaded to Storage successfully', {
        storagePath,
        originalName: attachment.originalFilename,
        size: attachment.size,
        companyId: effectiveCompanyId,
      })
    }

    const { data: leaveRequest, error: createError } = await supabase
      .from('leave_requests')
      .insert([
        {
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
          status: 'pending',
        },
      ])
      .select(LEAVE_SELECT_ENRICHED)
      .single()

    if (createError) {
      logger.error('Error creating leave request:', {
        error: createError.message,
        companyId: effectiveCompanyId,
        employeeId: employee.id,
      })
      return res.status(500).json({
        error: 'Error creating leave request',
        message: createError.message,
      })
    }

    const payload = await signLeaveAttachmentIfNeeded(leaveRequest as Record<string, unknown>)

    logger.info('Leave request created successfully', {
      leaveRequestId: (leaveRequest as { id: string }).id,
      employeeId: employee.id,
      companyId: effectiveCompanyId,
      durationType: duration_type,
      daysRequested: days_requested,
    })

    res.status(201).json({ data: payload })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    logger.error('Leave create request API error:', { error: msg })
    const status =
      msg === 'UNAUTHORIZED'
        ? 401
        : msg === 'COMPANY_ACCESS_REQUIRED'
          ? 400
          : msg === 'PROFILE_REQUIRED' || msg === 'ACCOUNT_DEACTIVATED' || msg === 'INSUFFICIENT_PERMISSIONS'
            ? 403
            : 500
    return res.status(status).json({ error: msg, message: msg })
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net',
    process.env.RAILWAY_PUBLIC_DOMAIN || 'https://hr-saas.railway.app',
    'https://staging.humanosisu.net',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001'] : []),
  ]

  const origin = req.headers.origin
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (method === 'OPTIONS') {
    res.status(200).end()
    return
  }

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
        res.status(405).json({ error: `Method ${method} Not Allowed`, message: `Method ${method} Not Allowed` })
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    logger.error('Unexpected error in leave API:', { error: msg, method })
    res.status(500).json({ error: 'Internal server error', message: msg })
  }
}
