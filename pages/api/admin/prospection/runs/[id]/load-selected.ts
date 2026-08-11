import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../../../lib/security/api-responses'
import { logger } from '../../../../../../lib/logger'
import { normalizeProspectEmail } from '../../../../../../lib/admin/prospection'
import { normalizeHnPhone } from '../../../../../../lib/admin/prospection-whatsapp'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  const runId = String(req.query.id || '')
  if (!runId) {
    return res.status(400).json(createErrorResponse('id is required', 'VALIDATION_ERROR'))
  }

  try {
    const { adminClient, user, auditLog } = await requireSuperAdminWithAudit(req, res)
    if (!user?.id) {
      return res.status(500).json(createErrorResponse('Authentication error', 'AUTH_ERROR'))
    }

    const candidateIds: string[] = Array.isArray(req.body?.candidateIds)
      ? req.body.candidateIds.map((id: unknown) => String(id))
      : []

    // Prefer explicit ids; else load selected=true
    let query = adminClient.from('b2b_prospect_candidates').select('*').eq('run_id', runId)
    if (candidateIds.length) {
      query = query.in('id', candidateIds)
    } else {
      query = query.eq('selected', true)
    }

    const { data: candidates, error } = await query
    if (error) return res.status(500).json(createErrorResponse(error.message, 'DB_ERROR'))
    if (!candidates?.length) {
      return res
        .status(400)
        .json(createErrorResponse('No hay candidatos seleccionados', 'VALIDATION_ERROR'))
    }

    const loaded = []
    const skipped = []

    for (const c of candidates) {
      const email_normalized = normalizeProspectEmail(c.email)
      const telefono = normalizeHnPhone(c.telefono) || c.telefono
      const row = {
        run_id: runId,
        comercio: c.comercio,
        rubro: c.rubro,
        telefono,
        email: c.email,
        email_normalized,
        direccion: c.direccion,
        confianza: c.confianza,
        fuentes: c.fuentes,
        notas: c.notas,
      }

      let contact = null
      if (email_normalized) {
        const { data: existing } = await adminClient
          .from('b2b_prospect_contacts')
          .select('id')
          .eq('run_id', runId)
          .eq('email_normalized', email_normalized)
          .maybeSingle()
        if (existing?.id) {
          const { data } = await adminClient
            .from('b2b_prospect_contacts')
            .update(row)
            .eq('id', existing.id)
            .select('*')
            .maybeSingle()
          contact = data
          skipped.push({ reason: 'deduped_email', comercio: c.comercio })
        }
      }

      if (!contact) {
        const { data: existingName } = await adminClient
          .from('b2b_prospect_contacts')
          .select('id')
          .eq('run_id', runId)
          .ilike('comercio', c.comercio)
          .maybeSingle()
        if (existingName?.id && !email_normalized) {
          const { data } = await adminClient
            .from('b2b_prospect_contacts')
            .update(row)
            .eq('id', existingName.id)
            .select('*')
            .maybeSingle()
          contact = data
          skipped.push({ reason: 'deduped_comercio', comercio: c.comercio })
        }
      }

      if (!contact) {
        const { data, error: insErr } = await adminClient
          .from('b2b_prospect_contacts')
          .insert(row)
          .select('*')
          .maybeSingle()
        if (insErr) {
          logger.warn('load-selected insert failed', { error: insErr.message, comercio: c.comercio })
          continue
        }
        contact = data
      }

      if (contact) {
        loaded.push(contact)
        await adminClient
          .from('b2b_prospect_candidates')
          .update({ selected: true, loaded_at: new Date().toISOString() })
          .eq('id', c.id)
      }
    }

    await adminClient.from('b2b_prospect_runs').update({ status: 'ready' }).eq('id', runId)

    await auditLog('b2b_prospection_load_selected', {
      runId,
      loaded: loaded.length,
      requested: candidates.length,
    })

    return res.status(200).json(
      createSuccessResponse({
        contacts: loaded,
        summary: { loaded: loaded.length, requested: candidates.length, dedupeNotes: skipped.length },
      })
    )
  } catch (err) {
    if (res.headersSent) return
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json(createErrorResponse(message, 'INTERNAL_ERROR'))
  }
}
