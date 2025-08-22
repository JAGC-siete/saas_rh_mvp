import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
import { generateEmployeeReceiptPDF } from '../../../lib/payroll/receipt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['POST', 'GET'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await authenticateUser(req, res, ['can_view_payroll', 'can_export_payroll'])
    if (!auth.success || !auth.user || !auth.userProfile) {
      return res.status(401).json({ error: auth.error || 'Unauthorized', message: auth.message })
    }

    const { periodo, quincena, employeeId } = (req.method === 'GET') ? (req.query as any) : (req.body || {})
    if (!periodo || !/^[0-9]{4}-[0-9]{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (YYYY-MM)' })
    }
    if (![1, 2].includes(Number(quincena))) {
      return res.status(400).json({ error: 'Quincena inválida (1 o 2)' })
    }
    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId es requerido' })
    }

    const supabase = createClient(req, res)
    const [year, month] = periodo.split('-').map(Number)
    const ultimoDia = new Date(year, month, 0).getDate()
    const fechaInicio = Number(quincena) === 1 ? `${periodo}-01` : `${periodo}-16`
    const fechaFin = Number(quincena) === 1 ? `${periodo}-15` : `${periodo}-${ultimoDia}`

    const { data: record, error } = await supabase
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
      .eq('employee_id', employeeId)
      .eq('period_start', fechaInicio)
      .eq('period_end', fechaFin)
      .single()

    if (error || !record) {
      return res.status(404).json({ error: 'Empleado no encontrado en la nómina' })
    }

    if (auth.userProfile.company_id && (record.employees?.company_id || null) !== auth.userProfile.company_id) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    const pdf = await generateEmployeeReceiptPDF({
      employee_code: record.employees?.employee_code,
      employee_name: record.employees?.name,
      department: record.employees?.department,
      position: record.employees?.position,
      period_start: record.period_start,
      period_end: record.period_end,
      days_worked: Number(record.days_worked) || 0,
      base_salary: Number(record.base_salary) / 2 || 0,
      income_tax: Number(record.income_tax) || 0,
      professional_tax: Number(record.professional_tax) || 0,
      social_security: Number(record.social_security) || 0,
      total_deductions: Number(record.total_deductions) || 0,
      net_salary: Number(record.net_salary) || 0,
      bank_name: record.employees?.bank_name,
      bank_account: record.employees?.bank_account
    }, periodo, Number(quincena))

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=recibo_${record.employees?.employee_code || 'empleado'}_${periodo}_q${quincena}.pdf`)
    return res.send(pdf)
  } catch (error) {
    console.error('Error generando recibo:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

