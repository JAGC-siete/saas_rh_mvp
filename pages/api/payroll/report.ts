import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { generateConsolidatedPayrollPDF, type PlanillaItem } from '../../../lib/payroll/report'
import { calculatePayroll } from '../../../lib/payroll-client-specific'
import {
  buildCustomDeductionsList,
  formatCustomDeductionsNotes,
} from '../../../lib/payroll/custom-deductions-list'
import { resolveReportConfig } from '../../../lib/reports/column-resolver'
import {
  isExactHourlyPlanillaTablePayType,
  isMutablePayrollRunStatus,
  linePayTypeDriftedFromEmployee,
  parseCompanyCalculationMode,
  PAYROLL_NEEDS_REGENERATE_CODE,
  PayrollNeedsRegenerateError,
  resolvePlanillaRowPayType,
} from '../../../lib/payroll/resolve-effective-pay-type'
import { resolvePlanillaDaysWorked } from '../../../lib/payroll/planilla-from-run'
import { resolveDisplayNet } from '../../../lib/payroll/resolve-display-net'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['POST', 'GET'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)

    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para generar reporte de nómina',
      })
    }
    const { periodo, quincena } = req.method === 'GET' ? (req.query as any) : req.body || {}

    if (!periodo || !/^[0-9]{4}-[0-9]{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (YYYY-MM)' })
    }
    if (![1, 2].includes(Number(quincena))) {
      return res.status(400).json({ error: 'Quincena inválida (1 o 2)' })
    }

    const [year, month] = periodo.split('-').map(Number)

    const { data: payrollRun, error: runError } = await supabase
      .from('payroll_runs')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('year', year)
      .eq('month', month)
      .eq('quincena', Number(quincena))
      .single()

    if (runError || !payrollRun) {
      return res.status(404).json({ error: 'No hay corrida de nómina para el período indicado' })
    }

    const { data: payrollConfigRow } = await supabase
      .from('company_payroll_configs')
      .select('custom_fields, metadata, calculation_mode')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle()

    const payrollMeta = (payrollConfigRow?.metadata as Record<string, unknown>) || {}
    const companyCalculationMode = parseCompanyCalculationMode(
      (payrollConfigRow as { calculation_mode?: unknown } | null)?.calculation_mode ??
        payrollMeta.calculation_mode
    )

    const { data: payrollLines, error: linesError } = await supabase
      .from('payroll_run_lines')
      .select(`
        *,
        employees!payroll_run_lines_employee_id_fkey(
          name,
          dni,
          employee_code,
          base_salary,
          bank_name,
          bank_account,
          pay_type,
          departments!employees_department_id_fkey(name)
        )
      `)
      .eq('run_id', payrollRun.id)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (linesError) {
      return res.status(500).json({ error: 'Error obteniendo líneas de nómina' })
    }

    if (!payrollLines || payrollLines.length === 0) {
      return res.status(404).json({ error: 'No hay líneas de nómina para el período indicado' })
    }

    if (isMutablePayrollRunStatus(payrollRun.status)) {
      for (const line of payrollLines) {
        if (
          linePayTypeDriftedFromEmployee({
            employeePayType: line.employees?.pay_type,
            metadataPayType: line.metadata?.pay_type,
            companyCalculationMode,
          })
        ) {
          throw new PayrollNeedsRegenerateError()
        }
      }
    }

    const planillaAll: PlanillaItem[] = await Promise.all(
      payrollLines.map(async (line: any) => {
        let customDeductions = 0
        let deductionsNotes = ''

        if (line.metadata && companyId) {
          const effBruto = Number(line.eff_bruto) || 0
          const calcResult = await calculatePayroll(
            companyId,
            effBruto,
            line.metadata,
            supabase
          )

          customDeductions = calcResult.totalDeduccionesAdicionales
          const deductionItems = await buildCustomDeductionsList(
            companyId,
            line.metadata,
            effBruto,
            supabase
          )
          if (deductionItems.length > 0) {
            deductionsNotes = formatCustomDeductionsNotes(deductionItems)
          }
        }

        const statutoryDeductions =
          (Number(line.eff_ihss) || 0) + (Number(line.eff_rap) || 0) + (Number(line.eff_isr) || 0)
        const totalDeductions = statutoryDeductions + customDeductions
        const displayNet = resolveDisplayNet({
          bruto: Number(line.eff_bruto) || 0,
          totalDeductions,
          customDeductions,
          storedNeto: Number(line.eff_neto) || 0,
        })

        const payType = resolvePlanillaRowPayType({
          employeePayType: line.employees?.pay_type,
          metadataPayType: line.metadata?.pay_type,
          companyCalculationMode,
        })
        const totalHours = Number(line.eff_hours) || 0
        const showHourCols = isExactHourlyPlanillaTablePayType(payType)
        const hourlyRate =
          showHourCols && totalHours > 0 ? (Number(line.eff_bruto) || 0) / totalHours : 0

        return {
          id: line.employees?.employee_code || '',
          name: line.employees?.name || '',
          bank: line.employees?.bank_name || 'No especificado',
          bank_account: line.employees?.bank_account || 'No especificado',
          department: line.employees?.departments?.name || 'Sin Departamento',
          monthly_salary: Number(line.employees?.base_salary) || 0,
          days_worked: resolvePlanillaDaysWorked(
            payType,
            totalHours,
            line.metadata?.days_worked
          ),
          days_absent: 0,
          late_days: 0,
          total_earnings: Number(line.eff_bruto) || 0,
          IHSS: Number(line.eff_ihss) || 0,
          RAP: Number(line.eff_rap) || 0,
          ISR: Number(line.eff_isr) || 0,
          total_deductions: totalDeductions,
          total: displayNet,
          notes_on_ingress: line.edited ? 'Editado' : '',
          notes_on_deductions: deductionsNotes,
          metadata: line.metadata || {},
          pay_type: payType,
          total_hours_worked: showHourCols ? totalHours : undefined,
          hourly_rate: showHourCols ? hourlyRate : undefined,
          ...(Number.isFinite(Number(line.metadata?.horas_extras)) &&
          Number(line.metadata?.horas_extras) > 0
            ? { horas_extras: Math.round(Number(line.metadata.horas_extras) * 100) / 100 }
            : {}),
          ...(Number.isFinite(Number(line.metadata?.overtime_pay)) &&
          Number(line.metadata?.overtime_pay) > 0
            ? { overtime_pay: Math.round(Number(line.metadata.overtime_pay) * 100) / 100 }
            : {}),
        }
      })
    )

    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    let pdfCustomFieldsConfig: Record<string, any> | undefined
    let pdfPayrollConfig:
      | { legal_deductions: { ihss?: boolean; rap?: boolean; isr?: boolean } }
      | undefined
    if (companyId) {
      if (payrollConfigRow?.custom_fields) {
        pdfCustomFieldsConfig = payrollConfigRow.custom_fields as Record<string, any>
      }
      pdfPayrollConfig = {
        legal_deductions: (payrollMeta.legal_deductions as {
          ihss?: boolean
          rap?: boolean
          isr?: boolean
        }) || { ihss: true, rap: true, isr: true },
      }
    }

    const planillaFixed = planillaAll.filter(
      (p) => !isExactHourlyPlanillaTablePayType((p as any).pay_type)
    )
    const planillaHourly = planillaAll.filter((p) =>
      isExactHourlyPlanillaTablePayType((p as any).pay_type)
    )

    let reportVisual: { primaryColor?: string; branding?: Record<string, unknown> } | undefined
    let visibleColumnIds: string[] | undefined
    let columnLabels: Record<string, string> | undefined
    let columnOrder: Record<string, number> | undefined
    let includeCustomPayrollFields: boolean | undefined
    try {
      if (companyId) {
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
      }
    } catch (configErr) {
      console.warn('payroll/report: report config skipped', configErr)
    }

    const pdf = await generateConsolidatedPayrollPDF(
      planillaFixed,
      planillaHourly,
      periodo,
      Number(quincena),
      user.email,
      company?.name,
      pdfCustomFieldsConfig,
      pdfPayrollConfig,
      undefined,
      reportVisual,
      {
        groupBy: 'none',
        visibleColumnIds,
        columnLabels,
        columnOrder,
        includeCustomPayrollFields,
      }
    )
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=planilla_${periodo}_q${quincena}.pdf`)
    return res.send(pdf)
  } catch (error) {
    if (error instanceof PayrollNeedsRegenerateError) {
      return res.status(409).json({
        error: error.message,
        message: error.message,
        code: PAYROLL_NEEDS_REGENERATE_CODE,
      })
    }
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
