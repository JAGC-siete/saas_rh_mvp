/**
 * Bandeja de leads de una landing de la empresa en sesión.
 *
 * GET: lista los contactos capturados. El tenant llega del requireCompanyAccess y
 * se vuelve a filtrar con .eq('company_id', companyId). La tabla real es landing_leads
 * (landing_id), no landing_page_leads.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { logger } from '../../../../lib/logger'
import {
  LANDING_LEADS_TABLE,
  LANDING_LEAD_LIST_COLUMNS,
  LANDING_PAGES_TABLE,
} from '../../../../lib/landings/db'
import type { LandingLeadListItem, LandingLeadsResponse } from '../../../../types/landing'

const MAX_LEADS = 1000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  let auth
  try {
    auth = await requireCompanyAccess(req, res)
  } catch {
    return
  }

  const { supabase, companyId } = auth
  if (!companyId) {
    return res.status(400).json({ error: 'Necesitas una empresa activa para ver los leads' })
  }

  const rawId = req.query.id
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: 'Identificador inválido' })
  }

  const { data: landing, error: landingError } = await supabase
    .from(LANDING_PAGES_TABLE)
    .select('id, title, slug')
    .eq('id', id)
    .eq('company_id', companyId)
    .maybeSingle()

  if (landingError) {
    logger.error('Error resolviendo landing para bandeja de leads', {
      companyId,
      landingId: id,
      error: landingError.message,
    })
    return res.status(500).json({ error: 'No se pudieron cargar los leads' })
  }
  if (!landing) {
    return res.status(404).json({ error: 'Landing no encontrada' })
  }

  const { data, error } = await supabase
    .from(LANDING_LEADS_TABLE)
    .select(LANDING_LEAD_LIST_COLUMNS)
    .eq('landing_id', id)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(MAX_LEADS)

  if (error) {
    logger.error('Error listando leads de landing', {
      companyId,
      landingId: id,
      error: error.message,
    })
    return res.status(500).json({ error: 'No se pudieron cargar los leads' })
  }

  const response: LandingLeadsResponse = {
    landing: landing as { id: string; title: string; slug: string },
    leads: (data ?? []) as LandingLeadListItem[],
  }

  return res.status(200).json(response)
}
