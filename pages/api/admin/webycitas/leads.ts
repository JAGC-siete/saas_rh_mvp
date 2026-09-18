/**
 * Bandeja superadmin de solicitudes /webycitas.
 * No toca marketing_leads, landing_leads ni companies.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { logger } from '../../../../lib/logger'
import {
  WEBYCITAS_LEADS_TABLE,
  WEBYCITAS_LEAD_STATUSES,
} from '../../../../lib/marketing/demo-local'

const MAX_LEADS = 500

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(WEBYCITAS_LEAD_STATUSES),
})

const LIST_COLUMNS =
  'id, owner_name, business_name, email, phone, rubro, city, note, services, status, source, preview_slug, landing_id, consented_at, notified_at, created_at'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const { adminClient, user, auditLog } = await requireSuperAdminWithAudit(req, res)
    if (!user?.id) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    if (req.method === 'GET') {
      const { data, error } = await adminClient
        .from(WEBYCITAS_LEADS_TABLE)
        .select(LIST_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(MAX_LEADS)

      if (error) {
        logger.error('Error listando leads webycitas', { error: error.message })
        return res.status(500).json({ error: 'No se pudieron cargar las solicitudes' })
      }

      await auditLog('webycitas_leads_listed', { count: (data ?? []).length })
      return res.status(200).json({ leads: data ?? [] })
    }

    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' })
    }

    const { id, status } = parsed.data
    const { data, error } = await adminClient
      .from(WEBYCITAS_LEADS_TABLE)
      .update({ status })
      .eq('id', id)
      .select('id, status')
      .maybeSingle()

    if (error) {
      logger.error('Error actualizando lead webycitas', { id, error: error.message })
      return res.status(500).json({ error: 'No se pudo actualizar el estado' })
    }
    if (!data) {
      return res.status(404).json({ error: 'Solicitud no encontrada' })
    }

    await auditLog('webycitas_lead_status', { id, status })
    return res.status(200).json({ lead: data })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS')) {
      return
    }
    if (res.headersSent) return
    logger.error('Error en bandeja webycitas', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return res.status(500).json({ error: 'Error interno' })
  }
}
