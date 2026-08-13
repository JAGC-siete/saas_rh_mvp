import type { CommercialPlanType } from './plans'

/**
 * Mapeo ventas (empleados cotizados) → plan comercial en `companies.plan_type`.
 * Debe mantenerse alineado con `ventas_employees_to_plan_type` en Postgres.
 */
export function planTypeFromEmployeesCount(employeesCount: number): CommercialPlanType {
  if (employeesCount <= 50) return 'basic'
  if (employeesCount <= 100) return 'premium'
  return 'enterprise'
}
