import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { withGeneralRateLimit } from '../../../lib/security/rate-limiting'
import { createEmployeeSalaryClient } from '../../../lib/security/employee-data-access'
import { buildBenefitPreview, type BenefitTipo } from '../../../lib/payroll/thirteenth-fourteenth/preview'

/**
 * Preview API para 13avo y 14avo salario (activos, salario base, sin deducciones).
 * - 13avo de `year`: 1 ene – 31 dic de `year`.
 * - 14avo de `year`: el que se paga en junio de `year` (1 jul `year - 1` – 30 jun `year`).
 * Fórmula: (salario base / 360) × días en período (año comercial).
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    const salaryClient = createEmployeeSalaryClient()

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
    const { data: employees, error: empError } = await salaryClient
      .from('employees')
      .select('id, name, base_salary, hire_date')
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

    const preview = buildBenefitPreview(employees ?? [], tipoParam as BenefitTipo, yearNum)

    return res.status(200).json({
      ...preview,
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
