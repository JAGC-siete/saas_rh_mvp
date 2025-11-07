import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { generateEmployeeReceiptPDF } from '../../../lib/payroll/receipt'
import { getHondurasTimestamp } from '../../../lib/timezone'
import { getPayrollConfig, calculateProhalcaPayroll, calculateAlmacenesExtraPayroll } from '../../../lib/payroll-client-specific'

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

    // Get payroll config for this company
    const config = getPayrollConfig(companyId)

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

    // Calculate custom deductions from metadata
    let customDeductions = 0
    let customDeductionsList: Array<{ name: string; amount: number }> = []
    
    if (config && lineData.metadata) {
      if (config.calculationType === 'prohalca') {
        const calc = calculateProhalcaPayroll(Number(lineData.eff_bruto) || 0, lineData.metadata)
        customDeductions = calc.totalDeduccionesAdicionales
        if (calc.comedor > 0) customDeductionsList.push({ name: 'Comedor', amount: calc.comedor })
        if (calc.cooperativaAportaciones > 0) customDeductionsList.push({ name: 'Coop. Aportaciones', amount: calc.cooperativaAportaciones })
        if (calc.cooperativaRetirable > 0) customDeductionsList.push({ name: 'Coop. Retirable', amount: calc.cooperativaRetirable })
        if (calc.cooperativaPrestamo > 0) customDeductionsList.push({ name: 'Coop. Préstamo', amount: calc.cooperativaPrestamo })
        if (calc.embargoAlimentos > 0) customDeductionsList.push({ name: 'Embargo de Alimentos', amount: calc.embargoAlimentos })
        if (calc.otrasDeduccionesMateriales > 0) customDeductionsList.push({ name: 'Materiales', amount: calc.otrasDeduccionesMateriales })
        if (calc.otrasDeduccionesMedicamentos > 0) customDeductionsList.push({ name: 'Medicamentos', amount: calc.otrasDeduccionesMedicamentos })
        if (calc.otrasDeduccionesEfectivo > 0) customDeductionsList.push({ name: 'Efectivo', amount: calc.otrasDeduccionesEfectivo })
      } else if (config.calculationType === 'almacenes_extra') {
        const calc = calculateAlmacenesExtraPayroll(Number(lineData.eff_bruto) || 0, lineData.metadata)
        customDeductions = calc.totalDeduccionesAdicionales
        if (calc.prestamoBanrural > 0) customDeductionsList.push({ name: 'Préstamo BANRURAL', amount: calc.prestamoBanrural })
        if (calc.prestamoCelular > 0) customDeductionsList.push({ name: 'Préstamo Celular', amount: calc.prestamoCelular })
        if (calc.anticipoPrestamo > 0) customDeductionsList.push({ name: 'Anticipo/Préstamo', amount: calc.anticipoPrestamo })
        if (calc.impuestoVecinal > 0) customDeductionsList.push({ name: 'Impuesto Vecinal', amount: calc.impuestoVecinal })
      }
    }

    const statutoryDeductions = (lineData.eff_ihss || 0) + (lineData.eff_rap || 0) + (lineData.eff_isr || 0)
    const totalDeductions = statutoryDeductions + customDeductions

    console.log('✅ Voucher data prepared:', {
      employee: employee.name,
      periodo,
      quincena: run.quincena,
      neto: lineData.eff_neto,
      customDeductions,
      totalDeductions
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
      base_salary: lineData.eff_bruto || 0,
      income_tax: lineData.eff_isr || 0,
      professional_tax: lineData.eff_rap || 0,
      social_security: lineData.eff_ihss || 0,
      total_deductions: totalDeductions,
      net_salary: lineData.eff_neto || 0,
      bank_name: employee.bank_name || '',
      bank_account: employee.bank_account || '',
      custom_deductions: customDeductionsList
    }, periodo, run.quincena, companyId, company?.name)

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

