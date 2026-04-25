import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'
import { withGeneralRateLimit } from '../../../lib/security/rate-limiting'
import {
  assertPerfPayloadSize,
  createPerformanceEvaluationSchema,
  type PerformanceEvaluationRow,
} from '../../../lib/performance/schema'
import { computeOverallScore } from '../../../lib/performance/score'
import { parsePerformanceSettings } from '../../../lib/performance/settings'

const listQuerySchema = z.object({
  employee_id: z.string().uuid().optional(),
  status: z.string().optional(),
  cycle_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cycle_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  company_id: z.string().uuid().optional(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await requireCompanyAccess(req, res)
    const requestedCompanyId = typeof req.query.company_id === 'string' ? req.query.company_id : null
    const effectiveCompanyId = auth.companyId ?? requestedCompanyId

    if (!effectiveCompanyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    if (auth.role !== 'super_admin' && auth.companyId !== effectiveCompanyId) {
      return res.status(403).json({ error: 'No tiene permiso para esta empresa' })
    }

    const supabase = createAdminClient()

    if (req.method === 'GET') {
      const q = listQuerySchema.parse(req.query)
      let query = supabase
        .from('performance_evaluations')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .order('updated_at', { ascending: false })

      if (q.employee_id) query = query.eq('employee_id', q.employee_id)
      if (q.status) query = query.eq('status', q.status)
      if (q.cycle_start) query = query.gte('cycle_start', q.cycle_start)
      if (q.cycle_end) query = query.lte('cycle_end', q.cycle_end)

      const { data, error } = await query
      if (error) throw error
      return res.status(200).json({ evaluations: (data ?? []) as PerformanceEvaluationRow[] })
    }

    if (req.method === 'POST') {
      assertPerfPayloadSize(req.body)
      const input = createPerformanceEvaluationSchema.parse(req.body)

      // Company settings (score scale)
      let settings = parsePerformanceSettings({})
      try {
        const { data: meta } = await supabase
          .from('company_metadata')
          .select('employees_metadata')
          .eq('company_id', effectiveCompanyId)
          .maybeSingle()
        settings = parsePerformanceSettings(meta?.employees_metadata)
      } catch {
        settings = parsePerformanceSettings({})
      }

      // Load MTP rows if mtp_draft_id provided
      let items = input.items
      let mtpDraftId = input.mtp_draft_id ?? null
      if (mtpDraftId) {
        const { data: mtp, error: mtpError } = await supabase
          .from('mtp_job_description_drafts')
          .select('id, items')
          .eq('id', mtpDraftId)
          .eq('company_id', effectiveCompanyId)
          .maybeSingle()
        if (mtpError) throw mtpError
        if (mtp?.items && Array.isArray(mtp.items)) {
          items = (mtp.items as any[]).slice(0, 50).map((row: any) => ({
            id:
              row.id ||
              (globalThis.crypto && 'randomUUID' in globalThis.crypto ? globalThis.crypto.randomUUID() : String(Date.now())),
            function: String(row.finalFunction || '').trim(),
            indicator: String(row.indicator || '').trim(),
            weight: 0,
            rating: undefined,
            comment: '',
          }))
        }
      }

      const overall_score = computeOverallScore(items, {
        superaMultiplier: settings.performance_supera_multiplier,
      })

      const { data, error } = await supabase
        .from('performance_evaluations')
        .insert({
          company_id: effectiveCompanyId,
          employee_id: input.employee_id,
          mtp_draft_id: mtpDraftId,
          cycle_start: input.cycle_start,
          cycle_end: input.cycle_end,
          status: input.status,
          items,
          overall_score,
          created_by: auth.user.id,
        })
        .select('*')
        .single()

      if (error) throw error
      return res.status(201).json({ evaluation: data as PerformanceEvaluationRow })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: error.issues.map((i) => i.message),
      })
    }
    if (error?.message === 'PAYLOAD_TOO_LARGE') {
      return res.status(413).json({ error: 'Payload demasiado grande' })
    }
    if (['UNAUTHORIZED', 'PROFILE_REQUIRED', 'COMPANY_ACCESS_REQUIRED'].includes(error?.message)) return
    console.error('performance-evaluations API error:', error)
    return res.status(500).json({ error: error?.message || 'Internal server error' })
  }
}

export default withGeneralRateLimit(['GET', 'POST'])(handler)

