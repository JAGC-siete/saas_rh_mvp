import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../../lib/auth/api-auth-fixed'
import { withGeneralRateLimit } from '../../../../../lib/security/rate-limiting'
import { createAdminClient } from '../../../../../lib/supabase/server'
import {
  assertCanManageOdoo,
  odooApiErrorResponse,
  resolveOdooCompanyId,
} from '../../../../../lib/integrations/odoo/access'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireCompanyAccess(req, res)
    assertCanManageOdoo(auth)
    const companyId = resolveOdooCompanyId(
      auth,
      typeof req.query.company_id === 'string' ? req.query.company_id : null
    )
    const status =
      typeof req.query.status === 'string' && req.query.status
        ? req.query.status
        : 'dead'

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('odoo_outbox')
      .select('id, kind, job_key, status, attempts, last_error, created_at, updated_at, sent_at')
      .eq('company_id', companyId)
      .eq('status', status)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) {
      return res.status(500).json({ error: 'No se pudo leer el outbox' })
    }

    return res.status(200).json({ items: data ?? [] })
  } catch (err) {
    return odooApiErrorResponse(res, err)
  }
}

export default withGeneralRateLimit(['GET'])(handler)
