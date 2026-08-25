import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { withGeneralRateLimit } from '../../../../lib/security/rate-limiting'
import { createAdminClient } from '../../../../lib/supabase/server'
import {
  assertCanManageOdoo,
  odooApiErrorResponse,
  resolveOdooCompanyId,
} from '../../../../lib/integrations/odoo/access'
import { buildPayrollMovePayloads } from '../../../../lib/integrations/odoo/journal-payload'
import { enqueueOdooOutbox } from '../../../../lib/integrations/odoo/outbox'
import { processOdooOutboxRow } from '../../../../lib/integrations/odoo/process-outbox'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireCompanyAccess(req, res)
    assertCanManageOdoo(auth)
    const body = req.body || {}
    const companyId = resolveOdooCompanyId(auth, body.company_id)
    const runId = typeof body.run_id === 'string' ? body.run_id : ''
    if (!runId) {
      return res.status(400).json({ error: 'run_id es requerido' })
    }

    const supabase = createAdminClient()
    const { data: run } = await supabase
      .from('payroll_runs')
      .select('id, company_id, status')
      .eq('id', runId)
      .maybeSingle()

    if (!run || run.company_id !== companyId) {
      return res.status(404).json({ error: 'Corrida de nómina no encontrada' })
    }
    if (run.status !== 'authorized' && run.status !== 'distributed') {
      return res.status(400).json({
        error: 'La planilla debe estar autorizada para enviar asientos a Odoo',
      })
    }

    const payloads = await buildPayrollMovePayloads(companyId, runId)
    const results: Array<{ job_key: string; outbox_id: string | null; status: string }> = []

    for (const item of payloads) {
      const outboxId = await enqueueOdooOutbox({
        companyId,
        kind: 'journal_entry',
        jobKey: item.jobKey,
        payload: item.payload,
      })
      let status = 'queued'
      if (outboxId) {
        status = await processOdooOutboxRow(outboxId)
      }
      results.push({ job_key: item.jobKey, outbox_id: outboxId, status })
    }

    return res.status(200).json({
      success: true,
      count: results.length,
      results,
    })
  } catch (err) {
    return odooApiErrorResponse(res, err)
  }
}

export default withGeneralRateLimit(['POST'])(handler)
