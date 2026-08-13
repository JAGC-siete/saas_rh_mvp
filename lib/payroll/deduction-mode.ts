import type { TipoCalculo } from '../../types/payroll'

export const PAYROLL_DEDUCTION_MODE_DEFAULT: TipoCalculo = 'CON'

export const PAYROLL_DEDUCTION_MODE_LABELS: Record<TipoCalculo, string> = {
  CON: 'Con deducciones',
  SIN: 'Sin deducciones',
  '2PAGOS': 'Deducción en dos pagos',
}

export function getPayrollDeductionModeLabel(mode: TipoCalculo): string {
  return PAYROLL_DEDUCTION_MODE_LABELS[mode] ?? PAYROLL_DEDUCTION_MODE_LABELS.CON
}

export function isBiweeklyPaymentFrequency(freq: string | null | undefined): boolean {
  const f = (freq || '').toLowerCase()
  return f === 'quincenal' || f === 'biweekly'
}

export function normalizePayrollDeductionMode(raw: unknown): TipoCalculo | null {
  if (raw === 'CON' || raw === 'SIN' || raw === '2PAGOS') return raw
  return null
}

/**
 * Resuelve el modo de deducción de nómina desde parámetros de empresa.
 * 2PAGOS solo aplica si la frecuencia de pago es quincenal.
 */
export function resolvePayrollDeductionMode(
  metadata: Record<string, unknown> | null | undefined,
  paymentFrequency: string | null | undefined
): TipoCalculo {
  const mode =
    normalizePayrollDeductionMode(metadata?.payroll_deduction_mode) ??
    PAYROLL_DEDUCTION_MODE_DEFAULT

  if (mode === '2PAGOS' && !isBiweeklyPaymentFrequency(paymentFrequency)) {
    return PAYROLL_DEDUCTION_MODE_DEFAULT
  }

  return mode
}

export function validatePayrollDeductionModeForFrequency(
  mode: unknown,
  paymentFrequency: string | null | undefined
): { ok: true; mode: TipoCalculo } | { ok: false; message: string } {
  const normalized = normalizePayrollDeductionMode(mode)
  if (!normalized) {
    return {
      ok: false,
      message: 'Modo de deducción inválido (debe ser CON, SIN o 2PAGOS)',
    }
  }

  if (normalized === '2PAGOS' && !isBiweeklyPaymentFrequency(paymentFrequency)) {
    return {
      ok: false,
      message: 'Deducción en dos pagos solo aplica a nómina quincenal',
    }
  }

  return { ok: true, mode: normalized }
}
