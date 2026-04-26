import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { generateEmployeeReceiptPDF } from '../../../lib/payroll/receipt'
import { getHondurasTimestamp } from '../../../lib/timezone'
import { calculatePayroll } from '../../../lib/payroll-client-specific'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Accept both GET and POST for flexibility
  if (!['GET', 'POST'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Authentication
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)
    
    // Verificar que companyId esté presente
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID es requerido' })
    }
    
    // Check permissions
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para generar voucher'
      })
    }

    // Extract run_line_id from query or body
    const { run_line_id } = req.method === 'GET' ? req.query : req.body
    
    if (!run_line_id) {
      return res.status(400).json({ 
        error: 'run_line_id es requerido' 
      })
    }

    console.log('🔍 Generating voucher for run_line_id:', run_line_id)

    // Get payroll line with related data using the view
    const { data: lineData, error: lineError } = await supabase
      .from('payroll_run_lines')
      .select(`
        id,
        employee_id,
        run_id,
        eff_bruto,
        eff_ihss,
        eff_rap,
        eff_isr,
        eff_neto,
        eff_hours,
        seventh_day_pay,
        metadata,
        employees:employee_id (
          name,
          employee_code,
          bank_name,
          bank_account,
          department_id,
          role
        ),
        payroll_runs:run_id (
          year,
          month,
          quincena
        )
      `)
      .eq('id', run_line_id)
      .single()

    if (lineError || !lineData) {
      console.error('❌ Error fetching payroll line:', lineError)
      return res.status(404).json({ 
        error: 'Línea de nómina no encontrada',
        details: lineError?.message 
      })
    }

    const employee = lineData.employees
    const run = lineData.payroll_runs

    if (!employee || !run) {
      return res.status(404).json({ 
        error: 'Datos incompletos',
        message: 'No se encontró información del empleado o de la corrida'
      })
    }

    // Get department name
    let departmentName = 'Sin Departamento'
    if (employee.department_id) {
      const { data: dept } = await supabase
        .from('departments')
        .select('name')
        .eq('id', employee.department_id)
        .single()
      if (dept) departmentName = dept.name
    }

    // Get company name
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    // Build period strings
    const periodo = `${run.year}-${String(run.month).padStart(2, '0')}`
    const ultimoDia = new Date(run.year, run.month, 0).getDate()
    const fechaInicio = run.quincena === 1 ? `${periodo}-01` : `${periodo}-16`
    const fechaFin = run.quincena === 1 ? `${periodo}-15` : `${periodo}-${ultimoDia}`

    // Calculate custom deductions from metadata using new calculation engine
    let customDeductions = 0
    let customDeductionsList: Array<{ name: string; amount: number }> = []
    
    if (lineData.metadata) {
      const calcResult = await calculatePayroll(
        companyId,
        Number(lineData.eff_bruto) || 0,
        lineData.metadata,
        supabase
      )
      
      customDeductions = calcResult.totalDeduccionesAdicionales
      
      // Build deductions list from metadata (generic approach)
      if (lineData.metadata) {
        const deductionFields = [
          { key: 'comedor', label: 'Comedor' },
          { key: 'cooperativa_aportaciones', label: 'Coop. Aportaciones' },
          { key: 'cooperativa_retirable', label: 'Coop. Retirable' },
          { key: 'cooperativa_prestamo', label: 'Coop. Préstamo' },
          { key: 'embargo_alimentos', label: 'Embargo de Alimentos' },
          { key: 'otras_deducciones_materiales', label: 'Materiales' },
          { key: 'otras_deducciones_medicamentos', label: 'Medicamentos' },
          { key: 'otras_deducciones_efectivo', label: 'Efectivo' },
          { key: 'prestamo_banrural', label: 'Préstamo BANRURAL' },
          { key: 'prestamo_celular', label: 'Préstamo Celular' },
          { key: 'anticipo_prestamo', label: 'Anticipo/Préstamo' },
          { key: 'impuesto_vecinal', label: 'Impuesto Vecinal' }
        ]
        
        for (const field of deductionFields) {
          const value = parseFloat(lineData.metadata[field.key] || '0')
          if (value > 0) {
            customDeductionsList.push({ name: field.label, amount: value })
          }
        }
      }
    }

    const statutoryDeductions = (lineData.eff_ihss || 0) + (lineData.eff_rap || 0) + (lineData.eff_isr || 0)
    const totalDeductions = statutoryDeductions + customDeductions

    const septimoDia = Number(lineData.seventh_day_pay) || Number((lineData.metadata as Record<string, unknown>)?.septimo_dia) || 0
    const brutoTotal = Number(lineData.eff_bruto) || 0
    const baseSalaryForReceipt = septimoDia > 0 ? brutoTotal - septimoDia : brutoTotal

    console.log('✅ Voucher data prepared:', {
      employee: employee.name,
      periodo,
      quincena: run.quincena,
      neto: lineData.eff_neto,
      customDeductions,
      totalDeductions,
      septimoDia: septimoDia > 0 ? septimoDia : undefined
    })

    // Generate PDF
    const pdf = await generateEmployeeReceiptPDF({
      employee_code: employee.employee_code || 'N/A',
      employee_name: employee.name,
      department: departmentName,
      position: employee.role || 'N/A',
      period_start: fechaInicio,
      period_end: fechaFin,
      days_worked: Math.floor(lineData.eff_hours || 0),
      base_salary: baseSalaryForReceipt,
      septimo_dia: septimoDia > 0 ? septimoDia : undefined,
      income_tax: lineData.eff_isr || 0,
      professional_tax: lineData.eff_rap || 0,
      social_security: lineData.eff_ihss || 0,
      total_deductions: totalDeductions,
      net_salary: lineData.eff_neto || 0,
      bank_name: employee.bank_name || '',
      bank_account: employee.bank_account || '',
      custom_deductions: customDeductionsList
    }, periodo, run.quincena, companyId, company?.name, `Quincena ${run.quincena}`)

    console.log('✅ Voucher PDF generated for:', employee.name)

    // Return PDF
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=voucher_${employee.employee_code}_${periodo}_q${run.quincena}.pdf`)
    return res.send(pdf)

  } catch (error: any) {
    console.error('❌ Error en receipt-voucher:', error)
    return res.status(500).json({ 
      error: error?.message || 'Internal error',
      message: 'Error interno del servidor'
    })
  }
}

