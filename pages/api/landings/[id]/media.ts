/**
 * Prepara una subida firmada al bucket público de la landing.
 * El archivo va del navegador a Storage; esta ruta solo valida y devuelve la URL.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '../../../../lib/logger'
import { parseLandingIdParam, requireLandingAdmin } from '../../../../lib/landings/admin-auth'
import { LANDING_PAGES_TABLE } from '../../../../lib/landings/db'
import {
  LANDING_MEDIA_BUCKET,
  LANDING_MEDIA_MAX_BYTES,
  isLandingMediaMime,
  landingMediaObjectPath,
} from '../../../../lib/landings/media'

interface UploadBody {
  file_size?: number
  mime_type?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const auth = await requireLandingAdmin(req, res)
  if (!auth) return

  const landingId = parseLandingIdParam(req)
  if (!landingId) return res.status(400).json({ error: 'Identificador inválido' })

  const body = (req.body ?? {}) as UploadBody
  const fileSize = body.file_size
  const mime = typeof body.mime_type === 'string' ? body.mime_type : ''

  if (typeof fileSize !== 'number' || !Number.isFinite(fileSize) || fileSize <= 0) {
    return res.status(400).json({ error: 'El tamaño del archivo no es válido' })
  }
  if (fileSize > LANDING_MEDIA_MAX_BYTES) {
    return res.status(400).json({ error: 'La imagen no puede superar 5 MB' })
  }
  if (!mime || !isLandingMediaMime(mime)) {
    return res.status(400).json({ error: 'Usa una imagen JPG, PNG o WebP' })
  }

  const { supabase, adminClient } = auth
  const { data: landing, error: readError } = await supabase
    .from(LANDING_PAGES_TABLE)
    .select('id')
    .eq('id', landingId)
    .maybeSingle()

  if (readError) {
    logger.error('Error comprobando landing antes de subir foto', { landingId, error: readError.message })
    return res.status(500).json({ error: 'No se pudo preparar la carga' })
  }
  if (!landing) return res.status(404).json({ error: 'Landing no encontrada' })

  const storagePath = landingMediaObjectPath(landingId, mime)
  const { data: signed, error: signError } = await adminClient.storage
    .from(LANDING_MEDIA_BUCKET)
    .createSignedUploadUrl(storagePath)

  if (signError || !signed?.signedUrl) {
    logger.error('No se pudo firmar la subida de foto de landing', { landingId, error: signError?.message })
    return res.status(500).json({ error: 'No se pudo preparar la carga' })
  }

  const { data: pub } = adminClient.storage.from(LANDING_MEDIA_BUCKET).getPublicUrl(storagePath)

  return res.status(200).json({
    uploadUrl: signed.signedUrl,
    publicUrl: pub.publicUrl,
  })
}
