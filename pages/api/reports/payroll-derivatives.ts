import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { calculateINFOP } from '../../../lib/payroll/employer-contributions'

type Row = {
  employee_name: string
  dni: string
  position: string
  base_salary_used: number
  employee_amount: number
  employer_amount?: number
}

function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'))
  return Number.isFinite(n) ? n : 0
}

/**
 * GET /api/reports/payroll-derivatives?run_id=...&concept=...
 *
 * Concept codes supported:
 * - IHSS: employee from payroll_run_lines.eff_ihss, employer from metadata.ihss_patronal
 * - RAP: employee from payroll_run_lines.eff_rap, employer from metadata.rap_patronal
 * - INFOP: employer total = 1% of total bruto (if company.settings.is_infop_liable), per-employee amounts 0
 * - CUSTOM_<KEY>: employee from metadata[<key>], no employer
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' })

    const runId = typeof req.query.run_id === 'string' ? req.query.run_id : ''
    const concept = typeof req.query.concept === 'string' ? req.query.concept : ''
    if (!runId) return res.status(400).json({ error: 'run_id is required' })
    if (!concept) return res.status(400).json({ error: 'concept is required' })

    const { data: run, error: runErr } = await supabase
      .from('payroll_runs')
      .select('id, year, month, quincena, tipo, status')
      .eq('id', runId)
      .eq('company_id', companyId)
      .single()

    if (runErr || !run) return res.status(404).json({ error: 'Payroll run not found' })

    const { data: lines, error: linesErr } = await supabase
      .from('payroll_run_lines')
      .select(
        `
          id,
          employee_id,
          eff_ihss,
          eff_rap,
          eff_bruto,
          metadata,
          employees!payroll_run_lines_employee_id_fkey(
            name,
            dni,
            employee_code,
            position,
            role,
            base_salary
          )
        `
      )
      .eq('run_id', runId)
      .eq('company_id', companyId)

    if (linesErr) return res.status(500).json({ error: 'Error fetching run lines', details: linesErr.message })

    const conceptUpper = concept.toUpperCase()
    const isInfop = conceptUpper === 'INFOP'
    const isIhss = conceptUpper === 'IHSS'
    const isRap = conceptUpper === 'RAP'
    const isCustom = conceptUpper.startsWith('CUSTOM_')
    const customKey = isCustom ? concept.slice('CUSTOM_'.length).toLowerCase() : null

    let isInfopLiable = false
    if (isInfop) {
      const { data: company } = await supabase.from('companies').select('settings').eq('id', companyId).single()
      isInfopLiable = (company?.settings as Record<string, unknown>)?.is_infop_liable === true
    }

    const rows: Row[] = []
    let totalEmployee = 0
    let totalEmployer = 0
    let totalBruto = 0

    for (const line of lines || []) {
      const emp = (line.employees || {}) as any
      const meta = (line.metadata || {}) as Record<string, unknown>
      const baseSalaryUsed = toNum(meta.base_salary_used ?? emp.base_salary)
      const employeeName = String(emp.name || '')
      const dni = String(emp.dni || emp.employee_code || '')
      const position = String(emp.position || emp.role || '')

      const effBruto = toNum((line as any).eff_bruto)
      totalBruto += effBruto

      let employeeAmount = 0
      let employerAmount: number | undefined = undefined

      if (isIhss) {
        employeeAmount = toNum((line as any).eff_ihss)
        employerAmount = toNum(meta.ihss_patronal)
      } else if (isRap) {
        employeeAmount = toNum((line as any).eff_rap)
        employerAmount = toNum(meta.rap_patronal)
      } else if (isInfop) {
        employeeAmount = 0
      } else if (isCustom && customKey) {
        employeeAmount = toNum(meta[customKey])
      } else {
        return res.status(400).json({ error: 'Unsupported concept' })
      }

      totalEmployee += employeeAmount
      if (employerAmount != null) totalEmployer += employerAmount

      rows.push({
        employee_name: employeeName,
        dni,
        position,
        base_salary_used: baseSalaryUsed,
        employee_amount: Math.round(employeeAmount * 100) / 100,
        ...(employerAmount != null ? { employer_amount: Math.round(employerAmount * 100) / 100 } : {})
      })
    }

    if (isInfop) {
      totalEmployer = isInfopLiable ? Math.round(calculateINFOP(totalBruto) * 100) / 100 : 0
    }

    return res.status(200).json({
      success: true,
      run: {
        id: run.id,
        year: run.year,
        month: run.month,
        quincena: run.quincena,
        tipo: run.tipo,
        status: run.status
      },
      concept: conceptUpper,
      rows,
      totals: {
        total_employee: Math.round(totalEmployee * 100) / 100,
        total_employer: Math.round(totalEmployer * 100) / 100,
        total_bruto: Math.round(totalBruto * 100) / 100
      },
      meta: isInfop ? { is_infop_liable: isInfopLiable } : undefined
    })
  } catch (e: any) {
    return res.status(e?.message === 'UNAUTHORIZED' ? 401 : 500).json({ error: e?.message || 'Internal server error' })
  }
}

