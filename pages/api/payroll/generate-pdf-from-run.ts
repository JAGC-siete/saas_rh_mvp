import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { generateConsolidatedPayrollPDF, type PlanillaItem } from '../../../lib/payroll/report'
import {
  parsePayrollPdfGroupByQuery,
  payrollPdfGroupByFilenameSuffix,
  type PayrollPdfGroupBy
} from '../../../lib/payroll/pdf-layout'
import { withExportRateLimit } from '../../../lib/security/rate-limiting'
import { calculatePayroll, getCustomFields } from '../../../lib/payroll-client-specific'
import { getBiweeklyPeriodDates, getMonthlyPeriodDates, getWeeklyPeriodDates } from '../../../lib/payroll/period-dates'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { run_id, group_by } = req.query

  if (!run_id || typeof run_id !== 'string') {
    return res.status(400).json({ error: 'run_id es requerido' })
  }

  try {
    // AUTENTICACIÓN ESTANDARIZADA - Usar requireCompanyAccess
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)
    
    // Verificar que companyId esté presente
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID es requerido' })
    }
    
    // Verificar roles específicos para generar PDF
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para generar PDF de nómina'
      })
    }

    // Obtener información de la corrida de nómina
    const { data: payrollRun, error: runError } = await supabase
      .from('payroll_runs')
      .select('id, company_id, year, month, quincena, tipo, status')
      .eq('id', run_id)
      .eq('company_id', companyId)
      .single()

    if (runError) {
      console.error('Error obteniendo corrida de nómina:', runError)
      return res.status(500).json({ error: 'Error obteniendo corrida de nómina' })
    }

    if (!payrollRun) {
      return res.status(404).json({ error: 'Corrida de nómina no encontrada' })
    }

    // Obtener las líneas de nómina con datos completos de empleados y departamentos (incluyendo pay_type)
    const { data: payrollLines, error: linesError } = await supabase
      .from('payroll_run_lines')
      .select(`
        *,
        employees!payroll_run_lines_employee_id_fkey(
          id, name, dni, base_salary, bank_name, bank_account, pay_type,
          team, position, role,
          departments!employees_department_id_fkey(name)
        )
      `)
      .eq('run_id', run_id)
      .eq('company_id', companyId)

    if (linesError) {
      console.error('Error obteniendo líneas de nómina:', linesError)
      return res.status(500).json({ error: 'Error obteniendo líneas de nómina' })
    }

    if (!payrollLines || payrollLines.length === 0) {
      return res.status(404).json({ error: 'No hay líneas de nómina para esta corrida' })
    }

    // Mapear a estructura de PlanillaItem - usar valores EFECTIVOS (eff_*)
    const planilla: PlanillaItem[] = await Promise.all(
      payrollLines.map(async (line: any) => {
        // Calculate custom deductions from metadata using new calculation engine
        let customDeductions = 0
        let deductionsNotes = ''
        
        if (line.metadata) {
          const calcResult = await calculatePayroll(
            companyId,
            Number(line.eff_bruto) || 0,
            line.metadata,
            supabase
          )
          
          customDeductions = calcResult.totalDeduccionesAdicionales
          
          // Build notes for custom deductions (generic approach)
          const deductionFields = [
            { key: 'comedor', label: 'Comedor' },
            { key: 'cooperativa_aportaciones', label: 'Coop. Aportaciones' },
            { key: 'cooperativa_retirable', label: 'Coop. Retirable' },
            { key: 'cooperativa_prestamo', label: 'Coop. Préstamo' },
            { key: 'embargo_alimentos', label: 'Embargo' },
            { key: 'otras_deducciones_materiales', label: 'Materiales' },
            { key: 'otras_deducciones_medicamentos', label: 'Medicamentos' },
            { key: 'otras_deducciones_efectivo', label: 'Efectivo' },
            { key: 'prestamo_banrural', label: 'Préstamo BANRURAL' },
            { key: 'prestamo_celular', label: 'Préstamo Celular' },
            { key: 'anticipo_prestamo', label: 'Anticipo/Préstamo' },
            { key: 'impuesto_vecinal', label: 'Impuesto Vecinal' }
          ]
          
          const deductionItems: string[] = []
          for (const field of deductionFields) {
            const value = parseFloat(line.metadata[field.key] || '0')
            if (value > 0) {
              deductionItems.push(`${field.label}: L. ${value.toFixed(2)}`)
            }
          }
          
          if (deductionItems.length > 0) {
            deductionsNotes = deductionItems.join('; ')
          }
        }

      const statutoryDeductions = (Number(line.eff_ihss) || 0) + (Number(line.eff_rap) || 0) + (Number(line.eff_isr) || 0)
      const totalDeductions = statutoryDeductions + customDeductions
      const payType = line.employees?.pay_type || 'fixed'
      const totalHours = Number(line.eff_hours) || 0
      const hourlyRate = payType === 'hourly' && totalHours > 0 
        ? (Number(line.eff_bruto) || 0) / totalHours 
        : 0

      return {
        id: line.employees?.dni || '',
        name: line.employees?.name || '',
        bank: line.employees?.bank_name || 'No especificado',
        bank_account: line.employees?.bank_account || 'No especificado',
        department: line.employees?.departments?.name || 'Sin Departamento',
        team: line.employees?.team ?? null,
        position: line.employees?.position ?? null,
        role: line.employees?.role ?? null,
        monthly_salary: Number(line.employees?.base_salary) || 0,
        days_worked: payType === 'hourly' ? (totalHours / 8) : (totalHours / 8),
        days_absent: 0, // Calcular si es necesario
        late_days: 0, // Calcular si es necesario
        total_earnings: Number(line.eff_bruto) || 0, // EFECTIVO incluye campos personalizados
        IHSS: Number(line.eff_ihss) || 0,
        RAP: Number(line.eff_rap) || 0,
        ISR: Number(line.eff_isr) || 0,
        total_deductions: totalDeductions,
        total: Number(line.eff_neto) || 0, // NETO EFECTIVO con deducciones personalizadas
        notes_on_ingress: line.edited ? 'Editado' : '',
        notes_on_deductions: deductionsNotes,
        metadata: line.metadata || {}, // Include metadata for custom fields display
        pay_type: payType, // Include pay_type for separation
        total_hours_worked: payType === 'hourly' ? totalHours : undefined,
        hourly_rate: payType === 'hourly' ? hourlyRate : undefined,
        septimo_dia: Number(line.seventh_day_pay) || Number((line.metadata as Record<string, unknown>)?.septimo_dia) || undefined
      }
      })
    )

    const periodo = `${payrollRun.year}-${String(payrollRun.month).padStart(2, '0')}`
    // Fetch company name for document title
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    // Obtener configuración de payroll (quincena_config como fuente primaria, metadata legacy)
    const { data: payrollConfig } = await supabase
      .from('company_payroll_configs')
      .select('metadata, payment_frequency, quincena_config, custom_fields')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()
    
    const payrollMetadata = payrollConfig?.metadata || {}
    const defaultGroupFromConfig = parsePayrollPdfGroupByQuery(
      (payrollMetadata as Record<string, unknown>).payroll_pdf_group_by
    )
    const groupByQuery = parsePayrollPdfGroupByQuery(group_by)
    const pdfGroupBy: PayrollPdfGroupBy =
      group_by !== undefined && group_by !== '' && group_by != null
        ? groupByQuery
        : defaultGroupFromConfig
    const qcCol = payrollConfig?.quincena_config as { first_start?: number; first_end?: number; second_start?: number; second_end?: number } | null
    const metaCutDates = payrollMetadata?.payment_cut_dates || {}
    const hasCustomQuincena = !!(qcCol && (qcCol.first_start != null || qcCol.first_end != null || qcCol.second_start != null || qcCol.second_end != null))
    const paymentCutDates = hasCustomQuincena
      ? {
          biweekly_type: 'custom' as const,
          biweekly_first_start: qcCol?.first_start ?? metaCutDates?.biweekly_first_start ?? 1,
          biweekly_first_end: qcCol?.first_end ?? metaCutDates?.biweekly_first_end ?? 15,
          biweekly_second_start: qcCol?.second_start ?? metaCutDates?.biweekly_second_start ?? 16,
          biweekly_second_end: qcCol?.second_end ?? metaCutDates?.biweekly_second_end ?? 30,
          monthly_type: metaCutDates?.monthly_type || 'standard',
          monthly_start: metaCutDates?.monthly_start ?? 1,
          monthly_end: metaCutDates?.monthly_end ?? 30
        }
      : metaCutDates?.biweekly_first_start != null
        ? metaCutDates
        : {
            biweekly_type: 'standard' as const,
            biweekly_first_start: 1,
            biweekly_first_end: 15,
            biweekly_second_start: 16,
            biweekly_second_end: 30,
            monthly_type: 'standard' as const,
            monthly_start: 1,
            monthly_end: 30
          }
    const currency = payrollMetadata.currency || 'HNL'
    const pfRaw = payrollConfig?.payment_frequency ?? payrollMetadata.payment_frequency ?? 'biweekly'
    const paymentFrequency = pfRaw === 'mensual' ? 'monthly' : pfRaw === 'quincenal' ? 'biweekly' : pfRaw === 'semanal' ? 'weekly' : pfRaw

    // Get custom fields configuration for PDF columns
    const customFieldsConfig = await getCustomFields(companyId, supabase)
    
    // Convert simple custom fields format to config format needed by PDF generator
    // If custom fields come from DB, they might be in the full format already
    let pdfCustomFieldsConfig: Record<string, any> | undefined = undefined
    if (customFieldsConfig) {
      if (payrollConfig?.custom_fields) {
        pdfCustomFieldsConfig = payrollConfig.custom_fields as Record<string, any>
      } else {
        // Fallback: use simple format and assume all are earnings (conservative)
        // Better to have them show than not at all
        pdfCustomFieldsConfig = {}
        for (const [fieldName, label] of Object.entries(customFieldsConfig)) {
          pdfCustomFieldsConfig[fieldName] = {
            label: typeof label === 'string' ? label : fieldName,
            type: 'number',
            category: 'earnings', // Default to earnings if unknown
            required: false,
            default: 0
          }
        }
      }
    }

    // Preparar configuración de payroll para el PDF
    const legalDeductions = payrollMetadata.legal_deductions || {
      ihss: true,
      rap: true,
      isr: true
    }
    const pdfPayrollConfig = {
      currency,
      payment_frequency: paymentFrequency,
      payment_cut_dates: paymentCutDates,
      legal_deductions: legalDeductions
    }

    // Separate fixed and hourly employees
    const planillaFixed = planilla.filter(p => (p as any).pay_type !== 'hourly')
    const planillaHourly = planilla.filter(p => (p as any).pay_type === 'hourly')

    // Calcular rango de fechas del período para el header dinámico
    const [year, month] = periodo.split('-').map(Number)
    let periodDates: { period_start: string; period_end: string } | undefined
    if (paymentFrequency === 'monthly') {
      const cut = paymentCutDates
      const start = cut?.monthly_start ?? 1
      const end = cut?.monthly_end ?? new Date(year, month, 0).getDate()
      const r = getMonthlyPeriodDates(year, month, start, end)
      periodDates = { period_start: r.fechaInicio, period_end: r.fechaFin }
    } else if (paymentFrequency === 'weekly') {
      const semana = (payrollRun.quincena as 1 | 2 | 3 | 4) || 1
      const r = getWeeklyPeriodDates(year, month, semana <= 4 ? semana as 1 | 2 | 3 | 4 : 1)
      periodDates = { period_start: r.fechaInicio, period_end: r.fechaFin }
    } else {
      const r = getBiweeklyPeriodDates(year, month, payrollRun.quincena as 1 | 2, {
        biweekly_first_start: paymentCutDates?.biweekly_first_start ?? 1,
        biweekly_first_end: paymentCutDates?.biweekly_first_end ?? 15,
        biweekly_second_start: paymentCutDates?.biweekly_second_start ?? 16,
        biweekly_second_end: paymentCutDates?.biweekly_second_end ?? 30
      })
      periodDates = { period_start: r.fechaInicio, period_end: r.fechaFin }
    }

    const pdf = await generateConsolidatedPayrollPDF(
      planillaFixed,
      planillaHourly,
      periodo,
      payrollRun.quincena,
      user.email,
      company?.name,
      pdfCustomFieldsConfig,
      pdfPayrollConfig,
      periodDates,
      undefined,
      { groupBy: pdfGroupBy }
    )

    const groupSuffix = payrollPdfGroupByFilenameSuffix(pdfGroupBy)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=planilla_${periodo}_q${payrollRun.quincena}${groupSuffix}.pdf`
    )
    return res.send(pdf)

  } catch (error: any) {
    console.error('Error generando PDF desde run:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message || 'Error desconocido'
    })
  }
}

export default withExportRateLimit()(handler)
