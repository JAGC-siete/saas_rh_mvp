import type { NextApiRequest, NextApiResponse } from 'next'
import { requireUser } from '../../../../lib/auth/requireUser'
import { generateEmployeeReceiptPDF } from '../../../../lib/payroll/receipt'
import { buildVoucherPdfOptions, withCompanyMoneyOptions } from '../../../../lib/payroll/voucher-pdf-options'
import { resolveReportConfig } from '../../../../lib/reports/column-resolver'
import { buildVoucherFromRunLine } from '../../../../lib/payroll/voucher-from-run-line'
import { resolveCanonicalVoucherRunLineId } from '../../../../lib/payroll/resolve-voucher-run-line'
import { assertEmployeePortalEnabled } from '../../../../lib/employee-portal/company-settings'
import {
  findReleasedPortalRunLineId,
  loadOwnedReleasedRunLineId,
} from '../../../../lib/employee-portal/released-payroll'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, userProfile } = await requireUser(req, res)

    if (!userProfile?.employee_id || !userProfile.company_id) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Solo los empleados pueden acceder a esta funcionalidad',
      })
    }

    if (!(await assertEmployeePortalEnabled(supabase, userProfile.company_id, res))) {
      return
    }

    const employeeId = userProfile.employee_id
    const companyId = userProfile.company_id
    const body = req.body || {}
    const runLineIdRaw = typeof body.runLineId === 'string' ? body.runLineId.trim() : ''
    const periodo = typeof body.periodo === 'string' ? body.periodo : ''
    const quincena = Number(body.quincena)

    let ownedLineId: string | null = null

    if (runLineIdRaw) {
      ownedLineId = await loadOwnedReleasedRunLineId(supabase, {
        companyId,
        employeeId,
        runLineId: runLineIdRaw,
      })
      if (!ownedLineId) {
        return res.status(404).json({
          error: 'Registro no encontrado',
          message: 'No se encontró un recibo liberado para esta línea',
        })
      }
    } else {
      if (!periodo || !/^[0-9]{4}-[0-9]{2}$/.test(periodo)) {
        return res.status(400).json({ error: 'Periodo inválido (YYYY-MM)' })
      }
      if (![1, 2].includes(quincena)) {
        return res.status(400).json({ error: 'Quincena inválida (1 o 2)' })
      }
      const [year, month] = periodo.split('-').map(Number)
      ownedLineId = await findReleasedPortalRunLineId(supabase, {
        companyId,
        employeeId,
        year,
        month,
        quincena,
      })
      if (!ownedLineId) {
        return res.status(404).json({
          error: 'Registro no encontrado',
          message: 'No se encontró información de nómina liberada para el período especificado',
        })
      }
    }

    const canonicalRunLineId = await resolveCanonicalVoucherRunLineId(
      supabase,
      companyId,
      ownedLineId
    )
    // Re-validate ownership after canonical resolve (CON vs 2PAGOS swap)
    const stillOwned = await loadOwnedReleasedRunLineId(supabase, {
      companyId,
      employeeId,
      runLineId: canonicalRunLineId,
    })
    if (!stillOwned) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tiene permisos para este recibo',
      })
    }

    const voucherData = await buildVoucherFromRunLine(supabase, companyId, stillOwned)
    const resolvedConfig = await resolveReportConfig(companyId, 'voucher', supabase)
    const { data: company } = await supabase
      .from('companies')
      .select('name, country_code')
      .eq('id', companyId)
      .maybeSingle()
    const pdfOptions = withCompanyMoneyOptions(
      buildVoucherPdfOptions(resolvedConfig),
      company?.country_code
    )

    const pdf = await generateEmployeeReceiptPDF(
      voucherData.record,
      voucherData.periodo,
      voucherData.quincena,
      companyId,
      voucherData.companyName || company?.name,
      voucherData.periodLabel,
      pdfOptions
    )

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=${voucherData.filename}`)
    return res.send(pdf)
  } catch (error: any) {
    console.error('Error generando PDF de nómina para empleado:', error)

    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'No autorizado' })
    }

    if (error.message === 'PROFILE_REQUIRED') {
      return res.status(403).json({ error: 'Perfil de empleado requerido' })
    }

    if (error?.message === 'Línea de nómina no encontrada') {
      return res.status(404).json({ error: 'Registro no encontrado' })
    }

    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message || 'Error desconocido',
    })
  }
}
