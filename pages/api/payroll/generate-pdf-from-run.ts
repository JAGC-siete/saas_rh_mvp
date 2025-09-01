import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
import { generateConsolidatedPayrollPDF, type PlanillaItem } from '../../../lib/payroll/report'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { run_id } = req.query

  if (!run_id || typeof run_id !== 'string') {
    return res.status(400).json({ error: 'run_id es requerido' })
  }

  try {
    const auth = await authenticateUser(req, res, ['can_view_payroll', 'can_export_payroll'])
    if (!auth.success || !auth.user || !auth.userProfile) {
      return res.status(401).json({ error: auth.error || 'Unauthorized', message: auth.message })
    }

    const supabase = createClient(req, res)

    // Obtener información de la corrida de nómina
    const { data: payrollRun, error: runError } = await supabase
      .from('payroll_runs')
      .select('id, company_uuid, year, month, quincena, tipo, status')
      .eq('id', run_id)
      .eq('company_uuid', auth.userProfile.company_id)
      .single()

    if (runError) {
      console.error('Error obteniendo corrida de nómina:', runError)
      return res.status(500).json({ error: 'Error obteniendo corrida de nómina' })
    }

    if (!payrollRun) {
      return res.status(404).json({ error: 'Corrida de nómina no encontrada' })
    }

    // Obtener las líneas de nómina usando la vista efectiva
    const { data: payrollLines, error: linesError } = await supabase
      .from('v_payroll_lines_effective')
      .select('*')
      .eq('run_id', run_id)
      .eq('company_uuid', auth.userProfile.company_id)

    if (linesError) {
      console.error('Error obteniendo líneas de nómina:', linesError)
      return res.status(500).json({ error: 'Error obteniendo líneas de nómina' })
    }

    if (!payrollLines || payrollLines.length === 0) {
      return res.status(404).json({ error: 'No hay líneas de nómina para esta corrida' })
    }

    // Mapear a estructura de PlanillaItem
    const planilla: PlanillaItem[] = payrollLines.map((line: any) => ({
      id: line.employee_code || '',
      name: line.employee_name || '',
      bank: line.bank_name || 'No especificado',
      bank_account: line.bank_account || 'No especificado',
      department: line.department || 'Sin Departamento',
      monthly_salary: Number(line.base_salary) || 0,
      days_worked: Number(line.eff_hours) / 8 || 0, // Convertir horas a días
      days_absent: 0, // Calcular si es necesario
      late_days: 0, // Calcular si es necesario
      total_earnings: Number(line.eff_bruto) || 0,
      IHSS: Number(line.eff_ihss) || 0,
      RAP: Number(line.eff_rap) || 0,
      ISR: Number(line.eff_isr) || 0,
      total_deductions: (Number(line.eff_ihss) || 0) + (Number(line.eff_rap) || 0) + (Number(line.eff_isr) || 0),
      total: Number(line.eff_neto) || 0,
      notes_on_ingress: line.edited ? 'Editado' : '',
      notes_on_deductions: ''
    }))

    const periodo = `${payrollRun.year}-${String(payrollRun.month).padStart(2, '0')}`
    const pdf = await generateConsolidatedPayrollPDF(planilla, periodo, payrollRun.quincena, auth.user?.email)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=planilla_run_${run_id.slice(0, 8)}_${periodo}_q${payrollRun.quincena}.pdf`)
    return res.send(pdf)

  } catch (error: any) {
    console.error('Error generando PDF desde run:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message || 'Error desconocido'
    })
  }
}
