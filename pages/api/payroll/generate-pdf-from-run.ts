import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import {
  canDownloadPayrollPlanillaPdf,
  PAYROLL_PLANILLA_PDF_FORBIDDEN,
} from '../../../lib/security/permissions'
import { generateConsolidatedPayrollPDF } from '../../../lib/payroll/report'
import {
  parsePayrollPdfGroupByQuery,
  payrollPdfGroupByFilenameSuffix,
  type PayrollPdfGroupBy,
} from '../../../lib/payroll/pdf-layout'
import { withPayrollRateLimit } from '../../../lib/security/rate-limiting'
import { loadPlanillaFromRun } from '../../../lib/payroll/planilla-from-run'
import { resolveReportConfig } from '../../../lib/reports/column-resolver'
import {
  PAYROLL_NEEDS_REGENERATE_CODE,
  PayrollNeedsRegenerateError,
} from '../../../lib/payroll/resolve-effective-pay-type'

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { run_id, group_by } = req.query

  if (!run_id || typeof run_id !== 'string') {
    return res.status(400).json({ error: 'run_id es requerido', message: 'run_id es requerido' })
  }

  try {
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID es requerido', message: 'Company ID es requerido' })
    }

    if (!canDownloadPayrollPlanillaPdf(role)) {
      return res.status(PAYROLL_PLANILLA_PDF_FORBIDDEN.status).json(PAYROLL_PLANILLA_PDF_FORBIDDEN.body)
    }

    const groupByQuery = parsePayrollPdfGroupByQuery(group_by)
    const groupByOverride: PayrollPdfGroupBy | null =
      group_by !== undefined && group_by !== '' && group_by != null ? groupByQuery : null

    const loaded = await loadPlanillaFromRun(supabase, companyId, run_id, groupByOverride)
    const pdfGroupBy = loaded.defaultPdfGroupBy

    let reportVisual: { primaryColor?: string; branding?: Record<string, unknown> } | undefined
    let visibleColumnIds: string[] | undefined
    let columnLabels: Record<string, string> | undefined
    let columnOrder: Record<string, number> | undefined
    let includeCustomPayrollFields: boolean | undefined
    try {
      const resolvedConfig = await resolveReportConfig(companyId, 'payroll', supabase)
      if (resolvedConfig?.branding) {
        reportVisual = {
          primaryColor: resolvedConfig.branding.primaryColor,
          branding: resolvedConfig.branding,
        }
      }
      if (resolvedConfig?.columns?.length) {
        visibleColumnIds = resolvedConfig.columns.map((c) => c.id)
        columnLabels = Object.fromEntries(resolvedConfig.columns.map((c) => [c.id, c.label]))
        columnOrder = Object.fromEntries(
          resolvedConfig.columns.map((c, i) => [c.id, c.order ?? i])
        )
      }
      includeCustomPayrollFields = resolvedConfig?.includeCustomPayrollFields
    } catch (configErr) {
      console.warn('generate-pdf-from-run: report config skipped', configErr)
    }

    const pdf = await generateConsolidatedPayrollPDF(
      loaded.planillaFixed,
      loaded.planillaHourly,
      loaded.periodo,
      loaded.payrollRun.quincena,
      user?.email,
      loaded.companyName,
      loaded.pdfCustomFieldsConfig,
      loaded.pdfPayrollConfig,
      loaded.periodDates,
      reportVisual,
      {
        groupBy: pdfGroupBy,
        watermarkText: loaded.isDraftPreview ? 'VISTA PREVIA - NO AUTORIZADA' : undefined,
        visibleColumnIds,
        columnLabels,
        columnOrder,
        includeCustomPayrollFields,
      }
    )

    if (!pdf?.length) {
      return res.status(500).json({
        error: 'Error generando PDF',
        message: 'El PDF generado está vacío',
      })
    }

    const groupSuffix = payrollPdfGroupByFilenameSuffix(pdfGroupBy)
    const draftSuffix = loaded.isDraftPreview ? '_borrador' : ''
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=planilla_${loaded.periodo}_q${loaded.payrollRun.quincena}${groupSuffix}${draftSuffix}.pdf`
    )
    return res.send(pdf)
  } catch (error: unknown) {
    if (error instanceof PayrollNeedsRegenerateError) {
      return res.status(409).json({
        error: error.message,
        message: error.message,
        code: PAYROLL_NEEDS_REGENERATE_CODE,
      })
    }
    const message = toErrorMessage(error, 'Error generando PDF de planilla')
    console.error('Error generando PDF desde run:', {
      run_id,
      message,
      error,
    })
    return res.status(500).json({
      error: 'Error interno del servidor',
      message,
    })
  }
}

/** Mismo bucket que preview/edit: la planilla PDF es parte del flujo habitual, no export masivo. */
export default withPayrollRateLimit(['GET'])(handler)
