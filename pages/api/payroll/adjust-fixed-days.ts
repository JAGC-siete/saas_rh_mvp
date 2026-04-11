import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { getTaxBracketsForYear } from '../../../lib/tax/honduras-tax'
import {
  resolvePayrollPeriodContext,
  computeFixedGrossFromDays,
  computeFixedLineDeductionsAndNet,
  buildFixedLinePlanMetadata,
  mergeRecalcMetadata,
  type PreviewPaymentFrequency,
  type PaymentCutDatesInput
} from '../../../lib/payroll/fixed-line-recalc'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para ajustar nómina'
      })
    }

    const { run_line_id, days_worked: dwRaw, reason } = req.body || {}

    if (!run_line_id || dwRaw === undefined || dwRaw === null) {
      return res.status(400).json({ error: 'run_line_id y days_worked son requeridos' })
    }

    const daysWorked = Number(dwRaw)
    if (!Number.isFinite(daysWorked) || daysWorked < 0) {
      return res.status(400).json({ error: 'days_worked debe ser un número >= 0' })
    }
    if (!Number.isInteger(daysWorked)) {
      return res.status(400).json({ error: 'days_worked debe ser entero (días del período)' })
    }

    const { data: line, error: lineError } = await supabase
      .from('payroll_run_lines')
      .select('id, company_id, run_id, employee_id, metadata')
      .eq('id', run_line_id)
      .eq('company_id', companyId)
      .single()

    if (lineError || !line) {
      return res.status(404).json({
        error: 'Línea no encontrada',
        message: 'La línea no existe o no pertenece a su empresa'
      })
    }

    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('id, status, year, month, quincena, tipo, company_id')
      .eq('id', line.run_id)
      .single()

    if (runError || !run) {
      return res.status(404).json({ error: 'Corrida no encontrada' })
    }

    if (run.company_id !== companyId) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    if (!['draft', 'edited'].includes(run.status)) {
      return res.status(400).json({
        error: 'Corrida no editable',
        message: `La corrida está en estado '${run.status}'`
      })
    }

    const tipoParam = (run.tipo || 'CON') as string
    if (!['CON', 'SIN', '2PAGOS'].includes(tipoParam)) {
      return res.status(400).json({ error: 'Tipo de corrida no soportado' })
    }

    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, pay_type, base_salary')
      .eq('id', line.employee_id)
      .eq('company_id', companyId)
      .single()

    if (empError || !employee) {
      return res.status(404).json({ error: 'Empleado no encontrado' })
    }

    if ((employee.pay_type ?? 'fixed') !== 'fixed') {
      return res.status(400).json({
        error: 'Solo aplica a empleados con salario fijo (fixed)'
      })
    }

    const { data: payrollConfig, error: configError } = await supabase
      .from('company_payroll_configs')
      .select('metadata, payment_frequency, quincena_config')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle()

    if (configError) {
      console.error('adjust-fixed-days: config', configError)
    }

    const payrollMetadata = payrollConfig?.metadata || {}
    const qcCol = payrollConfig?.quincena_config as {
      first_start?: number
      first_end?: number
      second_start?: number
      second_end?: number
    } | null
    const metaCutDates = (payrollMetadata?.payment_cut_dates || {}) as Record<string, unknown>
    const mapFreq = (v: string) => {
      const x = (v || '').toLowerCase()
      if (x === 'mensual' || x === 'monthly') return 'monthly'
      if (x === 'semanal' || x === 'weekly') return 'weekly'
      if (x === 'quincenal' || x === 'biweekly') return 'biweekly'
      return 'biweekly'
    }
    const paymentFrequency = mapFreq(
      (payrollConfig?.payment_frequency as string) || (payrollMetadata.payment_frequency as string) || 'quincenal'
    ) as PreviewPaymentFrequency

    const hasCustomQuincena = !!(
      qcCol &&
      (qcCol.first_start != null ||
        qcCol.first_end != null ||
        qcCol.second_start != null ||
        qcCol.second_end != null)
    )
    const paymentCutDates: PaymentCutDatesInput = qcCol
      ? {
          biweekly_type:
            metaCutDates.biweekly_type === 'custom' || hasCustomQuincena ? 'custom' : 'standard',
          biweekly_first_start: qcCol.first_start ?? (metaCutDates.biweekly_first_start as number) ?? 1,
          biweekly_first_end: qcCol.first_end ?? (metaCutDates.biweekly_first_end as number) ?? 15,
          biweekly_second_start: qcCol.second_start ?? (metaCutDates.biweekly_second_start as number) ?? 16,
          biweekly_second_end: qcCol.second_end ?? (metaCutDates.biweekly_second_end as number) ?? 30,
          monthly_type: metaCutDates.monthly_type === 'custom' ? 'custom' : 'standard',
          monthly_start: (metaCutDates.monthly_start as number) ?? 1,
          monthly_end: (metaCutDates.monthly_end as number) ?? 30
        }
      : {
          biweekly_type: metaCutDates.biweekly_type === 'custom' ? 'custom' : 'standard',
          biweekly_first_start: (metaCutDates.biweekly_first_start as number) ?? 1,
          biweekly_first_end: (metaCutDates.biweekly_first_end as number) ?? 15,
          biweekly_second_start: (metaCutDates.biweekly_second_start as number) ?? 16,
          biweekly_second_end: (metaCutDates.biweekly_second_end as number) ?? 30,
          monthly_type: metaCutDates.monthly_type === 'custom' ? 'custom' : 'standard',
          monthly_start: (metaCutDates.monthly_start as number) ?? 1,
          monthly_end: (metaCutDates.monthly_end as number) ?? 30
        }

    const legalDeductions = (payrollMetadata.legal_deductions || {
      ihss: true,
      rap: true,
      isr: true,
      infop: false
    }) as { ihss: boolean; rap: boolean; isr: boolean; infop?: boolean }

    const semanalProration = (payrollMetadata.semanal_proration || 'proportional') as 'proportional' | 'fixed'

    const { data: companyRow } = await supabase.from('companies').select('settings').eq('id', companyId).single()
    const useIsrProjection = (companyRow?.settings as Record<string, unknown>)?.use_isr_projection === true

    const yearNum = run.year
    const monthNum = run.month
    const quincenaNum = run.quincena

    if (paymentFrequency === 'weekly') {
      if (![1, 2, 3, 4].includes(quincenaNum)) {
        return res.status(400).json({
          error: 'Semana inválida en la corrida (se espera 1–4 para nómina semanal)'
        })
      }
    } else if (![1, 2].includes(quincenaNum)) {
      return res.status(400).json({
        error: 'Quincena inválida en la corrida (se espera 1 o 2)'
      })
    }

    const periodCtx = resolvePayrollPeriodContext(
      yearNum,
      monthNum,
      quincenaNum,
      paymentFrequency,
      paymentCutDates
    )
    const { diasPeriodo } = periodCtx

    if (daysWorked > diasPeriodo) {
      return res.status(400).json({
        error: 'days_worked fuera de rango',
        message: `Máximo ${diasPeriodo} días en este período`,
        diasPeriodo
      })
    }

    const baseSalary = Number(employee.base_salary) || 0
    const taxConstants = await getTaxBracketsForYear(yearNum)

    let totalEarnings = computeFixedGrossFromDays({
      baseSalary,
      daysWorked,
      paymentFrequency,
      diasPeriodo,
      ultimoDiaCalendario: periodCtx.ultimoDiaCalendario,
      isMonthlyCalendarStandard: periodCtx.isMonthlyCalendarStandard,
      semanalProration
    })

    if (!isFinite(totalEarnings) || isNaN(totalEarnings)) {
      totalEarnings = 0
    }

    const { data: plansData } = await supabase
      .from('employee_deduction_plans')
      .select('id, employee_id, field_key, monto_por_plazo, plazos_aplicados, plazos_totales')
      .eq('employee_id', line.employee_id)
      .eq('company_id', companyId)
      .eq('activo', true)

    const empPlans = (plansData || []).filter(
      (p: { plazos_aplicados: number; plazos_totales: number }) => p.plazos_aplicados < p.plazos_totales
    )

    const ded = await computeFixedLineDeductionsAndNet({
      supabase,
      companyId,
      employeeId: line.employee_id,
      year: yearNum,
      month: monthNum,
      quincena: quincenaNum,
      paymentFrequency,
      tipoParam: tipoParam as 'CON' | 'SIN' | '2PAGOS',
      legalDeductions,
      useIsrProjection,
      taxConstants,
      totalEarnings,
      baseSalary,
      empPlans
    })

    const IHSS = round2(ded.IHSS)
    const RAP = round2(ded.RAP)
    const ISR = round2(ded.ISR)
    const totalDeductions = round2(ded.totalDeductions)
    const netTotal = round2(ded.total)
    const gross = round2(totalEarnings)

    const planFieldKeys = new Set<string>()
    for (const p of empPlans as { field_key?: string }[]) {
      if (p.field_key) planFieldKeys.add(p.field_key)
    }
    const reasonStr =
      typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 500) : 'Ajuste de días trabajados'

    const recalcMeta = buildFixedLinePlanMetadata(yearNum, empPlans, {
      days_adjusted_at: new Date().toISOString(),
      days_adjust_reason: reasonStr,
      days_adjusted_by: user.id
    })

    const mergedMetadata = mergeRecalcMetadata(
      line.metadata as Record<string, unknown> | null,
      recalcMeta,
      planFieldKeys
    )

    const { data: rpcData, error: rpcError } = await supabase.rpc('payroll_recalc_fixed_days_apply', {
      p_run_line_id: run_line_id,
      p_company_id: companyId,
      p_calc_hours: daysWorked,
      p_calc_bruto: gross,
      p_calc_ihss: IHSS,
      p_calc_rap: RAP,
      p_calc_isr: ISR,
      p_calc_neto: netTotal,
      p_metadata: mergedMetadata,
      p_tax_year: yearNum,
      p_user_id: user.id
    })

    if (rpcError) {
      console.error('payroll_recalc_fixed_days_apply', rpcError)
      return res.status(500).json({
        error: 'Error persistiendo recálculo',
        message: rpcError.message
      })
    }

    const payload = rpcData as { success?: boolean; error?: string } | null
    if (payload && payload.success === false) {
      return res.status(400).json({ error: payload.error || 'No se pudo aplicar el recálculo' })
    }

    const { data: updatedLine, error: fetchErr } = await supabase
      .from('payroll_run_lines')
      .select('id, eff_hours, eff_bruto, eff_ihss, eff_rap, eff_isr, eff_neto, edited, updated_at, metadata')
      .eq('id', run_line_id)
      .single()

    if (fetchErr) {
      console.error('adjust-fixed-days fetch line', fetchErr)
    }

    return res.status(200).json({
      success: true,
      line: updatedLine || {
        id: run_line_id,
        eff_hours: daysWorked,
        eff_bruto: gross,
        eff_ihss: IHSS,
        eff_rap: RAP,
        eff_isr: ISR,
        eff_neto: netTotal,
        edited: true,
        metadata: mergedMetadata
      },
      diasPeriodo,
      total_deductions: totalDeductions
    })
  } catch (e: unknown) {
    const err = e as { message?: string }
    if (err.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    console.error('adjust-fixed-days', e)
    return res.status(500).json({ error: 'Error interno' })
  }
}
