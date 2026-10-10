import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { createEmployeeSalaryClient } from '../../../lib/security/employee-data-access'
import { motivoSalidaEnum } from '../../../lib/payroll/cesantias-schema'
import {
  calculateEmployeeSeverance,
  SEVERANCE_ERROR_MESSAGES
} from '../../../lib/payroll/severance-for-employee'
import { logger } from '../../../lib/logger'

const bodySchema = z.object({
  employeeId: z.string().uuid(),
  terminationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  motivoSalida: motivoSalidaEnum,
  preavisoGozado: z.boolean().optional(),
  montoRapAcumulado: z.number().min(0).optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { companyId } = await requireCompanyAccess(req, res)

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Elige el empleado, la fecha de terminación y el motivo de salida.'
      })
    }
    const { employeeId, terminationDate, motivoSalida, preavisoGozado, montoRapAcumulado } = parsed.data

    const { data: employee, error: empError } = await createEmployeeSalaryClient()
      .from('employees')
      .select('name, dni, hire_date, base_salary')
      .eq('id', employeeId)
      .eq('company_id', companyId)
      .maybeSingle()

    if (empError) {
      logger.error('Error loading employee for severance', { error: empError, companyId, employeeId })
      return res.status(500).json({ error: 'Error calculating severance' })
    }
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found', message: 'No encontramos ese empleado.' })
    }

    const calc = calculateEmployeeSeverance(employee, {
      fechaEgreso: terminationDate,
      motivoSalida,
      preavisoGozado,
      montoRapAcumulado
    })
    if (!calc.ok) {
      return res.status(422).json({ error: calc.error, message: SEVERANCE_ERROR_MESSAGES[calc.error] })
    }

    return res.status(200).json({
      success: true,
      data: {
        employee_name: employee.name,
        dni: employee.dni,
        hire_date: employee.hire_date,
        termination_date: terminationDate,
        ...calc.result
      }
    })
  } catch (error: any) {
    logger.error('Reports severance API error', { error, message: error.message })

    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return res.status(500).json({
      error: error.message || 'Internal server error'
    })
  }
}
