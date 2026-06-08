import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { generateEmployeeReceiptPDF } from '../../../lib/payroll/receipt'
import { buildVoucherFromRunLine } from '../../../lib/payroll/voucher-from-run-line'
import { buildVoucherPdfOptions } from '../../../lib/payroll/voucher-pdf-options'
import { resolveReportConfig } from '../../../lib/reports/column-resolver'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'POST'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId, role } = await requireCompanyAccess(req, res)

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID es requerido' })
    }

    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para generar voucher',
      })
    }

    const { run_line_id } = req.method === 'GET' ? req.query : req.body

    if (!run_line_id || typeof run_line_id !== 'string') {
      return res.status(400).json({ error: 'run_line_id es requerido' })
    }

    const voucherData = await buildVoucherFromRunLine(supabase, companyId, run_line_id)
    const resolvedConfig = await resolveReportConfig(companyId, 'voucher', supabase)
    const pdfOptions = buildVoucherPdfOptions(resolvedConfig)

    const pdf = await generateEmployeeReceiptPDF(
      voucherData.record,
      voucherData.periodo,
      voucherData.quincena,
      companyId,
      voucherData.companyName,
      voucherData.periodLabel,
      pdfOptions
    )

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=${voucherData.filename}`)
    return res.send(pdf)
  } catch (error: any) {
    console.error('❌ Error en receipt-voucher:', error)
    return res.status(500).json({
      error: error?.message || 'Internal error',
      message: 'Error interno del servidor',
    })
  }
}
