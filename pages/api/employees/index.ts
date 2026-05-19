import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'
import { normalizeEmployeeData } from '../../../lib/utils/normalize-employee-data'
import { resolveFieldAccessContext, userHasPermission } from '../../../lib/security/field-access'
import {
  buildEmployeeWritePayload,
  shapeEmployee,
  shapeEmployees,
  validateCreateSalaryRequirement,
} from '../../../lib/security/shape-employee'
import { createEmployeeSalaryClient } from '../../../lib/security/employee-data-access'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await requireCompanyAccess(req, res)
    const { supabase, companyId, userProfile } = auth

    if (!companyId) {
      return res.status(400).json({ error: 'Company access required' })
    }

    const adminClient = createAdminClient()
    const salaryClient = createEmployeeSalaryClient()
    const fieldCtx = await resolveFieldAccessContext(userProfile, adminClient)

    switch (req.method) {
      case 'GET': {
        if (!userHasPermission(userProfile, 'can_view_employees')) {
          return res.status(403).json({ error: 'Insufficient permissions to view employees' })
        }

        const {
          order = 'name',
          status,
          department_id,
        } = req.query as {
          order?: string
          status?: string
          department_id?: string
        }

        const sortColumn = typeof order === 'string' && order.trim() ? order.trim() : 'name'

        let query = salaryClient
          .from('employees')
          .select(`
            *,
            departments!employees_department_id_fkey(name),
            work_schedules!employees_work_schedule_id_fkey(name, monday_start, monday_end)
          `)
          .eq('company_id', companyId)
          .order(sortColumn, { ascending: true })

        if (status && typeof status === 'string') {
          query = query.eq('status', status)
        }
        if (department_id && typeof department_id === 'string') {
          query = query.eq('department_id', department_id)
        }

        const { data: employees, error: fetchError } = await query
        if (fetchError) throw fetchError

        return res.json({ employees: shapeEmployees(employees || [], fieldCtx) })
      }

      case 'POST': {
        if (!userHasPermission(userProfile, 'can_manage_employees')) {
          return res.status(403).json({ error: 'Insufficient permissions to manage employees' })
        }

        const body = (req.body || {}) as Record<string, unknown>
        const salaryCheck = validateCreateSalaryRequirement(body, fieldCtx)
        if (!salaryCheck.ok) {
          return res.status(salaryCheck.error === 'Insufficient permissions' ? 403 : 400).json({
            error: salaryCheck.error,
            message: salaryCheck.message,
          })
        }

        const {
          name,
          email,
          phone,
          employee_code,
          position,
          department_id,
          base_salary,
          hire_date,
        } = body

        if (!name || typeof name !== 'string') {
          return res.status(400).json({ error: 'Employee name is required' })
        }

        const employeeData = normalizeEmployeeData({
          company_id: companyId,
          name,
          email,
          phone,
          employee_code,
          position,
          department_id,
          base_salary: base_salary as number,
          hire_date,
        })

        const { data: newEmployee, error: createError } = await salaryClient
          .from('employees')
          .insert([employeeData])
          .select(`
            *,
            departments!employees_department_id_fkey(name)
          `)
          .single()

        if (createError) throw createError
        return res.status(201).json({ employee: shapeEmployee(newEmployee, fieldCtx) })
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Employees API error:', error)

    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (error.message === 'PROFILE_REQUIRED') {
      return res.status(403).json({ error: 'User profile required' })
    }
    if (error.message === 'COMPANY_ACCESS_REQUIRED') {
      return res.status(400).json({
        error: 'Company access required. Please contact administrator to assign you to a company.',
      })
    }

    return res.status(500).json({
      error: error.message || 'Internal server error',
    })
  }
}
