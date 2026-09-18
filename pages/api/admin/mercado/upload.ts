/**
 * Upload de logo / fachada al bucket mercado-san-pablo (solo SuperAdmin).
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { logger } from '../../../../lib/logger'
import { MERCADO_STORAGE_BUCKET } from '../../../../lib/mercado/paths'
import { env } from '../../../../lib/env'
import formidable from 'formidable'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'

export const config = {
  api: { bodyParser: false },
}

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024

function extFor(mime: string) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

function parseForm(req: NextApiRequest) {
  const form = formidable({
    maxFileSize: MAX_BYTES,
    multiples: false,
  })
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err)
      else resolve({ fields, files })
    })
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const { adminClient, user, auditLog } = await requireSuperAdminWithAudit(req, res)
    if (!user?.id) return res.status(401).json({ error: 'No autorizado' })

    const { fields, files } = await parseForm(req)
    const kindRaw = fields.kind
    const kind = Array.isArray(kindRaw) ? kindRaw[0] : kindRaw
    if (kind !== 'logo' && kind !== 'facade' && kind !== 'product') {
      return res.status(400).json({ error: 'kind debe ser logo, facade o product.' })
    }

    const fileField = files.file
    const file = Array.isArray(fileField) ? fileField[0] : fileField
    if (!file) return res.status(400).json({ error: 'Falta el archivo.' })

    const mime = file.mimetype || ''
    if (!ALLOWED.has(mime)) {
      return res.status(400).json({ error: 'Solo JPEG, PNG o WebP.' })
    }

    const buffer = readFileSync(file.filepath)
    const path = `vendors/${kind}/${randomUUID()}.${extFor(mime)}`

    const { error: uploadError } = await adminClient.storage
      .from(MERCADO_STORAGE_BUCKET)
      .upload(path, buffer, { contentType: mime, upsert: false })

    if (uploadError) {
      logger.error('mercado upload', { error: uploadError.message })
      return res.status(500).json({ error: 'No se pudo subir la imagen' })
    }

    const base = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
    const publicUrl = `${base}/storage/v1/object/public/${MERCADO_STORAGE_BUCKET}/${path}`

    await auditLog('mercado_image_uploaded', { kind, path })
    return res.status(201).json({
      path,
      url: publicUrl,
      alt: kind === 'facade' ? 'Fachada del puesto' : kind === 'logo' ? 'Logo del puesto' : 'Producto',
    })
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS')
    ) {
      return
    }
    if (res.headersSent) return
    logger.error('mercado upload crash', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return res.status(500).json({ error: 'Error interno' })
  }
}
