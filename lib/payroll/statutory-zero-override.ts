/**
 * Per-run-line override: zero statutory deductions (IHSS/RAP/ISR) for ordinary payroll.
 * Survives preview regen via edited + metadata.statutory_zeroed_at (same family as days adjust).
 */

export const STATUTORY_ZERO_METADATA_KEYS = [
  'statutory_zeroed_at',
  'statutory_zeroed_by',
  'statutory_zeroed_reason',
  'statutory_zero_ihss',
  'statutory_zero_rap',
  'statutory_zero_isr',
] as const

export function hasStatutoryZeroOverride(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  return metadata != null && metadata.statutory_zeroed_at != null
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Keep non-statutory deductions (custom fields / plans embedded in neto).
 * newNeto = oldNeto + oldIhss + oldRap + oldIsr
 */
export function applyStatutoryZeroToEffectiveAmounts(input: {
  eff_bruto: number
  eff_ihss: number
  eff_rap: number
  eff_isr: number
  eff_neto: number
}): {
  eff_ihss: number
  eff_rap: number
  eff_isr: number
  eff_neto: number
  statutory_removed: number
} {
  const ihss = Number(input.eff_ihss) || 0
  const rap = Number(input.eff_rap) || 0
  const isr = Number(input.eff_isr) || 0
  const neto = Number(input.eff_neto) || 0
  const removed = ihss + rap + isr
  return {
    eff_ihss: 0,
    eff_rap: 0,
    eff_isr: 0,
    eff_neto: round2(neto + removed),
    statutory_removed: round2(removed),
  }
}

export function stampStatutoryZeroMetadata(
  metadata: Record<string, unknown> | null | undefined,
  opts: { userId: string; reason: string }
): Record<string, unknown> {
  return {
    ...(metadata || {}),
    statutory_zeroed_at: new Date().toISOString(),
    statutory_zeroed_by: opts.userId,
    statutory_zeroed_reason: opts.reason.trim(),
    statutory_zero_ihss: true,
    statutory_zero_rap: true,
    statutory_zero_isr: true,
  }
}

export function stripStatutoryZeroMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const base = { ...(metadata || {}) }
  for (const key of STATUTORY_ZERO_METADATA_KEYS) {
    delete base[key]
  }
  return base
}
