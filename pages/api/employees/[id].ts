import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-utils'
import { resolveFieldAccessContext } from '../../../lib/security/field-access'
import {
  buildEmployeeWritePayload,
  shapeEmployee,
} from '../../../lib/security/shape-employee'

/**
 * Legacy route: PUT/PATCH/DELETE /api/employees/[id]
 * Prefer /api/employees/update for new clients.
 * Uses the same field-level write filter and response shaping as update.ts.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await authenticateUser(req, res, ['can_manage_employees'])
    if (!auth.success) {
      const status = auth.error === 'Permisos insuficientes' ? 403 : 401
      return res.status(status).json({ error: auth.error, message: auth.message })
    }

    const companyId = auth.userProfile?.company_id
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' })
    }

    const supabase = createAdminClient()
    const fieldCtx = await resolveFieldAccessContext(auth.userProfile, supabase)
    const employeeId = String(req.query.id || '')

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee id is required' })
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('employees')
      .select('id, company_id')
      .eq('id', employeeId)
      .single()

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Employee not found' })
    }
    if (existing.company_id !== companyId) {
      return res.status(403).json({ error: 'Access denied: Employee does not belong to your company' })
    }

    if (req.method === 'DELETE') {
      const { error: deleteError } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId)
        .eq('company_id', companyId)

      if (deleteError) throw deleteError
      return res.status(204).end()
    }

    const body = (req.body || {}) as Record<string, unknown>
    let updateData: Record<string, unknown>
    try {
      updateData = buildEmployeeWritePayload(body, fieldCtx)
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'INVALID_BASE_SALARY') {
        return res.status(400).json({
          error: 'Invalid base_salary',
          message: 'El salario base debe ser un número válido mayor a cero.',
        })
      }
      throw err
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    const { data: updatedEmployee, error: updateError } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', employeeId)
      .eq('company_id', companyId)
      .select(
        `
        *,
        departments!employees_department_id_fkey(name)
      `
      )
      .single()

    if (updateError) throw updateError
    return res.json({ employee: shapeEmployee(updatedEmployee, fieldCtx) })
  } catch (error: unknown) {
    console.error('Employee API error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
