import type { FieldAccessContext } from './field-access'
import { shapeEmployees } from './shape-employee'

export type DeptEmployeeRow = {
  id: string
  name: string
  base_salary?: number
  department_id?: string | null
  status?: string
}

export type DepartmentRow = {
  id: string
  name: string
  description?: string | null
}

export function buildDepartmentStatsPayload(
  departments: DepartmentRow[] | null | undefined,
  employees: DeptEmployeeRow[] | null | undefined,
  fieldCtx: FieldAccessContext
) {
  const departmentStats: Record<string, unknown> = {}
  const summary: Record<string, number> = {
    totalDepartments: departments?.length || 0,
    totalEmployees: employees?.length || 0,
  }

  if (fieldCtx.canViewSalary) {
    summary.totalSalary = 0
    summary.averageSalary = 0
  }

  departments?.forEach((dept) => {
    const deptEmployees =
      employees?.filter((emp) => emp.department_id === dept.id) || []

    const shapedEmployees = shapeEmployees(
      deptEmployees.map((emp) => ({
        id: emp.id,
        name: emp.name,
        status: emp.status,
        base_salary: emp.base_salary,
      })),
      fieldCtx
    )

    const entry: Record<string, unknown> = {
      id: dept.id,
      name: dept.name,
      description: dept.description,
      employeeCount: deptEmployees.length,
      employees: shapedEmployees,
    }

    if (fieldCtx.canViewSalary) {
      const totalSalary = deptEmployees.reduce(
        (sum, emp) => sum + (Number(emp.base_salary) || 0),
        0
      )
      entry.totalSalary = totalSalary
      entry.averageSalary =
        deptEmployees.length > 0 ? totalSalary / deptEmployees.length : 0
      summary.totalSalary = (summary.totalSalary || 0) + totalSalary
    }

    departmentStats[dept.name] = entry
  })

  if (fieldCtx.canViewSalary && summary.totalEmployees > 0) {
    summary.averageSalary = (summary.totalSalary || 0) / summary.totalEmployees
  }

  return { departmentStats, summary }
}
