/**
 * Metadata para payroll_run_lines cuando el run es 13AVO o 14AVO.
 *
 * Se almacena en payroll_run_lines.metadata (JSONB).
 * No se requieren migraciones: el campo metadata ya existe.
 *
 * Campos específicos para 13/14:
 * - is_tax_exempt: true (13avo y 14avo no llevan IHSS, RAP ni ISR)
 * - avg_salary: promedio salarial del período de referencia
 * - days_worked: días laborados en el período (para fórmula)
 * - months_worked: meses trabajados (prorrateo)
 */
import type { PayrollRunLineMetadata1314 } from '../../types/payroll'

export type { PayrollRunLineMetadata1314 }

/**
 * Construye el metadata para una línea de 13avo o 14avo.
 * Siempre is_tax_exempt: true según ley hondureña.
 */
export function build1314Metadata(
  overrides: Partial<PayrollRunLineMetadata1314> = {}
): PayrollRunLineMetadata1314 {
  return {
    is_tax_exempt: true,
    ...overrides
  }
}
