/**
 * Publicar / despublicar una landing (solo superadmin).
 *
 * Publicar = validar el borrador con Zod estricto, copiarlo a published_content_json y
 * sellar published_at en la misma sentencia.
 *
 * Despublicar = status 'draft'. El snapshot se conserva; el rol anon exige published.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '../../../../lib/logger'
import { parseLandingIdParam, requireLandingAdmin } from '../../../../lib/landings/admin-auth'
import { parsePublishLanding } from '../../../../lib/landings/admin-schema'
import { LANDING_PAGES_TABLE } from '../../../../lib/landings/db'
import { landingContentFieldErrors, parseLandingPageContent } from '../../../../lib/landings/page-schema'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const auth = await requireLandingAdmin(req, res)
  if (!auth) return

  const { supabase, user, auditLog } = auth

  const id = parseLandingIdParam(req)
  if (!id) {
    return res.status(400).json({ error: 'Identificador inválido' })
  }

  const parsed = parsePublishLanding(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Acción inválida' })
  }

  const { data: current, error: readError } = await supabase
    .from(LANDING_PAGES_TABLE)
    .select('id, slug, status, content_json')
    .eq('id', id)
    .maybeSingle()

  if (readError) {
    logger.error('Error leyendo landing para publicar', { landingId: id, error: readError.message })
    return res.status(500).json({ error: 'No se pudo procesar la publicación' })
  }
  if (!current) {
    return res.status(404).json({ error: 'Landing no encontrada' })
  }

  const row = current as { id: string; slug: string; status: string; content_json: unknown }

  if (parsed.data.action === 'unpublish') {
    const { error } = await supabase
      .from(LANDING_PAGES_TABLE)
      .update({ status: 'draft', updated_by: user.id })
      .eq('id', id)

    if (error) {
      logger.error('Error despublicando landing', { landingId: id, error: error.message })
      return res.status(500).json({ error: 'No se pudo despublicar' })
    }

    await auditLog('landing_unpublished', { landingId: id, slug: row.slug })
    logger.info('Landing despublicada', { landingId: id, slug: row.slug })
    return res.status(200).json({ success: true, status: 'draft' })
  }

  const content = parseLandingPageContent(row.content_json)
  if (!content.success) {
    const fields = landingContentFieldErrors(content.error)
    const firstKey = Object.keys(fields)[0]
    return res.status(422).json({
      error: 'El borrador tiene datos inválidos y no se puede publicar.',
      detail: firstKey ? `${firstKey}: ${fields[firstKey]}` : null,
      fields,
    })
  }

  const publishedAt = new Date().toISOString()

  const { error } = await supabase
    .from(LANDING_PAGES_TABLE)
    .update({
      published_content_json: content.data,
      status: 'published',
      published_at: publishedAt,
      schema_version: content.data.version,
      updated_by: user.id,
    })
    .eq('id', id)

  if (error) {
    logger.error('Error publicando landing', { landingId: id, error: error.message })
    return res.status(500).json({ error: 'No se pudo publicar' })
  }

  await auditLog('landing_published', { landingId: id, slug: row.slug, blocks: content.data.blocks.length })
  logger.info('Landing publicada', { landingId: id, slug: row.slug, blocks: content.data.blocks.length })

  return res.status(200).json({ success: true, status: 'published', publishedAt, slug: row.slug })
}
