import type { Employee } from './employee'

/** Employee record after API field-level shaping (salary may be omitted). */
export type EmployeeShaped = Omit<Employee, 'base_salary'> & {
  base_salary?: number
  hourly_rate_reference?: number
  base_salary_masked?: boolean
}

export function isSalaryMasked(employee: Pick<EmployeeShaped, 'base_salary' | 'base_salary_masked'>): boolean {
  return employee.base_salary_masked === true || employee.base_salary === undefined
}
