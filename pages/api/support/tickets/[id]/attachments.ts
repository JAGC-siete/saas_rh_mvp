import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import { requireCompanyAccess } from '../../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../../lib/supabase/server'
import { logger } from '../../../../../lib/logger'
import { sanitizeFilename } from '../../../../../lib/security/file-upload-validation'
import type { SupportTicketRow } from '../../../../../lib/support/schema'

export const config = {
  api: {
    bodyParser: false,
  },
}

const BUCKET = 'HR_BUCKET'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
])

const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf', 'txt'])

const AGENT_ROLES = ['super_admin']
const COMPANY_MANAGER_ROLES = ['company_admin', 'hr_manager']

async function loadTicketWithAccess(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ ticket: SupportTicketRow; auth: Awaited<ReturnType<typeof requireCompanyAccess>>; isAgent: boolean } | null> {
  const auth = await requireCompanyAccess(req, res)
  const isAgent = AGENT_ROLES.includes(auth.role)
  const isManager = COMPANY_MANAGER_ROLES.includes(auth.role)
  const supabase = createAdminClient()

  const ticketId = typeof req.query.id === 'string' ? req.query.id : null
  if (!ticketId) {
    res.status(400).json({ error: 'Ticket ID requerido' })
    return null
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    res.status(404).json({ error: 'Ticket no encontrado' })
    return null
  }

  const ticket = data as SupportTicketRow
  const isOwner = ticket.created_by === auth.user.id
  const sameCompany = !!auth.companyId && ticket.company_id === auth.companyId
  if (!(isAgent || isOwner || (isManager && sameCompany))) {
    res.status(403).json({ error: 'No tiene permiso para este ticket' })
    return null
  }

  return { ticket, auth, isAgent }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const ctx = await loadTicketWithAccess(req, res)
    if (!ctx) return
    const { ticket, auth } = ctx
    const supabase = createAdminClient()

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('ticket_attachments')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      const withUrls = await Promise.all(
        (data ?? []).map(async (row: Record<string, unknown>) => {
          const path = row.storage_path as string
          try {
            const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
            return { ...row, url: signed?.signedUrl ?? null }
          } catch {
            return { ...row, url: null }
          }
        })
      )

      return res.status(200).json({ attachments: withUrls })
    }

    if (req.method === 'POST') {
      const form = formidable({
        maxFileSize: MAX_FILE_SIZE,
        filter: ({ name, originalFilename }) => {
          if (name !== 'file') return false
          const ext = originalFilename?.toLowerCase().split('.').pop()
          return !!ext && ALLOWED_EXT.has(ext)
        },
      })

      const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
        form.parse(req, (err, flds, fls) => {
          if (err) reject(err)
          else resolve([flds, fls])
        })
      })

      const file = files.file?.[0]
      if (!file) {
        return res.status(400).json({ error: 'Archivo requerido o tipo no permitido' })
      }

      const mime = file.mimetype || ''
      if (!ALLOWED_MIME.has(mime)) {
        return res.status(400).json({ error: 'Tipo de archivo no permitido' })
      }

      const messageId = typeof fields.message_id?.[0] === 'string' ? fields.message_id[0] : null
      const originalName = sanitizeFilename(file.originalFilename || 'adjunto')
      const ext = originalName.toLowerCase().split('.').pop() || 'bin'
      const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`
      const storagePath = `support-attachments/${ticket.company_id}/${ticket.id}/${storedName}`

      const fs = await import('fs/promises')
      const fileBuffer = await fs.readFile(file.filepath)

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, fileBuffer, { contentType: mime, upsert: false })

      try {
        await fs.unlink(file.filepath)
      } catch {
        /* ignore */
      }

      if (uploadError) {
        logger.error('support: failed to upload attachment', { error: uploadError.message, storagePath })
        return res.status(500).json({ error: 'Error al subir el archivo' })
      }

      const { data: record, error: insertError } = await supabase
        .from('ticket_attachments')
        .insert({
          ticket_id: ticket.id,
          message_id: messageId,
          company_id: ticket.company_id,
          uploaded_by: auth.user.id,
          storage_path: storagePath,
          file_name: originalName,
          file_type: mime,
          file_size: file.size ?? null,
        })
        .select('*')
        .single()

      if (insertError) throw insertError

      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600)

      return res.status(201).json({ attachment: { ...record, url: signed?.signedUrl ?? null } })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    if (['UNAUTHORIZED', 'PROFILE_REQUIRED', 'COMPANY_ACCESS_REQUIRED'].includes(error?.message)) return
    logger.error('support/attachments API error', error)
    return res.status(500).json({ error: error?.message || 'Internal server error' })
  }
}

export default handler
