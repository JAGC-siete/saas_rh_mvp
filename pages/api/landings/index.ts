/**
 * Listado y creación de landings de ejemplo (herramienta de superadmin).
 *
 * No exige empresa activa: las páginas se cuelgan de la empresa contenedora
 * landing-studio. El JWT de super_admin pasa el RLS; cada mutación usa ese cliente.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '../../../lib/logger'
import { requireLandingAdmin } from '../../../lib/landings/admin-auth'
import { parseCreateLanding } from '../../../lib/landings/admin-schema'
import { LANDING_PAGES_TABLE, LANDING_PAGE_LIST_COLUMNS } from '../../../lib/landings/db'
import { ensureLandingStudioCompanyId } from '../../../lib/landings/studio-company'
import { applyBusinessToTemplate, templateContentFor } from '../../../lib/landings/templates'
import type { LandingPageListItem } from '../../../types/landing'

const UNIQUE_VIOLATION = '23505'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireLandingAdmin(req, res)
  if (!auth) return

  const { supabase, adminClient, user, auditLog } = auth

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from(LANDING_PAGES_TABLE)
      .select(LANDING_PAGE_LIST_COLUMNS)
      .order('updated_at', { ascending: false })
      .limit(200)

    if (error) {
      logger.error('Error listando landings', { error: error.message, userId: user.id })
      return res.status(500).json({ error: 'No se pudieron cargar las landings' })
    }

    return res.status(200).json({ landings: (data ?? []) as LandingPageListItem[] })
  }

  if (req.method === 'POST') {
    const parsed = parseCreateLanding(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' })
    }

    const { title, slug, templateType, city, address, phone, whatsapp, email, leadNotifyEmail } =
      parsed.data

    let companyId: string
    try {
      companyId = await ensureLandingStudioCompanyId(adminClient)
    } catch (err: unknown) {
      logger.error('Error resolviendo empresa contenedora de landings', {
        error: err instanceof Error ? err.message : String(err),
      })
      return res.status(500).json({ error: 'No se pudo preparar el espacio para crear la landing' })
    }

    const content = applyBusinessToTemplate(templateContentFor(templateType), {
      name: title,
      city,
      address,
      phone,
      whatsapp,
      email,
    })

    const { data, error } = await supabase
      .from(LANDING_PAGES_TABLE)
      .insert({
        company_id: companyId,
        title,
        slug,
        template_type: templateType,
        status: 'draft',
        content_json: content,
        lead_notify_email: leadNotifyEmail ?? email ?? null,
        created_by: user.id,
        updated_by: user.id,
      })
      .select('id, slug')
      .single()

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        const isSlug = error.message.includes('slug')
        return res.status(409).json({
          error: isSlug
            ? 'Ese slug ya está tomado. Prueba con otro (por ejemplo, agregando la ciudad).'
            : 'Ya existe una landing con ese título.',
        })
      }
      logger.error('Error creando landing', { companyId, slug, error: error.message })
      return res.status(500).json({ error: 'No se pudo crear la landing' })
    }

    const created = data as { id: string; slug: string }
    await auditLog('landing_created', { landingId: created.id, slug: created.slug, templateType })
    logger.info('Landing creada', { companyId, landingId: created.id, templateType })

    return res.status(201).json({ landing: created })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Método no permitido' })
}
