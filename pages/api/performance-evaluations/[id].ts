import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'
import { withGeneralRateLimit } from '../../../lib/security/rate-limiting'
import {
  assertPerfPayloadSize,
  updatePerformanceEvaluationSchema,
  type PerformanceEvaluationRow,
} from '../../../lib/performance/schema'
import { computeOverallScore } from '../../../lib/performance/score'
import { parsePerformanceSettings } from '../../../lib/performance/settings'

const idSchema = z.string().uuid()

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await requireCompanyAccess(req, res)
    const id = idSchema.parse(req.query.id)

    const requestedCompanyId = typeof req.query.company_id === 'string' ? req.query.company_id : null
    const effectiveCompanyId = auth.companyId ?? requestedCompanyId
    if (!effectiveCompanyId) return res.status(400).json({ error: 'Company ID is required' })

    if (auth.role !== 'super_admin' && auth.companyId !== effectiveCompanyId) {
      return res.status(403).json({ error: 'No tiene permiso para esta empresa' })
    }

    const supabase = createAdminClient()

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('performance_evaluations')
        .select('*')
        .eq('id', id)
        .eq('company_id', effectiveCompanyId)
        .maybeSingle()
      if (error) throw error
      if (!data) return res.status(404).json({ error: 'Evaluación no encontrada' })
      return res.status(200).json({ evaluation: data as PerformanceEvaluationRow })
    }

    if (req.method === 'PATCH') {
      assertPerfPayloadSize(req.body)
      const input = updatePerformanceEvaluationSchema.parse({ ...req.body, id })

      const { data: existing, error: exErr } = await supabase
        .from('performance_evaluations')
        .select('*')
        .eq('id', id)
        .eq('company_id', effectiveCompanyId)
        .maybeSingle()
      if (exErr) throw exErr
      if (!existing) return res.status(404).json({ error: 'Evaluación no encontrada' })

      const currentStatus = String((existing as any).status || 'draft')
      const requestedStatus = input.status

      // Freeze edits once completed. Allow only archiving (status -> archived).
      if (currentStatus === 'completed') {
        if (requestedStatus === 'archived') {
          const { data, error } = await supabase
            .from('performance_evaluations')
            .update({
              status: 'archived',
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('company_id', effectiveCompanyId)
            .select('*')
            .single()
          if (error) throw error
          return res.status(200).json({ evaluation: data as PerformanceEvaluationRow })
        }
        return res.status(409).json({
          error: 'La evaluación está completada y no puede modificarse.',
        })
      }

      // Load company-level performance settings from company_metadata.employees_metadata
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

      const update: Record<string, unknown> = {}
      if (input.status !== undefined) update.status = input.status
      if (input.items !== undefined) update.items = input.items

      const items = (input.items ?? (existing as any).items ?? []) as any[]

      // Business rules on completion (server-side)
      if (requestedStatus === 'completed') {
        if (settings.performance_require_all_rated_to_complete) {
          const missing = items.filter((it: any) => !it?.rating)
          if (missing.length > 0) {
            return res.status(400).json({ error: 'No se puede finalizar: hay criterios sin calificación.' })
          }
        }
        if (settings.performance_require_comment_on_no_cumple) {
          const bad = items.filter((it: any) => it?.rating === 'no_cumple' && !String(it?.comment || '').trim())
          if (bad.length > 0) {
            return res.status(400).json({
              error: 'No se puede finalizar: se requiere comentario cuando la calificación es “No cumple”.',
            })
          }
        }
      }

      const overall_score = computeOverallScore(items, {
        superaMultiplier: settings.performance_supera_multiplier,
      })
      update.overall_score = overall_score
      update.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('performance_evaluations')
        .update(update)
        .eq('id', id)
        .eq('company_id', effectiveCompanyId)
        .select('*')
        .single()
      if (error) throw error
      return res.status(200).json({ evaluation: data as PerformanceEvaluationRow })
    }

    res.setHeader('Allow', ['GET', 'PATCH'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.issues.map((i) => i.message) })
    }
    if (error?.message === 'PAYLOAD_TOO_LARGE') return res.status(413).json({ error: 'Payload demasiado grande' })
    if (['UNAUTHORIZED', 'PROFILE_REQUIRED', 'COMPANY_ACCESS_REQUIRED'].includes(error?.message)) return
    console.error('performance-evaluations/[id] error:', error)
    return res.status(500).json({ error: error?.message || 'Internal server error' })
  }
}

export default withGeneralRateLimit(['GET', 'PATCH'])(handler)

