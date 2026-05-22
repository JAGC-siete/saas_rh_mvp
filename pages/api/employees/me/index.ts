import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import {
  assertEmployeePortalEnabled,
  resolveEmployeeAndCompanyId,
} from '../../../../lib/employee-portal/company-settings'
import { getTodayInHonduras } from '../../../../lib/timezone'
import { loadEffectiveWorkSchedule, workScheduleToPortalPayload } from '../../../../lib/attendance/load-effective-schedule'

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
    // Create Supabase client (handles auth automatically via cookies)
    const supabase = createClient(req, res)
    
    // Get current user from Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const ctx = await resolveEmployeeAndCompanyId(supabase, user)
    if (!ctx) {
      return res.status(401).json({ error: 'Datos de empleado no encontrados' })
    }
    if (!(await assertEmployeePortalEnabled(supabase, ctx.companyId, res))) {
      return
    }
    const { employeeId, companyId } = ctx
    if (!companyId) {
      return res.status(401).json({ error: 'Empresa no encontrada' })
    }

    // Get detailed employee information (RLS will filter automatically)
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
        work_schedule_id,
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
      .eq('id', employeeId)
      .single()

    if (detailsError || !employeeDetails) {
      logger.error('Failed to get employee details', detailsError)
      return res.status(404).json({ error: 'Empleado no encontrado' })
    }

    const admin = createAdminClient()
    const effectiveLoaded = await loadEffectiveWorkSchedule({
      supabase: admin,
      companyId,
      employeeId,
      date: getTodayInHonduras(),
      fallbackWorkScheduleId: employeeDetails.work_schedule_id,
    })
    const portalSchedule = workScheduleToPortalPayload(
      effectiveLoaded.schedule ?? (employeeDetails.work_schedules as any),
      effectiveLoaded.result.found ? effectiveLoaded : null
    )

    // Mask sensitive information
    const dniMasked = employeeDetails.dni?.length > 9 
      ? `${employeeDetails.dni.substring(0, 4)}****${employeeDetails.dni.slice(-5)}`
      : `****${employeeDetails.dni?.slice(-5) || ''}`

    // Log access for audit
    logger.info('Employee accessed own profile', {
      employeeId: employeeId,
      employeeName: employeeDetails.name,
      userId: user.id,
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
        department: (employeeDetails.departments as any) ? {
          id: (employeeDetails.departments as any).id,
          name: (employeeDetails.departments as any).name
        } : undefined,
        work_schedule: portalSchedule as EmployeeProfileResponse['employee']['work_schedule'],
        base_salary_masked: true, // Indicate salary is not exposed
        status: employeeDetails.status ?? 'active'
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
