import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { withGeneralRateLimit } from '../../../lib/security/rate-limiting'

/**
 * Preview API para 13avo y 14avo salario
 *
 * Reglas legales (referencia):
 * - 13avo (Aguinaldo): Promedio salarial del 1 enero al 31 diciembre.
 *   Pago en diciembre.
 * - 14avo: Promedio salarial del 1 julio al 30 junio.
 *   Pago en junio. Días trabajados deben venir de attendance_records.
 *   Requiere mínimo 200 días trabajados en el año.
 * - FÓRMULA ESTRICTA: (Salario_Promedio / 360) * Dias_Laborados_En_Periodo
 *   (Utilizar divisor 360, no 365)
 * - No aplicar deducciones de IHSS ni RAP.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const { year, tipo } = req.query

    if (!year || !tipo) {
      return res.status(400).json({
        error: 'year y tipo son requeridos',
        received: { year, tipo }
      })
    }

    const yearNum = parseInt(year as string)
    const tipoParam = (tipo as string).toUpperCase()

    if (isNaN(yearNum)) {
      return res.status(400).json({
        error: 'year debe ser un número válido',
        received: year
      })
    }

    if (!['13AVO', '14AVO'].includes(tipoParam)) {
      return res.status(400).json({
        error: 'tipo debe ser 13AVO o 14AVO',
        received: tipo
      })
    }

    // Consultar empleados activos de la empresa
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, base_salary, hire_date, termination_date')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('name')

    if (empError) {
      console.error('Error obteniendo empleados 13/14:', empError)
      return res.status(500).json({
        error: 'Error obteniendo empleados',
        details: empError.message
      })
    }

    if (!employees || employees.length === 0) {
      return res.status(200).json({
        rows: [],
        message: 'No hay empleados activos'
      })
    }

    // TODO (fases posteriores):
    // - 13avo: Calcular promedio salarial 1 ene - 31 dic del año desde payroll_records
    // - 14avo: Calcular promedio 1 jul - 30 jun; días trabajados desde attendance_records
    // - Aplicar fórmula: (Salario_Promedio / 360) * Dias_Laborados_En_Periodo
    // - Para 14avo: excluir empleados con < 200 días trabajados

    // Por ahora: respuesta simulado con estructura esperada
    const rows = employees.map((emp: { id: string; name: string; base_salary: number }) => ({
      employee_id: emp.id,
      employeeId: emp.id,
      name: emp.name,
      base_salary: emp.base_salary,
      avgSalary: 0,
      daysWorked: 0,
      days_worked: 0,
      totalAmount: 0,
      amount: 0
    }))

    return res.status(200).json({
      rows,
      year: yearNum,
      tipo: tipoParam
    })
  } catch (err) {
    console.error('Error en preview 13-14 salario:', err)
    const message = err instanceof Error ? err.message : 'Error interno'
    return res.status(500).json({
      error: message
    })
  }
}

export default withGeneralRateLimit(['GET'])(handler)
