import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { generateConsolidatedPayrollPDF, type PlanillaItem } from '../../../lib/payroll/report'
import { withExportRateLimit } from '../../../lib/security/rate-limiting'

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

    if (linesError) {
      console.error('Error obteniendo líneas de nómina:', linesError)
      return res.status(500).json({ error: 'Error obteniendo líneas de nómina' })
    }

    if (!payrollLines || payrollLines.length === 0) {
      return res.status(404).json({ error: 'No hay líneas de nómina para esta corrida' })
    }

    // Mapear a estructura de PlanillaItem
    const planilla: PlanillaItem[] = payrollLines.map((line: any) => ({
      id: line.employees?.dni || '',
      name: line.employees?.name || '',
      bank: line.employees?.bank_name || 'No especificado',
      bank_account: line.employees?.bank_account || 'No especificado',
      department: line.employees?.departments?.name || 'Sin Departamento',
      monthly_salary: Number(line.employees?.base_salary) || 0,
      days_worked: Number(line.calc_hours) / 8 || 0, // Convertir horas a días
      days_absent: 0, // Calcular si es necesario
      late_days: 0, // Calcular si es necesario
      total_earnings: Number(line.calc_bruto) || 0,
      IHSS: Number(line.calc_ihss) || 0,
      RAP: Number(line.calc_rap) || 0,
      ISR: Number(line.calc_isr) || 0,
      total_deductions: (Number(line.calc_ihss) || 0) + (Number(line.calc_rap) || 0) + (Number(line.calc_isr) || 0),
      total: Number(line.calc_neto) || 0,
      notes_on_ingress: line.edited ? 'Editado' : '',
      notes_on_deductions: ''
    }))

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
