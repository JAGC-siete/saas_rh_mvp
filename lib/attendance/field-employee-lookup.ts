/**
 * Resolve active employee for field attendance (DNI / last5 + optional company_id).
 */

import { createAdminClient } from '../supabase/server'

export type FieldEmployeeMatch = {
  id: string
  name: string
  dni: string
  company_id: string
  work_schedule_id: string | null
  status: string
}

export type FieldEmployeeLookupResult =
  | { ok: true; employee: FieldEmployeeMatch }
  | {
      ok: false
      status: number
      body: Record<string, unknown>
    }

export async function lookupFieldEmployee(params: {
  dni?: string
  last5?: string
  companyId?: string
}): Promise<FieldEmployeeLookupResult> {
  const dniStr = typeof params.dni === 'string' ? params.dni.trim() : ''
  const last5Str = typeof params.last5 === 'string' ? params.last5.trim() : ''
  const companyIdStr = typeof params.companyId === 'string' ? params.companyId.trim() : ''

  if (!dniStr && !last5Str) {
    return { ok: false, status: 400, body: { error: 'Debe enviar dni o last5', code: 'DNI_REQUIRED' } }
  }

  // last5 without company_id is allowed: search first, return 409 + suggestions if ambiguous.
  // Do NOT require company_id a priori (breaks field UX).

  if (dniStr && !/^\d{13}$/.test(dniStr)) {
    return {
      ok: false,
      status: 400,
      body: { error: 'DNI debe tener 13 dígitos', code: 'DNI_INVALID' },
    }
  }

  if (last5Str && !/^\d{5}$/.test(last5Str)) {
    return {
      ok: false,
      status: 400,
      body: { error: 'last5 debe tener 5 dígitos', code: 'LAST5_INVALID' },
    }
  }

  const supabase = createAdminClient()
  let query = supabase
    .from('employees')
    .select('id, name, dni, company_id, work_schedule_id, status, employee_code, role')
    .eq('status', 'active')

  if (dniStr) {
    query = query.eq('dni', dniStr)
  } else {
    query = query.ilike('dni', `%${last5Str}`)
  }

  const { data, error } = await query

  if (error) {
    return { ok: false, status: 500, body: { error: 'Error interno del servidor', code: 'DB_ERROR' } }
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      status: 404,
      body: { error: 'Empleado no encontrado o inactivo', code: 'EMPLOYEE_NOT_FOUND' },
    }
  }

  let employees = data
  if (employees.length > 1 && companyIdStr) {
    employees = employees.filter((e) => e.company_id === companyIdStr)
  }

  if (employees.length === 0) {
    return {
      ok: false,
      status: 404,
      body: { error: 'Empleado no encontrado en la empresa especificada', code: 'EMPLOYEE_NOT_FOUND' },
    }
  }

  if (employees.length > 1) {
    const companyIds = [...new Set(employees.map((e) => e.company_id).filter(Boolean))] as string[]
    let companyInfo: Record<string, { name: string }> = {}
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds)
      if (companies) {
        companies.forEach((c) => {
          companyInfo[c.id] = { name: c.name }
        })
      }
    }

    return {
      ok: false,
      status: 409,
      body: {
        error: 'Múltiples empleados encontrados',
        code: 'AMBIGUOUS_EMPLOYEE',
        requireCompanySelection: true,
        suggestions: employees.map((emp) => ({
          employee_id: emp.id,
          dni: emp.dni,
          name: emp.name,
          employee_code: emp.employee_code,
          company_id: emp.company_id,
          company_name: emp.company_id ? companyInfo[emp.company_id]?.name : undefined,
        })),
      },
    }
  }

  const employee = employees[0]
  if (!employee.company_id) {
    return {
      ok: false,
      status: 500,
      body: {
        error: 'Empleado sin empresa asignada. Contacte a RRHH.',
        code: 'EMPLOYEE_COMPANY_MISSING',
      },
    }
  }

  return {
    ok: true,
    employee: {
      id: employee.id,
      name: employee.name,
      dni: employee.dni || '',
      company_id: employee.company_id,
      work_schedule_id: employee.work_schedule_id,
      status: employee.status || 'active',
    },
  }
}
