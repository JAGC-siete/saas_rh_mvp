import { calcularLiquidacionHonduras, type LiquidacionResult, type MotivoSalida } from './cesantias'
import { parseDateYmd } from './thirteenth-fourteenth/calendar'

export interface SeveranceEmployee {
  hire_date: string | null
  base_salary: number | null
}

export interface SeveranceParams {
  fechaEgreso: string
  motivoSalida: MotivoSalida
  preavisoGozado?: boolean
  montoRapAcumulado?: number
}

export type SeveranceError = 'missing_hire_date' | 'missing_salary' | 'termination_before_hire'

export const SEVERANCE_ERROR_MESSAGES: Record<SeveranceError, string> = {
  missing_hire_date: 'El empleado no tiene fecha de ingreso. Agrégala en su ficha para calcular la liquidación.',
  missing_salary: 'El empleado no tiene salario base. Agrégalo en su ficha para calcular la liquidación.',
  termination_before_hire: 'La fecha de terminación es anterior a la fecha de ingreso del empleado.',
}

/**
 * Runs the Honduras liquidation engine for a stored employee. Uses base salary
 * (the engine averages it as base × 14/12) until a payroll-history average exists.
 */
export function calculateEmployeeSeverance(
  employee: SeveranceEmployee,
  params: SeveranceParams
): { ok: true; result: LiquidacionResult } | { ok: false; error: SeveranceError } {
  const hireDate = employee.hire_date?.slice(0, 10) ?? ''
  const hire = parseDateYmd(hireDate)
  if (Number.isNaN(hire.getTime())) return { ok: false, error: 'missing_hire_date' }

  const baseSalary = Number(employee.base_salary) || 0
  if (baseSalary <= 0) return { ok: false, error: 'missing_salary' }

  const egreso = parseDateYmd(params.fechaEgreso)
  if (Number.isNaN(egreso.getTime()) || egreso < hire) {
    return { ok: false, error: 'termination_before_hire' }
  }

  const result = calcularLiquidacionHonduras({
    datosManuales: {
      salarioBaseMensual: baseSalary,
      fechaIngreso: hireDate,
      fechaEgreso: params.fechaEgreso,
    },
    parametrosCalculo: {
      motivoSalida: params.motivoSalida,
      preavisoGozado: params.preavisoGozado ?? false,
      montoRapAcumulado: params.montoRapAcumulado ?? 0,
    },
  })
  return { ok: true, result }
}
