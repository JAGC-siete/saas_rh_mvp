/**
 * Cálculo del Séptimo Día (Honduras, Art. 338-340).
 * Los trabajadores remunerados por hora tienen derecho al pago de un día de descanso
 * por cada 6 días trabajados. Valor = 8 horas a la tarifa base.
 *
 * Solo aplica a pay_type === 'hourly'. Los empleados 'fixed' ya tienen el descanso incluido.
 */

export interface SeptimoDiaInput {
  /** Tarifa por hora = base_salary / 240 (tarifa derivada del salario mensual) */
  hourlyRate: number
  /** Horas ordinarias trabajadas en el período (excluye overtime) */
  ordinaryHours: number
  /** Días trabajados en el período */
  daysWorked: number
  /** Total horas (ordinarias + overtime) - para umbral de jornada completa */
  totalHours: number
  /** 'proportional' = (hours/48)*8*rate; 'fixed' = 100% si days>=6 o hours>=44 */
  semanalProration: 'proportional' | 'fixed'
}

/** Horas ordinarias para ganar 100% del Séptimo Día (6 días × 8h) */
const HORAS_PARA_SEPTIMO_COMPLETO = 48

/** Valor del Séptimo Día completo = 8 horas a la tarifa base */
const HORAS_SEPTIMO_DIA = 8

/**
 * Calcula el monto del Séptimo Día para empleados por hora.
 * No incluir horas extras en ordinaryHours (evita piramidación).
 *
 * @param input - Parámetros del cálculo
 * @returns Monto del Séptimo Día (0 si no aplica)
 */
export function calculateSeptimoDia(input: SeptimoDiaInput): number {
  const { hourlyRate, ordinaryHours, daysWorked, totalHours, semanalProration } = input

  if (hourlyRate <= 0) return 0

  const valorSeptimoCompleto = HORAS_SEPTIMO_DIA * hourlyRate

  if (semanalProration === 'proportional') {
    // (Total Horas Ordinarias / 48) * (8 * base_salary)
    const factor = Math.min(1, ordinaryHours / HORAS_PARA_SEPTIMO_COMPLETO)
    return Math.round(factor * valorSeptimoCompleto * 100) / 100
  }

  // Modo fixed: 100% si completó jornada (6 días o 44h)
  if (daysWorked >= 6 || totalHours >= 44) {
    return Math.round(valorSeptimoCompleto * 100) / 100
  }

  return 0
}
