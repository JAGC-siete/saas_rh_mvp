import { NextApiRequest, NextApiResponse } from 'next'
import { requireEmployeeAuth } from '../../../../lib/auth/employee-auth'
import { logger } from '../../../../lib/logger'

interface EmployeeProfileResponse {
  employee: {
    id: string
    name: string
    dni_masked: string
    role: string
    email?: string
    phone?: string
    hire_date?: string
    department?: {
      id: string
      name: string
    }
    work_schedule?: {
      id: string
      name: string
      monday_start?: string
      monday_end?: string
      tuesday_start?: string
      tuesday_end?: string
      wednesday_start?: string
      wednesday_end?: string
      thursday_start?: string
      thursday_end?: string
      friday_start?: string
      friday_end?: string
      saturday_start?: string
      saturday_end?: string
      sunday_start?: string
      sunday_end?: string
    }
    base_salary_masked: boolean // Don't expose actual salary
    status: string
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Authenticate employee
    const { supabase, employee } = await requireEmployeeAuth(req, res)

    // Get detailed employee information
    const { data: employeeDetails, error: detailsError } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        dni,
        role,
        email,
        phone,
        hire_date,
        base_salary,
        status,
        departments:department_id(
          id,
          name
        ),
        work_schedules:work_schedule_id(
          id,
          name,
          monday_start,
          monday_end,
          tuesday_start,
          tuesday_end,
          wednesday_start,
          wednesday_end,
          thursday_start,
          thursday_end,
          friday_start,
          friday_end,
          saturday_start,
          saturday_end,
          sunday_start,
          sunday_end
        )
      `)
      .eq('id', employee.id)
      .single()

    if (detailsError || !employeeDetails) {
      logger.error('Failed to get employee details', detailsError)
      return res.status(404).json({ error: 'Empleado no encontrado' })
    }

    // Mask sensitive information
    const dniMasked = employeeDetails.dni.length > 9 
      ? `${employeeDetails.dni.substring(0, 4)}****${employeeDetails.dni.slice(-5)}`
      : `****${employeeDetails.dni.slice(-5)}`

    // Log access for audit
    logger.info('Employee accessed own profile', {
      employeeId: employee.id,
      employeeName: employee.name,
      action: 'view_profile'
    })

    const response: EmployeeProfileResponse = {
      employee: {
        id: employeeDetails.id,
        name: employeeDetails.name,
        dni_masked: dniMasked,
        role: employeeDetails.role || 'Empleado',
        email: employeeDetails.email || undefined,
        phone: employeeDetails.phone || undefined,
        hire_date: employeeDetails.hire_date || undefined,
        department: employeeDetails.departments ? {
          id: employeeDetails.departments.id,
          name: employeeDetails.departments.name
        } : undefined,
        work_schedule: employeeDetails.work_schedules ? {
          id: employeeDetails.work_schedules.id,
          name: employeeDetails.work_schedules.name,
          monday_start: employeeDetails.work_schedules.monday_start,
          monday_end: employeeDetails.work_schedules.monday_end,
          tuesday_start: employeeDetails.work_schedules.tuesday_start,
          tuesday_end: employeeDetails.work_schedules.tuesday_end,
          wednesday_start: employeeDetails.work_schedules.wednesday_start,
          wednesday_end: employeeDetails.work_schedules.wednesday_end,
          thursday_start: employeeDetails.work_schedules.thursday_start,
          thursday_end: employeeDetails.work_schedules.thursday_end,
          friday_start: employeeDetails.work_schedules.friday_start,
          friday_end: employeeDetails.work_schedules.friday_end,
          saturday_start: employeeDetails.work_schedules.saturday_start,
          saturday_end: employeeDetails.work_schedules.saturday_end,
          sunday_start: employeeDetails.work_schedules.sunday_start,
          sunday_end: employeeDetails.work_schedules.sunday_end
        } : undefined,
        base_salary_masked: true, // Indicate salary is not exposed
        status: employeeDetails.status
      }
    }

    return res.status(200).json(response)

  } catch (error) {
    if (error instanceof Error && error.message.startsWith('EMPLOYEE_')) {
      // Authentication error already handled
      return
    }

    logger.error('Employee profile API error', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
