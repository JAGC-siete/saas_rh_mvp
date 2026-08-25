import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../../../lib/auth/api-auth-fixed'
import { withGeneralRateLimit } from '../../../../../../lib/security/rate-limiting'
import { createAdminClient } from '../../../../../../lib/supabase/server'
import {
  assertCanManageOdoo,
  odooApiErrorResponse,
  resolveOdooCompanyId,
} from '../../../../../../lib/integrations/odoo/access'
import { addOdooSyncJob } from '../../../../../../lib/queues/odooSyncQueue'
import { processOdooOutboxRow } from '../../../../../../lib/integrations/odoo/process-outbox'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireCompanyAccess(req, res)
    assertCanManageOdoo(auth)
    const companyId = resolveOdooCompanyId(auth, req.body?.company_id)
    const id = typeof req.query.id === 'string' ? req.query.id : ''
    if (!id) {
      return res.status(400).json({ error: 'id es requerido' })
    }

    const supabase = createAdminClient()
    const { data: row } = await supabase
      .from('odoo_outbox')
      .select('id, company_id, status, payload, kind, job_key')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (!row) {
      return res.status(404).json({ error: 'Outbox no encontrado' })
    }

    if (row.status === 'sent') {
      const { data: inserted, error } = await supabase
        .from('odoo_outbox')
        .insert({
          company_id: companyId,
          kind: row.kind,
          job_key: row.job_key,
          payload: row.payload,
          status: 'pending',
        })
        .select('id')
        .single()
      if (error || !inserted) {
        return res.status(409).json({ error: 'Ya hay un job pendiente para esta clave' })
      }
      addOdooSyncJob(inserted.id)
      const status = await processOdooOutboxRow(inserted.id)
      return res.status(200).json({ success: true, outbox_id: inserted.id, status })
    }

    await supabase
      .from('odoo_outbox')
      .update({
        status: 'pending',
        attempts: 0,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    addOdooSyncJob(row.id)
    const status = await processOdooOutboxRow(row.id)
    return res.status(200).json({ success: true, outbox_id: row.id, status })
  } catch (err) {
    return odooApiErrorResponse(res, err)
  }
}

export default withGeneralRateLimit(['POST'])(handler)
