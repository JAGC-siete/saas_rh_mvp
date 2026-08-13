import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { canDownloadPayrollPlanillaPdf, PAYROLL_PLANILLA_PDF_FORBIDDEN } from '../../../lib/security/permissions'
import { loadPlanillaFromRun } from '../../../lib/payroll/planilla-from-run'
import { buildPlanillaPreviewPayload } from '../../../lib/payroll/planilla-preview'
import { createSuccessResponse, createErrorResponse } from '../../../lib/security/api-responses'
import {
  PAYROLL_NEEDS_REGENERATE_CODE,
  PayrollNeedsRegenerateError,
} from '../../../lib/payroll/resolve-effective-pay-type'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(createErrorResponse('Method not allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    const { supabase, companyId, role } = await requireCompanyAccess(req, res)

    if (!companyId) {
      return res.status(400).json(createErrorResponse('Company ID es requerido', 'VALIDATION_ERROR'))
    }

    if (!canDownloadPayrollPlanillaPdf(role)) {
      return res.status(PAYROLL_PLANILLA_PDF_FORBIDDEN.status).json(
        createErrorResponse(PAYROLL_PLANILLA_PDF_FORBIDDEN.body.message, 'FORBIDDEN')
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
    if (error instanceof PayrollNeedsRegenerateError) {
      return res.status(409).json(
        createErrorResponse(error.message, PAYROLL_NEEDS_REGENERATE_CODE)
      )
    }
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    console.error('❌ Error en planilla-preview:', error)
    return res.status(500).json(createErrorResponse(message, 'INTERNAL_ERROR'))
  }
}
