import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../../../lib/security/api-responses'
import { logger } from '../../../../../../lib/logger'
import {
  normalizeResearchImport,
  researchLocalBusinesses,
  researchProviderConfigured,
  type ResearchCandidate,
} from '../../../../../../lib/admin/prospection-research'
import { normalizeProspectEmail } from '../../../../../../lib/admin/prospection'
import { normalizeHnPhone } from '../../../../../../lib/admin/prospection-whatsapp'

async function upsertCandidate(adminClient: any, runId: string, c: ResearchCandidate) {
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

  if (email_normalized) {
    const { data: existing } = await adminClient
      .from('b2b_prospect_candidates')
      .select('id')
      .eq('run_id', runId)
      .eq('email_normalized', email_normalized)
      .maybeSingle()
    if (existing?.id) {
      return adminClient.from('b2b_prospect_candidates').update(row).eq('id', existing.id).select('*').maybeSingle()
    }
  } else {
    const { data: existing } = await adminClient
      .from('b2b_prospect_candidates')
      .select('id')
      .eq('run_id', runId)
      .is('email_normalized', null)
      .ilike('comercio', c.comercio)
      .maybeSingle()
    if (existing?.id) {
      return adminClient.from('b2b_prospect_candidates').update(row).eq('id', existing.id).select('*').maybeSingle()
    }
  }

  return adminClient.from('b2b_prospect_candidates').insert(row).select('*').maybeSingle()
}

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

    const { data: run, error: runError } = await adminClient
      .from('b2b_prospect_runs')
      .select('*')
      .eq('id', runId)
      .maybeSingle()

    if (runError) return res.status(500).json(createErrorResponse(runError.message, 'DB_ERROR'))
    if (!run) return res.status(404).json(createErrorResponse('Run not found', 'NOT_FOUND'))

    await adminClient
      .from('b2b_prospect_runs')
      .update({
        status: 'researching',
        research_status: 'running',
        research_error: null,
      })
      .eq('id', runId)

    let candidates: ResearchCandidate[] = []
    let provider = 'import'
    let queries: string[] = []

    try {
      const importRows = Array.isArray(req.body?.candidates) ? req.body.candidates : null
      if (importRows) {
        candidates = normalizeResearchImport(importRows)
        provider = 'import'
      } else if (researchProviderConfigured()) {
        const result = await researchLocalBusinesses({
          ciudad: run.ciudad,
          departamento: run.departamento,
          pais: run.pais,
          rubros: run.rubros || [],
        })
        candidates = result.candidates
        queries = result.queries
        provider = result.provider
      } else {
        await adminClient
          .from('b2b_prospect_runs')
          .update({
            status: 'draft',
            research_status: 'failed',
            research_error: 'SERPER_API_KEY no configurada',
          })
          .eq('id', runId)

        return res.status(503).json(
          createErrorResponse(
            'SERPER_API_KEY no configurada. Configúrala o envía candidates[] para importar hallazgos.',
            'PROVIDER_MISSING'
          )
        )
      }

      const saved = []
      for (const c of candidates) {
        const { data, error } = await upsertCandidate(adminClient, runId, c)
        if (!error && data) saved.push(data)
      }

      // Preselect alta/media
      const preselectIds = saved
        .filter((c: any) => c.confianza === 'alta' || c.confianza === 'media')
        .map((c: any) => c.id)
      if (preselectIds.length) {
        await adminClient
          .from('b2b_prospect_candidates')
          .update({ selected: true })
          .in('id', preselectIds)
      }

      await adminClient
        .from('b2b_prospect_runs')
        .update({
          status: 'reviewed',
          research_status: 'done',
          research_error: null,
          research_completed_at: new Date().toISOString(),
        })
        .eq('id', runId)

      await auditLog('b2b_prospection_research', {
        runId,
        provider,
        found: saved.length,
        queries: queries.length,
      })

      const { data: allCandidates } = await adminClient
        .from('b2b_prospect_candidates')
        .select('*')
        .eq('run_id', runId)
        .order('created_at', { ascending: true })

      return res.status(200).json(
        createSuccessResponse({
          provider,
          queries,
          candidates: allCandidates || saved,
          summary: { found: (allCandidates || saved).length, preselected: preselectIds.length },
        })
      )
    } catch (researchErr) {
      const message = researchErr instanceof Error ? researchErr.message : String(researchErr)
      await adminClient
        .from('b2b_prospect_runs')
        .update({
          status: 'draft',
          research_status: 'failed',
          research_error: message,
        })
        .eq('id', runId)
      logger.error('prospection research failed', { runId, error: message })
      return res.status(500).json(createErrorResponse(message, 'RESEARCH_ERROR'))
    }
  } catch (err) {
    if (res.headersSent) return
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json(createErrorResponse(message, 'INTERNAL_ERROR'))
  }
}
