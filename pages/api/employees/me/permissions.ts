import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import formidable from 'formidable'
import { assertEmployeePortalEnabled } from '../../../../lib/employee-portal/company-settings'
import { normalizeCountryCode } from '../../../../lib/country/supported'
import {
  validateDateOrder,
  validateDurationHoursBlock,
  proposedDaysFromForm,
} from '../../../../lib/leave/leave-request-validation'
import { art95WouldExceed } from '../../../../lib/leave/honduras-labor-reference'

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
    let companyId = user.user_metadata?.company_id as string | undefined

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
      companyId = userProfile.company_id ?? undefined
    } else if (!companyId) {
      const { data: up } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle()
      companyId = up?.company_id ?? undefined
    }

    if (!(await assertEmployeePortalEnabled(supabase, companyId, res))) {
      return
    }

    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '10'), 10) || 10))
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: permissions, error: permissionsError, count } = await supabase
      .from('leave_requests')
      .select(
        `
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
      `,
        { count: 'exact' }
      )
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (permissionsError) {
      logger.error('Failed to fetch employee permissions', {
        employeeId,
        error: permissionsError
      })
      return res.status(500).json({ error: 'Error al obtener permisos' })
    }

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
      count: result?.length || 0,
      total: count ?? 0,
      page,
      limit
    })

    return res.status(200).json({
      data: result,
      total: count ?? 0,
      page,
      limit
    })
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
    let companyId = user.user_metadata?.company_id as string | undefined

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
      companyId = userProfile.company_id ?? undefined
    } else if (!companyId) {
      const { data: up } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle()
      companyId = up?.company_id ?? undefined
    }

    if (!(await assertEmployeePortalEnabled(supabase, companyId, res))) {
      return
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

    const dateOrder = validateDateOrder(start_date, end_date)
    if (!dateOrder.ok) {
      return res.status(400).json({ error: dateOrder.message })
    }

    const { data: leaveTypeRow, error: ltErr } = await supabase
      .from('leave_types')
      .select('id, company_id, employee_self_service, is_statutory_art95')
      .eq('id', leave_type_id)
      .maybeSingle()

    if (ltErr || !leaveTypeRow || leaveTypeRow.company_id !== companyId) {
      return res.status(400).json({ error: 'Tipo de permiso inválido para su empresa' })
    }

    if (!leaveTypeRow.employee_self_service) {
      return res.status(403).json({
        error: 'Autogestión no habilitada',
        message: 'Este tipo de permiso no está disponible para solicitud desde el portal.',
      })
    }

    const duration_type = duration_hours && duration_hours > 0 ? ('hours' as const) : ('days' as const)
    const is_half_day = duration_type === 'hours' && duration_hours === 4

    const durCheck = validateDurationHoursBlock({
      duration_type,
      is_half_day,
      duration_hours,
    })
    if (!durCheck.ok) {
      return res.status(400).json({ error: durCheck.message })
    }

    const proposed = proposedDaysFromForm({
      duration_type,
      start_date,
      end_date,
      duration_hours,
      is_half_day,
    })
    if (proposed == null) {
      return res.status(400).json({ error: 'No se pudo calcular la duración de la solicitud' })
    }
    const days_requested = proposed

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

    let countryCode = normalizeCountryCode(undefined)
    if (companyId) {
      const { data: co } = await supabase.from('companies').select('country_code').eq('id', companyId).maybeSingle()
      countryCode = normalizeCountryCode(co?.country_code)
    }

    if (countryCode === 'HND' && leaveTypeRow.is_statutory_art95) {
      const { data: art95Types } = await supabase
        .from('leave_types')
        .select('id')
        .eq('company_id', companyId as string)
        .eq('is_statutory_art95', true)

      let art95Ids = (art95Types || []).map((t) => t.id)
      if (art95Ids.length === 0) {
        art95Ids = [leave_type_id]
      }

      const y = start_date.slice(0, 4)
      const ym = start_date.slice(0, 7)

      const { data: yearRows } = await supabase
        .from('leave_requests')
        .select('days_requested')
        .eq('employee_id', employeeId)
        .in('leave_type_id', art95Ids)
        .in('status', ['pending', 'approved'])
        .gte('start_date', `${y}-01-01`)
        .lte('start_date', `${y}-12-31`)

      const { data: monthRows } = await supabase
        .from('leave_requests')
        .select('days_requested')
        .eq('employee_id', employeeId)
        .in('leave_type_id', art95Ids)
        .in('status', ['pending', 'approved'])
        .gte('start_date', `${ym}-01`)
        .lte('start_date', `${ym}-31`)

      const usedYear = (yearRows || []).reduce((s, r) => s + Number(r.days_requested || 0), 0)
      const usedMonth = (monthRows || []).reduce((s, r) => s + Number(r.days_requested || 0), 0)

      const cap = art95WouldExceed({
        usedYear,
        usedMonth,
        proposedDays: days_requested,
      })
      if (!cap.ok) {
        return res.status(400).json({ error: cap.message })
      }
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
        duration_type,
        duration_hours: duration_type === 'hours' ? (is_half_day ? 4 : duration_hours) : undefined,
        is_half_day: duration_type === 'hours' ? is_half_day : false,
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
