/**
 * Calcula el salario base del período según frecuencia de pago y tipo de empleado.
 * Sustituye divisiones fijas (base_salary / 2) por lógica parametrizada.
 */

import type { PaymentFrequency } from './resolve-config'

export interface EmployeeForPeriodSalary {
  base_salary: number
  pay_type?: 'fixed' | 'hourly' | null
}

export interface CalculatePeriodBaseSalaryOptions {
  /** Horas trabajadas en el período (requerido si pay_type === 'hourly') */
  hoursWorked?: number
  /** Metadata del registro (puede contener hours_worked, total_hours_worked) */
  metadata?: Record<string, unknown>
}

/**
 * Calcula el salario base del período.
 *
 * - Fixed + mensual: base_salary íntegro
 * - Fixed + quincenal: base_salary / 2
 * - Fixed + semanal: base_salary / 4
 * - Hourly: base_salary (precio por hora) * hours_worked
 *   - base_salary NO se divide; es la tarifa horaria.
 *   - Busca horas en options.hoursWorked o options.metadata?.hours_worked o metadata?.total_hours_worked
 */
export function calculatePeriodBaseSalary(
  employee: EmployeeForPeriodSalary,
  frequency: PaymentFrequency,
  options?: CalculatePeriodBaseSalaryOptions
): number {
  const baseSalary = Number(employee?.base_salary) || 0
  const payType = employee?.pay_type ?? 'fixed'

  if (payType === 'hourly') {
    const hoursWorked =
      options?.hoursWorked ??
      Number((options?.metadata as Record<string, unknown>)?.hours_worked) ??
      Number((options?.metadata as Record<string, unknown>)?.total_hours_worked) ??
      0

    if (hoursWorked <= 0) return 0

    // salario_bruto = base_salary (tarifa/hora) * hours_worked
    return baseSalary * hoursWorked
  }

  // Fixed: división según frecuencia
  switch (frequency) {
    case 'mensual':
      return baseSalary
    case 'quincenal':
      return baseSalary / 2
    case 'semanal':
      return baseSalary / 4
    default:
      return baseSalary / 2
  }
}

/**
 * Mapea period_type de BD o payment_frequency a PaymentFrequency.
 */
export function normalizeFrequency(
  value: string | null | undefined
): PaymentFrequency {
  const v = (value || '').toLowerCase()
  if (v === 'mensual' || v === 'monthly') return 'mensual'
  if (v === 'quincenal' || v === 'biweekly') return 'quincenal'
  if (v === 'semanal' || v === 'weekly') return 'semanal'
  return 'quincenal'
}
