/**
 * Per-run-line override of statutory deductions (IHSS/RAP/ISR) for ordinary payroll.
 * Supports zero-all or per-concept ≥0 values. Survives preview regen via edited +
 * metadata.statutory_zeroed_at (same family as days adjust).
 */

export const STATUTORY_ZERO_METADATA_KEYS = [
  'statutory_zeroed_at',
  'statutory_zeroed_by',
  'statutory_zeroed_reason',
  'statutory_zero_ihss',
  'statutory_zero_rap',
  'statutory_zero_isr',
  'statutory_override_ihss',
  'statutory_override_rap',
  'statutory_override_isr',
] as const

export type StatutoryOverrideNext = {
  ihss?: number
  rap?: number
  isr?: number
}

export function hasStatutoryZeroOverride(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  return metadata != null && metadata.statutory_zeroed_at != null
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Apply per-concept statutory overrides. Omitted concepts stay intact.
 * Neto adjusts by delta so custom deductions embedded in the neto gap are preserved:
 * newNeto = oldNeto + (oldConcept − newConcept) for each changed concept.
 */
export function applyStatutoryOverrideToEffectiveAmounts(input: {
  eff_bruto: number
  eff_ihss: number
  eff_rap: number
  eff_isr: number
  eff_neto: number
  next: StatutoryOverrideNext
}): {
  eff_ihss: number
  eff_rap: number
  eff_isr: number
  eff_neto: number
  statutory_delta: number
  applied: { ihss: boolean; rap: boolean; isr: boolean }
} {
  let ihss = Number(input.eff_ihss) || 0
  let rap = Number(input.eff_rap) || 0
  let isr = Number(input.eff_isr) || 0
  let neto = Number(input.eff_neto) || 0
  let delta = 0
  const applied = { ihss: false, rap: false, isr: false }

  if (input.next.ihss !== undefined) {
    const next = round2(Number(input.next.ihss) || 0)
    delta = round2(delta + (ihss - next))
    ihss = next
    applied.ihss = true
  }
  if (input.next.rap !== undefined) {
    const next = round2(Number(input.next.rap) || 0)
    delta = round2(delta + (rap - next))
    rap = next
    applied.rap = true
  }
  if (input.next.isr !== undefined) {
    const next = round2(Number(input.next.isr) || 0)
    delta = round2(delta + (isr - next))
    isr = next
    applied.isr = true
  }

  return {
    eff_ihss: ihss,
    eff_rap: rap,
    eff_isr: isr,
    eff_neto: round2(neto + delta),
    statutory_delta: delta,
    applied,
  }
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
  const out = applyStatutoryOverrideToEffectiveAmounts({
    ...input,
    next: { ihss: 0, rap: 0, isr: 0 },
  })
  return {
    eff_ihss: out.eff_ihss,
    eff_rap: out.eff_rap,
    eff_isr: out.eff_isr,
    eff_neto: out.eff_neto,
    statutory_removed: out.statutory_delta,
  }
}

export function stampStatutoryOverrideMetadata(
  metadata: Record<string, unknown> | null | undefined,
  opts: {
    userId: string
    reason: string
    applied: { ihss: boolean; rap: boolean; isr: boolean }
    amounts: { ihss: number; rap: number; isr: number }
  }
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    ...(metadata || {}),
    statutory_zeroed_at: new Date().toISOString(),
    statutory_zeroed_by: opts.userId,
    statutory_zeroed_reason: opts.reason.trim(),
  }

  if (opts.applied.ihss) {
    base.statutory_zero_ihss = true
    base.statutory_override_ihss = opts.amounts.ihss
  }
  if (opts.applied.rap) {
    base.statutory_zero_rap = true
    base.statutory_override_rap = opts.amounts.rap
  }
  if (opts.applied.isr) {
    base.statutory_zero_isr = true
    base.statutory_override_isr = opts.amounts.isr
  }

  return base
}

/** Zero-all stamp (all three concepts). */
export function stampStatutoryZeroMetadata(
  metadata: Record<string, unknown> | null | undefined,
  opts: { userId: string; reason: string }
): Record<string, unknown> {
  return stampStatutoryOverrideMetadata(metadata, {
    userId: opts.userId,
    reason: opts.reason,
    applied: { ihss: true, rap: true, isr: true },
    amounts: { ihss: 0, rap: 0, isr: 0 },
  })
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

/** True when all three statutory amounts on the line are zero. */
export function isStatutoryFullyZeroed(amounts: {
  ihss: number
  rap: number
  isr: number
}): boolean {
  return (
    (Number(amounts.ihss) || 0) === 0 &&
    (Number(amounts.rap) || 0) === 0 &&
    (Number(amounts.isr) || 0) === 0
  )
}
