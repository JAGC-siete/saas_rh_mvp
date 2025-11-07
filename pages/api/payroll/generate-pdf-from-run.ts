import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { generateConsolidatedPayrollPDF, type PlanillaItem } from '../../../lib/payroll/report'
import { withExportRateLimit } from '../../../lib/security/rate-limiting'
import { getPayrollConfig, calculateProhalcaPayroll, calculateAlmacenesExtraPayroll } from '../../../lib/payroll-client-specific'

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

    // Obtener las líneas de nómina con datos completos de empleados y departamentos
    const { data: payrollLines, error: linesError } = await supabase
      .from('payroll_run_lines')
      .select(`
        *,
        employees!payroll_run_lines_employee_id_fkey(
          id, name, dni, base_salary, bank_name, bank_account,
          departments!employees_department_id_fkey(name)
        )
      `)
      .eq('run_id', run_id)
      .eq('company_id', companyId)

    // Get payroll config for this company
    const config = getPayrollConfig(companyId)

    if (linesError) {
      console.error('Error obteniendo líneas de nómina:', linesError)
      return res.status(500).json({ error: 'Error obteniendo líneas de nómina' })
    }

    if (!payrollLines || payrollLines.length === 0) {
      return res.status(404).json({ error: 'No hay líneas de nómina para esta corrida' })
    }

    // Mapear a estructura de PlanillaItem - usar valores EFECTIVOS (eff_*)
    const planilla: PlanillaItem[] = payrollLines.map((line: any) => {
      // Calculate custom deductions from metadata
      let customDeductions = 0
      let deductionsNotes = ''
      
      if (config && line.metadata) {
        if (config.calculationType === 'prohalca') {
          const calc = calculateProhalcaPayroll(Number(line.eff_bruto) || 0, line.metadata)
          customDeductions = calc.totalDeduccionesAdicionales
          // Build notes for custom deductions
          const deductionItems: string[] = []
          if (calc.comedor > 0) deductionItems.push(`Comedor: L. ${calc.comedor.toFixed(2)}`)
          if (calc.cooperativaAportaciones > 0) deductionItems.push(`Coop. Aportaciones: L. ${calc.cooperativaAportaciones.toFixed(2)}`)
          if (calc.cooperativaRetirable > 0) deductionItems.push(`Coop. Retirable: L. ${calc.cooperativaRetirable.toFixed(2)}`)
          if (calc.cooperativaPrestamo > 0) deductionItems.push(`Coop. Préstamo: L. ${calc.cooperativaPrestamo.toFixed(2)}`)
          if (calc.embargoAlimentos > 0) deductionItems.push(`Embargo: L. ${calc.embargoAlimentos.toFixed(2)}`)
          if (calc.otrasDeduccionesMateriales > 0) deductionItems.push(`Materiales: L. ${calc.otrasDeduccionesMateriales.toFixed(2)}`)
          if (calc.otrasDeduccionesMedicamentos > 0) deductionItems.push(`Medicamentos: L. ${calc.otrasDeduccionesMedicamentos.toFixed(2)}`)
          if (calc.otrasDeduccionesEfectivo > 0) deductionItems.push(`Efectivo: L. ${calc.otrasDeduccionesEfectivo.toFixed(2)}`)
          if (deductionItems.length > 0) deductionsNotes = deductionItems.join('; ')
        } else if (config.calculationType === 'almacenes_extra') {
          const calc = calculateAlmacenesExtraPayroll(Number(line.eff_bruto) || 0, line.metadata)
          customDeductions = calc.totalDeduccionesAdicionales
          // Build notes for custom deductions
          const deductionItems: string[] = []
          if (calc.prestamoBanrural > 0) deductionItems.push(`Préstamo BANRURAL: L. ${calc.prestamoBanrural.toFixed(2)}`)
          if (calc.prestamoCelular > 0) deductionItems.push(`Préstamo Celular: L. ${calc.prestamoCelular.toFixed(2)}`)
          if (calc.anticipoPrestamo > 0) deductionItems.push(`Anticipo/Préstamo: L. ${calc.anticipoPrestamo.toFixed(2)}`)
          if (calc.impuestoVecinal > 0) deductionItems.push(`Impuesto Vecinal: L. ${calc.impuestoVecinal.toFixed(2)}`)
          if (deductionItems.length > 0) deductionsNotes = deductionItems.join('; ')
        }
      }

      const statutoryDeductions = (Number(line.eff_ihss) || 0) + (Number(line.eff_rap) || 0) + (Number(line.eff_isr) || 0)
      const totalDeductions = statutoryDeductions + customDeductions

      return {
        id: line.employees?.dni || '',
        name: line.employees?.name || '',
        bank: line.employees?.bank_name || 'No especificado',
        bank_account: line.employees?.bank_account || 'No especificado',
        department: line.employees?.departments?.name || 'Sin Departamento',
        monthly_salary: Number(line.employees?.base_salary) || 0,
        days_worked: Number(line.eff_hours) / 8 || 0, // Convertir horas a días - usar EFECTIVO
        days_absent: 0, // Calcular si es necesario
        late_days: 0, // Calcular si es necesario
        total_earnings: Number(line.eff_bruto) || 0, // EFECTIVO incluye campos personalizados
        IHSS: Number(line.eff_ihss) || 0,
        RAP: Number(line.eff_rap) || 0,
        ISR: Number(line.eff_isr) || 0,
        total_deductions: totalDeductions,
        total: Number(line.eff_neto) || 0, // NETO EFECTIVO con deducciones personalizadas
        notes_on_ingress: line.edited ? 'Editado' : '',
        notes_on_deductions: deductionsNotes
      }
    })

    const periodo = `${payrollRun.year}-${String(payrollRun.month).padStart(2, '0')}`
    // Fetch company name for document title
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    const pdf = await generateConsolidatedPayrollPDF(planilla, periodo, payrollRun.quincena, user.email, company?.name)
    
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
