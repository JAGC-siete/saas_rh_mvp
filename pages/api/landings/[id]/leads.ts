/**
 * Bandeja de leads de una landing (solo superadmin).
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '../../../../lib/logger'
import { parseLandingIdParam, requireLandingAdmin } from '../../../../lib/landings/admin-auth'
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

  const auth = await requireLandingAdmin(req, res)
  if (!auth) return

  const { supabase } = auth

  const id = parseLandingIdParam(req)
  if (!id) {
    return res.status(400).json({ error: 'Identificador inválido' })
  }

  const { data: landing, error: landingError } = await supabase
    .from(LANDING_PAGES_TABLE)
    .select('id, title, slug')
    .eq('id', id)
    .maybeSingle()

  if (landingError) {
    logger.error('Error resolviendo landing para bandeja de leads', {
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
    .order('created_at', { ascending: false })
    .limit(MAX_LEADS)

  if (error) {
    logger.error('Error listando leads de landing', { landingId: id, error: error.message })
    return res.status(500).json({ error: 'No se pudieron cargar los leads' })
  }

  const response: LandingLeadsResponse = {
    landing: landing as { id: string; title: string; slug: string },
    leads: (data ?? []) as LandingLeadListItem[],
  }

  return res.status(200).json(response)
}
