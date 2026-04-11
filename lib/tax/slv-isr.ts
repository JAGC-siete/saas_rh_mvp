/** Retención mensual ISR El Salvador (USD) — tablas tipo tramo from/to + cuota fija marginal. */

export type SlvMonthlyBracketUsd = {
  from: number
  to: number | null
  rate: number
  fixed: number
}

export function calculateSlvMonthlyIsrUsd(taxableMonthly: number, brackets: SlvMonthlyBracketUsd[]): number {
  if (!Number.isFinite(taxableMonthly) || taxableMonthly <= 0 || brackets.length === 0) return 0
  const sorted = [...brackets].sort((a, b) => a.from - b.from)
  for (const b of sorted) {
    const upper = b.to == null ? Number.POSITIVE_INFINITY : b.to
    if (taxableMonthly + 1e-9 >= b.from && taxableMonthly <= upper + 1e-9) {
      return Math.max(0, b.fixed + (taxableMonthly - b.from) * b.rate)
    }
  }
  return 0
}

export function normalizeSlvMonthlyBrackets(raw: unknown): SlvMonthlyBracketUsd[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((x: any) => ({
      from: Number(x.from),
      to: x.to == null || x.to === '' ? null : Number(x.to),
      rate: Number(x.rate),
      fixed: Number(x.fixed ?? 0)
    }))
    .filter(b => Number.isFinite(b.from) && Number.isFinite(b.rate) && Number.isFinite(b.fixed))
}
