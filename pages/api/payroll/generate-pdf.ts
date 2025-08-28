import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
import { generateConsolidatedPayrollPDF, type PlanillaItem } from '../../../lib/payroll/report'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await authenticateUser(req, res, ['can_view_payroll', 'can_export_payroll'])
    if (!auth.success || !auth.user || !auth.userProfile) {
      return res.status(401).json({ error: auth.error || 'Unauthorized', message: auth.message })
    }

    const { periodo, quincena, draftData } = req.body

    if (!periodo || !/^[0-9]{4}-[0-9]{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (YYYY-MM)' })
    }
    if (![1, 2].includes(Number(quincena))) {
      return res.status(400).json({ error: 'Quincena inválida (1 o 2)' })
    }
    if (!draftData || !Array.isArray(draftData.rows) || draftData.rows.length === 0) {
      return res.status(400).json({ error: 'Datos del draft son requeridos' })
    }

    const supabase = createClient(req, res)
    const companyId = auth.userProfile.company_id

    // Obtener información de empleados para completar los datos
    const employeeIds = draftData.rows.map((row: any) => row.employee_id)
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, employee_code, department, position, bank_name, bank_account')
      .in('id', employeeIds)
      .eq('company_id', companyId)

    if (empError) {
      return res.status(500).json({ error: 'Error cargando información de empleados' })
    }

    if (!employees || employees.length === 0) {
      return res.status(400).json({ error: 'No se encontraron empleados válidos' })
    }

    // Mapear datos del draft a estructura de PlanillaItem
    const planilla: PlanillaItem[] = draftData.rows.map((row: any) => {
      const employee = employees.find(e => e.id === row.employee_id)
      return {
        id: employee?.employee_code || row.employee_code || '',
        name: employee?.name || row.name || '',
        bank: employee?.bank_name || 'No especificado',
        bank_account: employee?.bank_account || 'No especificado',
        department: employee?.department || 'Sin Departamento',
        monthly_salary: Number(row.base_salary) || 0,
        days_worked: Number(row.days_worked) || 0,
        days_absent: Number(row.days_absent) || 0,
        late_days: Number(row.late_days) || 0,
        total_earnings: Number(row.gross_salary) || 0,
        IHSS: Number(row.ihss) || 0,
        RAP: Number(row.rap) || 0,
        ISR: Number(row.isr) || 0,
        total_deductions: Number(row.total_deductions) || 0,
        total: Number(row.net_salary) || 0,
        notes_on_ingress: row.adj_bonus ? `Bono: L. ${row.adj_bonus.toFixed(2)}` : '',
        notes_on_deductions: row.adj_discount ? `Descuento: L. ${row.adj_discount.toFixed(2)}` : ''
      }
    })

    console.log(`Generando PDF desde draft: ${planilla.length} empleados para ${periodo} Q${quincena}`)

    // Generar PDF consolidado
    const pdf = await generateConsolidatedPayrollPDF(planilla, periodo, Number(quincena), auth.user?.email)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=planilla_draft_${periodo}_q${quincena}.pdf`)
    return res.send(pdf)

  } catch (error: any) {
    console.error('Error generando PDF desde draft:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message || 'Error desconocido'
    })
  }
}
