/**
 * Listado y creación de landings de la empresa en sesión.
 *
 * Tenant: requireCompanyAccess entrega el companyId y se usa el cliente con sesión,
 * así aplican las políticas RLS; además cada consulta filtra .eq('company_id', companyId)
 * de forma explícita (defensa en dos capas, no una).
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { logger } from '../../../lib/logger'
import { LANDING_PAGES_TABLE, LANDING_PAGE_LIST_COLUMNS } from '../../../lib/landings/db'
import { parseCreateLanding } from '../../../lib/landings/admin-schema'
import { applyBusinessToTemplate, templateContentFor } from '../../../lib/landings/templates'
import type { LandingPageListItem } from '../../../types/landing'

/** Postgres: violación de índice único (slug global o título repetido en la empresa). */
const UNIQUE_VIOLATION = '23505'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let auth
  try {
    auth = await requireCompanyAccess(req, res)
  } catch {
    // requireCompanyAccess ya respondió con 401/403.
    return
  }

  const { supabase, companyId, user } = auth
  if (!companyId) {
    return res.status(400).json({ error: 'Necesitas una empresa activa para administrar landings' })
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from(LANDING_PAGES_TABLE)
      .select(LANDING_PAGE_LIST_COLUMNS)
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(200)

    if (error) {
      logger.error('Error listando landings', { companyId, error: error.message })
      return res.status(500).json({ error: 'No se pudieron cargar las landings' })
    }

    return res.status(200).json({ landings: (data ?? []) as LandingPageListItem[] })
  }

  if (req.method === 'POST') {
    const parsed = parseCreateLanding(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' })
    }

    const { title, slug, templateType, leadNotifyEmail } = parsed.data

    // El JSON inicial sale de la plantilla y se personaliza con el título elegido.
    const content = applyBusinessToTemplate(templateContentFor(templateType), { name: title })

    const { data, error } = await supabase
      .from(LANDING_PAGES_TABLE)
      .insert({
        company_id: companyId,
        title,
        slug,
        template_type: templateType,
        status: 'draft',
        content_json: content,
        lead_notify_email: leadNotifyEmail ?? null,
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
            : 'Ya tienes una landing con ese título.',
        })
      }
      logger.error('Error creando landing', { companyId, slug, error: error.message })
      return res.status(500).json({ error: 'No se pudo crear la landing' })
    }

    const created = data as { id: string; slug: string }
    logger.info('Landing creada', { companyId, landingId: created.id, templateType })

    return res.status(201).json({ landing: created })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Método no permitido' })
}
