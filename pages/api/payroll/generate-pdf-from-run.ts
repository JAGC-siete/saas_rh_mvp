import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { generateConsolidatedPayrollPDF, type PlanillaItem } from '../../../lib/payroll/report'
import { withExportRateLimit } from '../../../lib/security/rate-limiting'
import { calculatePayroll, getCustomFields } from '../../../lib/payroll-client-specific'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { run_id } = req.query

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
        hourly_rate: payType === 'hourly' ? hourlyRate : undefined
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

    // Obtener configuración de payroll (metadata con parámetros)
    const { data: payrollConfig } = await supabase
      .from('company_payroll_configs')
      .select('metadata, custom_fields')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()
    
    // Extraer parámetros desde metadata
    const payrollMetadata = payrollConfig?.metadata || {}
    const currency = payrollMetadata.currency || 'HNL'
    const paymentFrequency = payrollMetadata.payment_frequency || 'biweekly'
    const paymentCutDates = payrollMetadata.payment_cut_dates || {
      biweekly_type: 'standard',
      biweekly_first_start: 1,
      biweekly_first_end: 15,
      biweekly_second_start: 16,
      biweekly_second_end: 30,
      monthly_type: 'standard',
      monthly_start: 1,
      monthly_end: 30
    }

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
    const pdfPayrollConfig = {
      currency,
      payment_frequency: paymentFrequency,
      payment_cut_dates: paymentCutDates
    }

    // Separate fixed and hourly employees
    const planillaFixed = planilla.filter(p => (p as any).pay_type !== 'hourly')
    const planillaHourly = planilla.filter(p => (p as any).pay_type === 'hourly')

    const pdf = await generateConsolidatedPayrollPDF(
      planillaFixed,
      planillaHourly,
      periodo, 
      payrollRun.quincena, 
      user.email, 
      company?.name,
      pdfCustomFieldsConfig,
      pdfPayrollConfig
    )
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=planilla_${periodo}_q${payrollRun.quincena}.pdf`)
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
