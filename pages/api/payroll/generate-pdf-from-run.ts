import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { canExportReports, EXPORT_REPORTS_FORBIDDEN } from '../../../lib/security/permissions'
import { generateConsolidatedPayrollPDF } from '../../../lib/payroll/report'
import {
  parsePayrollPdfGroupByQuery,
  payrollPdfGroupByFilenameSuffix,
  type PayrollPdfGroupBy,
} from '../../../lib/payroll/pdf-layout'
import { withPayrollRateLimit } from '../../../lib/security/rate-limiting'
import { loadPlanillaFromRun } from '../../../lib/payroll/planilla-from-run'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { run_id, group_by } = req.query

  if (!run_id || typeof run_id !== 'string') {
    return res.status(400).json({ error: 'run_id es requerido' })
  }

  try {
    const { supabase, companyId, role, user, userProfile } = await requireCompanyAccess(req, res)

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID es requerido' })
    }

    if (!canExportReports(role, userProfile)) {
      return res.status(EXPORT_REPORTS_FORBIDDEN.status).json(EXPORT_REPORTS_FORBIDDEN.body)
    }

    const groupByQuery = parsePayrollPdfGroupByQuery(group_by)
    const groupByOverride: PayrollPdfGroupBy | null =
      group_by !== undefined && group_by !== '' && group_by != null ? groupByQuery : null

    const loaded = await loadPlanillaFromRun(supabase, companyId, run_id, groupByOverride)
    const pdfGroupBy = loaded.defaultPdfGroupBy

    const pdf = await generateConsolidatedPayrollPDF(
      loaded.planillaFixed,
      loaded.planillaHourly,
      loaded.periodo,
      loaded.payrollRun.quincena,
      user?.email,
      loaded.companyName,
      loaded.pdfCustomFieldsConfig as Record<string, unknown> | undefined,
      loaded.pdfPayrollConfig,
      loaded.periodDates,
      undefined,
      {
        groupBy: pdfGroupBy,
        watermarkText: loaded.isDraftPreview ? 'VISTA PREVIA — NO AUTORIZADA' : undefined,
      }
    )

    const groupSuffix = payrollPdfGroupByFilenameSuffix(pdfGroupBy)
    const draftSuffix = loaded.isDraftPreview ? '_borrador' : ''
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=planilla_${loaded.periodo}_q${loaded.payrollRun.quincena}${groupSuffix}${draftSuffix}.pdf`
    )
    return res.send(pdf)
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('Error generando PDF desde run:', {
      run_id,
      message: err.message,
      stack: err.stack,
    })
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: err.message || 'Error desconocido',
    })
  }
}

/** Mismo bucket que preview/edit: la planilla PDF es parte del flujo habitual, no export masivo. */
export default withPayrollRateLimit(['GET'])(handler)
