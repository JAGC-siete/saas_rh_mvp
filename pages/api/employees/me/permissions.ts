import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import formidable from 'formidable'

export const config = {
  api: {
    bodyParser: false,
  },
}

async function handleGetPermissions(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createClient(req, res)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    let employeeId = user.user_metadata?.employee_id

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

    const { data: permissions, error: permissionsError } = await supabase
      .from('leave_requests')
      .select(`
        id,
        start_date,
        end_date,
        days_requested,
        reason,
        status,
        rejection_reason,
        attachment_url,
        attachment_name,
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

    // Generate signed URLs for attachments stored in Supabase Storage
    const adminSupabase = createAdminClient()
    const BUCKET = 'HR_BUCKET'
    const result = await Promise.all((permissions || []).map(async (p: any) => {
      if (p.attachment_url && p.attachment_url.startsWith('leave-attachments/')) {
        try {
          const { data: signed } = await adminSupabase.storage
            .from(BUCKET)
            .createSignedUrl(p.attachment_url, 3600)
          return { ...p, attachment_url: signed?.signedUrl ?? p.attachment_url }
        } catch {
          return p
        }
      }
      return p
    }))

    logger.info('Employee permissions fetched', {
      employeeId,
      count: result?.length || 0
    })

    return res.status(200).json(result)
  } catch (error) {
    logger.error('Employee permissions API error', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function handleCreatePermission(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createClient(req, res)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    let employeeId = user.user_metadata?.employee_id
    let companyId = user.user_metadata?.company_id

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

    const contentType = req.headers['content-type'] || ''
    let leave_type_id: string
    let start_date: string
    let end_date: string
    let duration_hours: number | undefined
    let reason: string
    let attachment: formidable.File | undefined

    if (contentType.includes('multipart/form-data')) {
      const form = formidable({
        maxFileSize: 5 * 1024 * 1024,
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

      leave_type_id = fields.leave_type_id?.[0] as string
      start_date = fields.start_date?.[0] as string
      end_date = fields.end_date?.[0] as string
      reason = fields.reason?.[0] as string
      duration_hours = fields.duration_hours?.[0] ? parseInt(fields.duration_hours[0], 10) : undefined
      attachment = files.attachment?.[0]
    } else {
      const body = await new Promise<any>((resolve, reject) => {
        const chunks: Buffer[] = []
        req.on('data', (chunk: Buffer) => chunks.push(chunk))
        req.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')))
          } catch (e) {
            reject(e)
          }
        })
        req.on('error', reject)
      })
      leave_type_id = body.leave_type_id
      start_date = body.start_date
      end_date = body.end_date
      reason = body.reason
      duration_hours = body.duration_hours
    }

    if (!leave_type_id || !start_date || !end_date || !reason) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios: leave_type_id, start_date, end_date, reason'
      })
    }

    const startDate = new Date(start_date)
    const endDate = new Date(end_date)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Formato de fecha inválido' })
    }
    if (endDate < startDate) {
      return res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la fecha de inicio' })
    }

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

    let days_requested: number
    if (duration_hours && duration_hours > 0) {
      days_requested = duration_hours / 8.0
    } else {
      const timeDiff = endDate.getTime() - startDate.getTime()
      days_requested = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1
    }

    let attachment_url: string | undefined
    let attachment_type: 'pdf' | 'jpg' | undefined
    let attachment_name: string | undefined

    if (attachment && companyId) {
      const adminSupabase = createAdminClient()
      const ext = attachment.originalFilename?.toLowerCase().split('.').pop()
      const safeExt = ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' ? ext : 'pdf'
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${safeExt}`
      const storagePath = `leave-attachments/${companyId}/${employeeId}/${fileName}`

      const fs = await import('fs')
      const fileBuffer = fs.readFileSync(attachment.filepath)

      const { error: uploadError } = await adminSupabase.storage
        .from('HR_BUCKET')
        .upload(storagePath, fileBuffer, {
          contentType: attachment.mimetype || (safeExt === 'pdf' ? 'application/pdf' : 'image/jpeg'),
          upsert: false
        })

      fs.unlinkSync(attachment.filepath)

      if (uploadError) {
        logger.error('Failed to upload leave attachment', { error: uploadError, storagePath })
        return res.status(500).json({ error: 'Error al subir el archivo adjunto' })
      }

      attachment_url = storagePath
      attachment_type = safeExt === 'pdf' ? 'pdf' : 'jpg'
      attachment_name = attachment.originalFilename || undefined
    }

    const { data: permissionRequest, error: createError } = await supabase
      .from('leave_requests')
      .insert([{
        employee_id: employeeId,
        leave_type_id,
        employee_dni: employee.dni,
        start_date,
        end_date,
        days_requested,
        duration_type: duration_hours ? 'hours' : 'days',
        duration_hours: duration_hours || undefined,
        reason,
        status: 'pending',
        attachment_url,
        attachment_type,
        attachment_name
      }])
      .select(`
        id,
        start_date,
        end_date,
        days_requested,
        reason,
        status,
        attachment_url,
        attachment_name,
        created_at,
        leave_type:leave_types(id, name, color, is_paid)
      `)
      .single()

    if (createError) {
      logger.error('Error creating permission request', {
        error: createError.message,
        employeeId,
        requestData: { leave_type_id, start_date, end_date }
      })
      return res.status(500).json({ error: 'Error al crear solicitud de permiso' })
    }

    logger.info('Leave request created successfully (pending approval)', {
      permissionId: permissionRequest.id,
      employeeId,
      leaveType: leave_type_id,
      durationHours: duration_hours,
      daysRequested: days_requested
    })

    return res.status(201).json(permissionRequest)
  } catch (error) {
    logger.error('Employee permission creation API error', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
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
