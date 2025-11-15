import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { generateConsolidatedPayrollPDF, type PlanillaItem } from '../../../lib/payroll/report'
import { getCustomFields } from '../../../lib/payroll-client-specific'
import { calculatePayroll } from '../../../lib/payroll-client-specific'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['POST', 'GET'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // AUTENTICACIÓN ESTANDARIZADA - Usar requireCompanyAccess
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)
    
    // Verificar roles específicos para generar reporte
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para generar reporte de nómina'
      })
    }
    const { periodo, quincena } = (req.method === 'GET') ? (req.query as any) : (req.body || {})

    if (!periodo || !/^[0-9]{4}-[0-9]{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (YYYY-MM)' })
    }
    if (![1, 2].includes(Number(quincena))) {
      return res.status(400).json({ error: 'Quincena inválida (1 o 2)' })
    }

    const [year, month] = periodo.split('-').map(Number)

    // MIGRADO: Usar payroll_run_lines en lugar de payroll_records
    // Get payroll run for this period and quincena
    const { data: payrollRun, error: runError } = await supabase
      .from('payroll_runs')
      .select('id')
      .eq('company_id', companyId)
      .eq('year', year)
      .eq('month', month)
      .eq('quincena', Number(quincena))
      .single()

    if (runError || !payrollRun) {
      return res.status(404).json({ error: 'No hay corrida de nómina para el período indicado' })
    }

    // Get payroll lines with employee data
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

    // Mapear a estructura de PlanillaItem con campos personalizados
    const planilla: PlanillaItem[] = await Promise.all(
      payrollLines.map(async (line: any) => {
        // Calculate custom deductions from metadata
        let customDeductions = 0
        let deductionsNotes = ''
        
        if (line.metadata && companyId) {
          const calcResult = await calculatePayroll(
            companyId,
            Number(line.eff_bruto) || 0,
            line.metadata,
            supabase
          )
          
          customDeductions = calcResult.totalDeduccionesAdicionales
          
          // Build notes for custom deductions
          const deductionFields = [
            { key: 'comedor', label: 'Comedor' },
            { key: 'cooperativa_aportaciones', label: 'Coop. Aportaciones' },
            { key: 'cooperativa_retirable', label: 'Coop. Retirable' },
            { key: 'cooperativa_prestamo', label: 'Coop. Préstamo' },
            { key: 'embargo_alimentos', label: 'Embargo' },
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

        return {
          id: line.employees?.dni || line.employees?.employee_code || '',
          name: line.employees?.name || '',
          bank: line.employees?.bank_name || 'No especificado',
          bank_account: line.employees?.bank_account || 'No especificado',
          department: line.employees?.departments?.name || 'Sin Departamento',
          monthly_salary: Number(line.employees?.base_salary) || 0,
          days_worked: (Number(line.eff_hours) || 0) / 8,
          days_absent: 0,
          late_days: 0,
          total_earnings: Number(line.eff_bruto) || 0,
          IHSS: Number(line.eff_ihss) || 0,
          RAP: Number(line.eff_rap) || 0,
          ISR: Number(line.eff_isr) || 0,
          total_deductions: totalDeductions,
          total: Number(line.eff_neto) || 0,
          notes_on_ingress: line.edited ? 'Editado' : '',
          notes_on_deductions: deductionsNotes,
          metadata: line.metadata || {} // Include metadata for custom fields display
        }
      })
    )

    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    // Get custom fields configuration for PDF columns (validar companyId no sea null)
    let pdfCustomFieldsConfig: Record<string, any> | undefined = undefined
    if (companyId) {
      const customFieldsConfig = await getCustomFields(companyId, supabase)
      
      // Get full config from DB to get category information
      if (customFieldsConfig) {
        const { data: payrollConfig } = await supabase
          .from('company_payroll_configs')
          .select('custom_fields')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .single()
        
        if (payrollConfig?.custom_fields) {
          pdfCustomFieldsConfig = payrollConfig.custom_fields as Record<string, any>
        }
      }
    }

    const pdf = await generateConsolidatedPayrollPDF(
      planilla, 
      periodo, 
      Number(quincena), 
      user.email, 
      company?.name,
      pdfCustomFieldsConfig
    )
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=planilla_${periodo}_q${quincena}.pdf`)
    return res.send(pdf)
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

