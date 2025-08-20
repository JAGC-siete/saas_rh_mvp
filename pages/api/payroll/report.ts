import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
import { generateConsolidatedPayrollPDF, type PlanillaItem } from '../../../lib/payroll/report'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['POST', 'GET'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await authenticateUser(req, res, ['can_view_payroll', 'can_export_payroll'])
    if (!auth.success || !auth.user || !auth.userProfile) {
      return res.status(401).json({ error: auth.error || 'Unauthorized', message: auth.message })
    }

    const supabase = createClient(req, res)
    const { periodo, quincena } = (req.method === 'GET') ? (req.query as any) : (req.body || {})

    if (!periodo || !/^[0-9]{4}-[0-9]{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (YYYY-MM)' })
    }
    if (![1, 2].includes(Number(quincena))) {
      return res.status(400).json({ error: 'Quincena inválida (1 o 2)' })
    }

    const [year, month] = periodo.split('-').map(Number)
    const ultimoDia = new Date(year, month, 0).getDate()
    const fechaInicio = Number(quincena) === 1 ? `${periodo}-01` : `${periodo}-16`
    const fechaFin = Number(quincena) === 1 ? `${periodo}-15` : `${periodo}-${ultimoDia}`

    // Obtener registros de nómina persistidos para el período y quincena
    const { data: payrollRecords, error: payrollError } = await supabase
      .from('payroll_records')
      .select(`
        *,
        employees:employee_id (
          name,
          employee_code,
          department,
          position,
          bank_name,
          bank_account,
          company_id
        )
      `)
      .eq('period_start', fechaInicio)
      .eq('period_end', fechaFin)
      .order('created_at', { ascending: false })

    if (payrollError) {
      console.error('Error obteniendo registros de nómina:', payrollError)
      return res.status(500).json({ error: 'Error obteniendo registros de nómina' })
    }

    if (!payrollRecords || payrollRecords.length === 0) {
      return res.status(404).json({ error: 'No hay registros de nómina para el período indicado' })
    }

    // Si el usuario pertenece a una empresa, validar que los registros correspondan
    if (auth.userProfile.company_id) {
      const anyOtherCompany = payrollRecords.some((r: any) => (r.employees?.company_id || null) !== auth.userProfile!.company_id)
      if (anyOtherCompany) {
        return res.status(403).json({ error: 'No autorizado para acceder a registros de otra empresa' })
      }
    }

    // Mapear a estructura de PlanillaItem
    const planilla: PlanillaItem[] = payrollRecords.map((r: any) => ({
      id: r.employees?.employee_code || '',
      name: r.employees?.name || '',
      bank: r.employees?.bank_name || '',
      bank_account: r.employees?.bank_account || '',
      department: r.employees?.department || 'Sin Departamento',
      monthly_salary: Number(r.base_salary) || 0,
      days_worked: Number(r.days_worked) || 0,
      days_absent: Number(r.days_absent) || 0,
      late_days: Number(r.late_days) || 0,
      total_earnings: Number(r.gross_salary) || 0,
      IHSS: Number(r.social_security) || 0,
      RAP: Number(r.professional_tax) || 0,
      ISR: Number(r.income_tax) || 0,
      total_deductions: Number(r.total_deductions) || 0,
      total: Number(r.net_salary) || 0,
      notes_on_ingress: r.notes_on_ingress || '',
      notes_on_deductions: r.notes_on_deductions || ''
    }))

    const pdf = await generateConsolidatedPayrollPDF(planilla, periodo, Number(quincena), auth.user?.email)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=planilla_paragon_${periodo}_q${quincena}.pdf`)
    return res.send(pdf)
  } catch (error) {
    console.error('Error generando reporte PDF:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

