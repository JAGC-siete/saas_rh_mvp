import type { NextApiRequest, NextApiResponse } from 'next'
import { requireUser } from '../../../../lib/auth/requireUser'
import { generateEmployeeReceiptPDF } from '../../../../lib/payroll/receipt'
import { buildVoucherPdfOptions } from '../../../../lib/payroll/voucher-pdf-options'
import { resolveReportConfig } from '../../../../lib/reports/column-resolver'
import { calculatePeriodBaseSalary, normalizeFrequency } from '../../../../lib/payroll/calculate-period-base-salary'
import { loadOvertimeDailyBreakdownSheet } from '../../../../lib/payroll/overtime-daily-breakdown'
import { assertEmployeePortalEnabled } from '../../../../lib/employee-portal/company-settings'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // AUTENTICACIÓN - Solo empleados pueden acceder
    const { supabase, userProfile } = await requireUser(req, res)
    
    if (!userProfile?.employee_id) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        message: 'Solo los empleados pueden acceder a esta funcionalidad'
      })
    }

    if (!(await assertEmployeePortalEnabled(supabase, userProfile.company_id, res))) {
      return
    }

    const { periodo, quincena } = req.body

    if (!periodo || !/^[0-9]{4}-[0-9]{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (YYYY-MM)' })
    }
    if (![1, 2].includes(Number(quincena))) {
      return res.status(400).json({ error: 'Quincena inválida (1 o 2)' })
    }

    const employeeId = userProfile.employee_id
    const [year, month] = periodo.split('-').map(Number)
    const ultimoDia = new Date(year, month, 0).getDate()
    const fechaInicio = Number(quincena) === 1 ? `${periodo}-01` : `${periodo}-16`
    const fechaFin = Number(quincena) === 1 ? `${periodo}-15` : `${periodo}-${ultimoDia}`

    // Buscar el registro de nómina del empleado (incluir pay_type para cálculo correcto)
    const { data: record, error } = await supabase
      .from('payroll_records')
      .select(`
        *,
        employees:employee_id (
          name,
          employee_code,
          department,
          role,
          bank_name,
          bank_account,
          company_id,
          pay_type,
          payment_frequency
        )
      `)
      .eq('employee_id', employeeId)
      .eq('period_start', fechaInicio)
      .eq('period_end', fechaFin)
      .single()

    if (error || !record) {
      return res.status(404).json({ 
        error: 'Registro no encontrado',
        message: 'No se encontró información de nómina para el período especificado'
      })
    }

    // Verificar que el empleado solo pueda ver su propia información
    if (record.employee_id !== employeeId) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        message: 'No tiene permisos para acceder a esta información'
      })
    }

    // Calcular salario base del período (sin hardcodear /2)
    const frequency = normalizeFrequency(
      (record as { period_type?: string })?.period_type ??
      (record.employees as { payment_frequency?: string })?.payment_frequency
    )
    const hoursWorked =
      Number((record.metadata as Record<string, unknown>)?.hours_worked) ??
      Number((record.metadata as Record<string, unknown>)?.total_hours_worked) ??
      0
    const periodBaseSalary = calculatePeriodBaseSalary(
      {
        base_salary: Number(record.base_salary) || 0,
        pay_type: (record.employees as { pay_type?: string })?.pay_type as 'fixed' | 'hourly' | undefined
      },
      frequency,
      { hoursWorked, metadata: record.metadata as Record<string, unknown> }
    )

    const septimoDia = Number((record as { seventh_day_pay?: number })?.seventh_day_pay) || Number((record.metadata as Record<string, unknown>)?.septimo_dia) || 0
    const grossTotal = Number(record.gross_salary) || 0
    const baseForReceipt = septimoDia > 0 ? grossTotal - septimoDia : (periodBaseSalary || grossTotal)

    const meta = (record.metadata as Record<string, unknown>) || {}
    const overtimePayRaw = Number(meta.overtime_pay)
    const overtimePay =
      Number.isFinite(overtimePayRaw) && overtimePayRaw > 0
        ? Math.round(overtimePayRaw * 100) / 100
        : 0
    const horasExtrasRaw = Number(meta.horas_extras)
    const horasExtras =
      Number.isFinite(horasExtrasRaw) && horasExtrasRaw > 0
        ? Math.round(horasExtrasRaw * 100) / 100
        : 0
    const monthlySalary = Number(record.base_salary) || 0

    let overtimeDaily = null
    if ((overtimePay > 0 || horasExtras > 0) && employeeId) {
      overtimeDaily = await loadOvertimeDailyBreakdownSheet(supabase, {
        employeeId,
        periodStart: fechaInicio,
        periodEnd: fechaFin,
        monthlySalary,
        paidOvertimePay: overtimePay > 0 ? overtimePay : undefined,
        lineMetadata: meta,
      })
    }

    const resolvedConfig = await resolveReportConfig(userProfile.company_id, 'voucher', supabase)
    const pdfOptions = buildVoucherPdfOptions(resolvedConfig)
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', userProfile.company_id)
      .single()

    const pdf = await generateEmployeeReceiptPDF({
      employee_code: record.employees?.employee_code,
      employee_name: record.employees?.name,
      department: record.employees?.department,
      position: (record.employees as { role?: string | null })?.role ?? undefined,
      period_start: record.period_start,
      period_end: record.period_end,
      days_worked: Number(record.days_worked) || 0,
      base_salary: baseForReceipt,
      septimo_dia: septimoDia > 0 ? septimoDia : undefined,
      overtime_pay: overtimePay > 0 ? overtimePay : undefined,
      horas_extras: horasExtras > 0 ? horasExtras : undefined,
      overtime_daily: overtimeDaily,
      income_tax: Number(record.income_tax) || 0,
      professional_tax: Number(record.professional_tax) || 0,
      social_security: Number(record.social_security) || 0,
      total_deductions: Number(record.total_deductions) || 0,
      net_salary: Number(record.net_salary) || 0,
      bank_name: record.employees?.bank_name,
      bank_account: record.employees?.bank_account
    }, periodo, Number(quincena), userProfile.company_id, company?.name, `Quincena ${quincena}`, pdfOptions)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=recibo_nomina_${record.employees?.employee_code || 'empleado'}_${periodo}_q${quincena}.pdf`)
    return res.send(pdf)

  } catch (error: any) {
    console.error('Error generando PDF de nómina para empleado:', error)
    
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'No autorizado' })
    }
    
    if (error.message === 'PROFILE_REQUIRED') {
      return res.status(403).json({ error: 'Perfil de empleado requerido' })
    }

    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message || 'Error desconocido'
    })
  }
}
