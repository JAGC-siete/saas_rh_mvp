import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { buildVoucherFromRunLine } from '../../../lib/payroll/voucher-from-run-line'
import { resolveCanonicalVoucherRunLineId } from '../../../lib/payroll/resolve-voucher-run-line'
import { buildVoucherPdfOptions } from '../../../lib/payroll/voucher-pdf-options'
import { buildVoucherPreviewPayload } from '../../../lib/payroll/voucher-preview'
import { resolveReportConfig } from '../../../lib/reports/column-resolver'
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
        createErrorResponse('No tiene permisos para ver comprobantes', 'FORBIDDEN')
      )
    }

    const runLineId = typeof req.query.run_line_id === 'string' ? req.query.run_line_id.trim() : ''
    if (!runLineId) {
      return res.status(400).json(createErrorResponse('run_line_id es requerido', 'VALIDATION_ERROR'))
    }

    const canonicalRunLineId = await resolveCanonicalVoucherRunLineId(supabase, companyId, runLineId)
    const voucherData = await buildVoucherFromRunLine(supabase, companyId, canonicalRunLineId)
    const resolvedConfig = await resolveReportConfig(companyId, 'voucher', supabase)
    const pdfOptions = buildVoucherPdfOptions(resolvedConfig)
    const preview = buildVoucherPreviewPayload(canonicalRunLineId, voucherData, pdfOptions)

    return res.status(200).json(createSuccessResponse({ preview }))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    console.error('❌ Error en voucher-preview:', error)
    return res.status(500).json(createErrorResponse(message, 'INTERNAL_ERROR'))
  }
}
