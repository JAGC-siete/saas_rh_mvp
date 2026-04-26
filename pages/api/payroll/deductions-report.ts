import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { getCustomFields } from '../../../lib/payroll-client-specific'

/**
 * GET /api/payroll/deductions-report
 * Report of custom deductions by period, employee, and type.
 * Query params: year, month, quincena, tipo (optional), run_id (optional)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId: authCompanyId, role } = await requireCompanyAccess(req, res)
    const companyId = authCompanyId ?? (req.query.company_id as string)
    if (!companyId) {
      return res.status(400).json({
        error: 'company_id es requerido',
        message: 'Debe especificar la empresa (company_id en query para super_admin)'
      })
    }

    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para ver el reporte de deducciones'
      })
    }

    const { year, month, quincena, tipo, run_id } = req.query as Record<string, string>

    if (!year || !month || !quincena) {
      return res.status(400).json({
        error: 'Parámetros requeridos',
        message: 'year, month y quincena son requeridos'
      })
    }

    const yearNum = parseInt(year, 10)
    const monthNum = parseInt(month, 10)
    const quincenaNum = parseInt(quincena, 10)
    if (isNaN(yearNum) || isNaN(monthNum) || isNaN(quincenaNum) ||
        monthNum < 1 || monthNum > 12 || ![1, 2].includes(quincenaNum)) {
      return res.status(400).json({ error: 'Parámetros inválidos' })
    }

    let runIds: string[] = []
    if (run_id) {
      let query = supabase
        .from('payroll_runs')
        .select('id')
        .eq('id', run_id)
        .eq('company_id', companyId)
      if (tipo) query = query.eq('tipo', tipo)
      const { data: run, error: runErr } = await query.single()
      if (runErr || !run) {
        return res.status(404).json({ error: 'Corrida no encontrada' })
      }
      runIds = [run.id]
    } else {
      let query = supabase
        .from('payroll_runs')
        .select('id')
        .eq('company_id', companyId)
        .eq('year', yearNum)
        .eq('month', monthNum)
        .eq('quincena', quincenaNum)
        .in('status', ['authorized', 'edited', 'distributed'])
      if (tipo) query = query.eq('tipo', tipo)
      const { data: runs, error: runsErr } = await query
      if (runsErr) {
        return res.status(500).json({ error: 'Error obteniendo corridas' })
      }
      runIds = (runs || []).map((r: any) => r.id)
    }

    if (runIds.length === 0) {
      return res.status(200).json({
        runs: [],
        deductions: [],
        summary: { total_deducciones: 0, empleados: 0, campos: 0 }
      })
    }

    const { data: lines, error: linesErr } = await supabase
      .from('payroll_run_lines')
      .select(`
        id,
        run_id,
        employee_id,
        metadata,
        eff_bruto,
        eff_neto,
        employees!payroll_run_lines_employee_id_fkey(name, dni, employee_code)
      `)
      .in('run_id', runIds)
      .eq('company_id', companyId)

    if (linesErr) {
      return res.status(500).json({ error: 'Error obteniendo líneas' })
    }

    const fieldLabels = (await getCustomFields(companyId, supabase)) || {}

    const deductions: Array<{
      run_id: string
      run_line_id: string
      employee_id: string
      employee_name: string
      employee_dni: string
      field_key: string
      field_label: string
      monto: number
    }> = []

    let totalDeducciones = 0

    for (const line of lines || []) {
      const meta = (line.metadata || {}) as Record<string, unknown>
      const employeeName = (line.employees as any)?.name || ''
      const employeeDni = (line.employees as any)?.dni || (line.employees as any)?.employee_code || ''

      for (const [key, value] of Object.entries(meta)) {
        if (key === '_deduction_plan_ids') continue
        const num = typeof value === 'number' ? value : parseFloat(String(value || 0))
        if (!isNaN(num) && num > 0) {
          deductions.push({
            run_id: line.run_id,
            run_line_id: line.id,
            employee_id: line.employee_id,
            employee_name: employeeName,
            employee_dni: employeeDni,
            field_key: key,
            field_label: fieldLabels[key] || key,
            monto: num
          })
          totalDeducciones += num
        }
      }
    }

    const empleadosSet = new Set(deductions.map(d => d.employee_id))
    const camposSet = new Set(deductions.map(d => d.field_key))

    return res.status(200).json({
      runs: runIds,
      deductions,
      summary: {
        total_deducciones: Math.round(totalDeducciones * 100) / 100,
        empleados: empleadosSet.size,
        campos: camposSet.size
      }
    })
  } catch (error: any) {
    console.error('Error en deductions-report:', error)
    return res.status(500).json({
      error: error?.message || 'Error interno del servidor'
    })
  }
}
