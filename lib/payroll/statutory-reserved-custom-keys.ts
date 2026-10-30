/**
 * Custom field keys that collide with statutory deduction columns (eff_ihss / eff_rap / eff_isr).
 * Values under these keys are mirrors or aliases of legales — never "deducciones adicionales".
 * True manual ISR must use a distinct key (e.g. isr_manual); see manualIsrCustomFieldPresent.
 */
const STATUTORY_RESERVED_CUSTOM_KEYS = new Set(['ihss', 'rap', 'isr'])

export function isStatutoryReservedCustomKey(fieldKey: string): boolean {
  return STATUTORY_RESERVED_CUSTOM_KEYS.has(String(fieldKey || '').toLowerCase())
}

/** Amounts already stored on the planilla row for reserved custom_* columns. */
export type StatutoryRowAmounts = {
  IHSS?: number
  RAP?: number
  ISR?: number
}

/**
 * Planilla PDF: custom_ihss / custom_rap / custom_isr must show statutory eff amounts
 * (row.IHSS / RAP / ISR), not metadata mirrors which are often 0 or stale.
 */
export function resolveReservedCustomColumnAmount(
  fieldKey: string,
  row: StatutoryRowAmounts
): number | null {
  if (!isStatutoryReservedCustomKey(fieldKey)) return null
  const key = String(fieldKey || '').toLowerCase()
  const raw = key === 'ihss' ? row.IHSS : key === 'rap' ? row.RAP : row.ISR
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

type CustomFieldDefLike = string | { category?: string } | null | undefined

/**
 * With legal ISR off, a custom deduction keyed `isr` is the company's manual withholding:
 * it must land in eff_isr and reduce neto. Returns null when the line has no such value
 * (legal ISR on, field not defined, or nothing entered) so callers keep their computed ISR.
 */
export function resolveManualIsrFromCustomField(input: {
  legalDeductions?: { isr?: boolean } | null
  customFields?: Record<string, CustomFieldDefLike> | null
  metadata?: Record<string, unknown> | null
}): number | null {
  if (input.legalDeductions?.isr !== false) return null
  const def = input.customFields?.isr
  if (!def || typeof def === 'string' || def.category !== 'deductions') return null
  const raw = input.metadata?.isr
  if (raw === undefined || raw === null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}
