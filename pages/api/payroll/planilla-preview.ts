import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { loadPlanillaFromRun } from '../../../lib/payroll/planilla-from-run'
import { buildPlanillaPreviewPayload } from '../../../lib/payroll/planilla-preview'
import { createSuccessResponse, createErrorResponse } from '../../../lib/security/api-responses'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(createErrorResponse('Method not allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    const { supabase, companyId, role } = await requireCompanyAccess(req, res)

    if (!companyId) {
      return res.status(400).json(createErrorResponse('Company ID es requerido', 'VALIDATION_ERROR'))
    }

    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json(
        createErrorResponse('No tiene permisos para ver la planilla', 'FORBIDDEN')
      )
    }

    const runId = typeof req.query.run_id === 'string' ? req.query.run_id.trim() : ''
    if (!runId) {
      return res.status(400).json(createErrorResponse('run_id es requerido', 'VALIDATION_ERROR'))
    }

    const loaded = await loadPlanillaFromRun(supabase, companyId, runId)
    const preview = buildPlanillaPreviewPayload(loaded)

    return res.status(200).json(createSuccessResponse({ preview }))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    console.error('❌ Error en planilla-preview:', error)
    return res.status(500).json(createErrorResponse(message, 'INTERNAL_ERROR'))
  }
}
