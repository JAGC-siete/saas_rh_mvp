/**
 * Lectura y guardado del borrador de una landing (solo superadmin).
 *
 * GET devuelve el borrador completo para el editor.
 * PATCH guarda con validación ESTRICTA (parseLandingPageContent vía updateLandingSchema).
 * DELETE archiva en vez de borrar, para no perder leads ni historial.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '../../../lib/logger'
import { parseLandingIdParam, requireLandingAdmin } from '../../../lib/landings/admin-auth'
import { parseUpdateLanding } from '../../../lib/landings/admin-schema'
import { LANDING_PAGES_TABLE, LANDING_PAGE_EDIT_COLUMNS } from '../../../lib/landings/db'
import type { LandingPageRow } from '../../../types/landing'

const UNIQUE_VIOLATION = '23505'

type EditRow = Pick<
  LandingPageRow,
  | 'id'
  | 'company_id'
  | 'title'
  | 'slug'
  | 'template_type'
  | 'status'
  | 'schema_version'
  | 'content_json'
  | 'lead_notify_email'
  | 'published_at'
  | 'updated_at'
>

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireLandingAdmin(req, res)
  if (!auth) return

  const { supabase, user, auditLog } = auth

  const id = parseLandingIdParam(req)
  if (!id) {
    return res.status(400).json({ error: 'Identificador inválido' })
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from(LANDING_PAGES_TABLE)
      .select(LANDING_PAGE_EDIT_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      logger.error('Error leyendo landing para editar', { landingId: id, error: error.message })
      return res.status(500).json({ error: 'No se pudo cargar la landing' })
    }
    if (!data) {
      return res.status(404).json({ error: 'Landing no encontrada' })
    }

    return res.status(200).json({ landing: data as EditRow })
  }

  if (req.method === 'PATCH') {
    const parsed = parseUpdateLanding(req.body)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      return res.status(400).json({
        error: first?.message ?? 'Datos inválidos',
        path: first?.path.join('.') ?? null,
      })
    }

    const { title, slug, leadNotifyEmail, content } = parsed.data
    const patch: Record<string, unknown> = { updated_by: user.id }

    if (title !== undefined) patch.title = title
    if (slug !== undefined) patch.slug = slug
    if (leadNotifyEmail !== undefined) patch.lead_notify_email = leadNotifyEmail
    if (content !== undefined) {
      patch.content_json = content
      patch.schema_version = content.version
    }

    const { data, error } = await supabase
      .from(LANDING_PAGES_TABLE)
      .update(patch)
      .eq('id', id)
      .select('id, title, slug, status, updated_at')
      .maybeSingle()

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return res.status(409).json({
          error: error.message.includes('slug')
            ? 'Ese slug ya está tomado por otra página.'
            : 'Ya existe una landing con ese título.',
        })
      }
      logger.error('Error guardando borrador de landing', { landingId: id, error: error.message })
      return res.status(500).json({ error: 'No se pudo guardar' })
    }
    if (!data) {
      return res.status(404).json({ error: 'Landing no encontrada' })
    }

    return res.status(200).json({ landing: data })
  }

  if (req.method === 'DELETE') {
    const { data, error } = await supabase
      .from(LANDING_PAGES_TABLE)
      .update({ status: 'archived', updated_by: user.id })
      .eq('id', id)
      .select('id')
      .maybeSingle()

    if (error) {
      logger.error('Error archivando landing', { landingId: id, error: error.message })
      return res.status(500).json({ error: 'No se pudo archivar' })
    }
    if (!data) {
      return res.status(404).json({ error: 'Landing no encontrada' })
    }

    await auditLog('landing_archived', { landingId: id })
    logger.info('Landing archivada', { landingId: id })
    return res.status(200).json({ success: true })
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE')
  return res.status(405).json({ error: 'Método no permitido' })
}
