/**
 * Custom-field earnings must not stack on an `eff_bruto` that already includes them.
 * Re-saves are idempotent; obvious double-counts heal back to calc_bruto + earnings.
 * Manual `/edit` bruto overrides (outside calc±N·earnings) are preserved.
 */

import { STANDARD_PAYROLL_ADJUSTMENT_FIELDS } from './standard-adjustment-fields'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function nearlyEqual(a: number, b: number, eps = 0.02): boolean {
  return Math.abs(a - b) <= eps
}

export function resolveCustomFieldsBaseBruto(input: {
  calcBruto: number
  currentEffBruto: number
  priorIngresosAdicionales: number
}): number {
  const calcBruto = Math.max(0, Number(input.calcBruto) || 0)
  const effBruto = Math.max(0, Number(input.currentEffBruto) || 0)
  const prior = Number(input.priorIngresosAdicionales) || 0

  if (prior === 0) {
    return round2(effBruto)
  }

  const once = round2(calcBruto + prior)
  const twice = round2(calcBruto + 2 * prior)

  // Fresh calc+customs, or already-doubled (legacy bug): anchor to engine baseline.
  if (nearlyEqual(effBruto, once) || nearlyEqual(effBruto, twice)) {
    return round2(calcBruto)
  }

  // Manual bruto edit (or other override): strip only the prior custom earnings.
  return round2(Math.max(0, effBruto - prior))
}

export function computeCustomFieldsEffectiveAmounts(input: {
  calcBruto: number
  currentEffBruto: number
  priorIngresosAdicionales: number
  ingresosAdicionales: number
  deduccionesAdicionales: number
  effIhss: number
  effRap: number
  effIsr: number
}): { baseBruto: number; newEffBruto: number; newEffNeto: number } {
  const baseBruto = resolveCustomFieldsBaseBruto({
    calcBruto: input.calcBruto,
    currentEffBruto: input.currentEffBruto,
    priorIngresosAdicionales: input.priorIngresosAdicionales,
  })
  const ingresos = Number(input.ingresosAdicionales) || 0
  const deducciones = Number(input.deduccionesAdicionales) || 0
  const statutory =
    (Number(input.effIhss) || 0) +
    (Number(input.effRap) || 0) +
    (Number(input.effIsr) || 0)

  const newEffBruto = round2(baseBruto + ingresos)
  const newEffNeto = round2(newEffBruto - statutory - deducciones)

  return { baseBruto, newEffBruto, newEffNeto }
}

export function isPayrollRunEditableForCustomFields(
  status: string | null | undefined
): boolean {
  return status === 'draft' || status === 'edited'
}

export type CustomFieldsAdjustmentRow = {
  run_line_id: string
  company_id: string
  field: string
  old_value: number | null
  new_value: number
  user_id: string
}

function toAuditNumber(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && !isNaN(parseFloat(value))) return parseFloat(value)
  return null
}

/**
 * payroll_adjustments rows for a custom-fields save. The table's trigger
 * (apply_adjustment_update_eff) treats hours/bruto/ihss/rap/isr/neto as overrides of
 * eff_*, so a metadata key with one of those names (e.g. a custom deduction keyed `isr`)
 * is audited as `custom_<key>`; otherwise it would overwrite eff_isr without touching neto.
 */
export function buildCustomFieldsAdjustmentRows(input: {
  runLineId: string
  companyId: string
  userId: string
  oldEffBruto: number
  newEffBruto: number
  oldEffNeto: number
  newEffNeto: number
  existingMetadata: Record<string, unknown>
  mergedMetadata: Record<string, unknown>
}): CustomFieldsAdjustmentRow[] {
  const base = {
    run_line_id: input.runLineId,
    company_id: input.companyId,
    user_id: input.userId,
  }
  const rows: CustomFieldsAdjustmentRow[] = []
  if (input.oldEffBruto !== input.newEffBruto) {
    rows.push({ ...base, field: 'bruto', old_value: input.oldEffBruto, new_value: input.newEffBruto })
  }
  if (input.oldEffNeto !== input.newEffNeto) {
    rows.push({ ...base, field: 'neto', old_value: input.oldEffNeto, new_value: input.newEffNeto })
  }

  const standardFields = new Set<string>(STANDARD_PAYROLL_ADJUSTMENT_FIELDS)
  const allKeys = new Set([
    ...Object.keys(input.existingMetadata),
    ...Object.keys(input.mergedMetadata),
  ])
  for (const key of allKeys) {
    if (key === '_deduction_plan_ids' || key === '_deduction_plan_breakdown') continue
    const oldNum = toAuditNumber(input.existingMetadata[key])
    const newNum = toAuditNumber(input.mergedMetadata[key])
    const field = standardFields.has(key) ? `custom_${key}` : key
    if (newNum !== null && oldNum !== newNum && /^[a-z0-9_]+$/.test(field) && field.length <= 64) {
      rows.push({ ...base, field, old_value: oldNum, new_value: newNum })
    }
  }
  return rows
}
