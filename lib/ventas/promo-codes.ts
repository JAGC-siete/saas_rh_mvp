import { normalizeCouponCode } from './pricing'

export type VentasPromoCode = {
  id?: string
  code: string
  discount_pct: number
  label?: string | null
  is_active?: boolean
  sort_order?: number
}

export type MatchedVentasPromo = {
  submittedNorm: string
  matched: VentasPromoCode | null
  discountPct: number
}

/** Case-insensitive match against active promo codes. */
export function matchVentasPromoCode(
  promoCodes: VentasPromoCode[],
  submittedRaw: string
): MatchedVentasPromo {
  const submittedNorm = normalizeCouponCode(submittedRaw)
  if (!submittedNorm) {
    return { submittedNorm: '', matched: null, discountPct: 0 }
  }

  const active = (promoCodes || []).filter((p) => (p?.is_active ?? true) !== false)
  const matched =
    active.find((p) => normalizeCouponCode(p.code) === submittedNorm) ?? null

  return {
    submittedNorm,
    matched,
    discountPct: matched ? Number(matched.discount_pct) || 0 : 0,
  }
}

export function promoCodesFromLegacyConfig(params: {
  coupon_code?: string | null
  coupon_discount_pct?: number | null
}): VentasPromoCode[] {
  const code = typeof params.coupon_code === 'string' ? params.coupon_code.trim() : ''
  const pct = Number(params.coupon_discount_pct)
  if (!code || !Number.isFinite(pct)) return []
  return [{ code, discount_pct: pct, label: 'Cupón principal', is_active: true, sort_order: 10 }]
}

export function normalizePromoCodeInputs(
  rows: Array<{ code?: unknown; discount_pct?: unknown; label?: unknown; sort_order?: unknown }>
): VentasPromoCode[] {
  const seen = new Set<string>()
  const out: VentasPromoCode[] = []

  for (const [idx, row] of rows.entries()) {
    const code = typeof row.code === 'string' ? row.code.trim() : ''
    const discount_pct = Number(row.discount_pct)
    if (!code) continue
    const norm = normalizeCouponCode(code)
    if (!norm || seen.has(norm)) continue
    if (!Number.isFinite(discount_pct) || discount_pct < 0 || discount_pct > 1) continue

    seen.add(norm)
    const label = typeof row.label === 'string' ? row.label.trim() : null
    const sort_order = Number.isFinite(Number(row.sort_order))
      ? Math.trunc(Number(row.sort_order))
      : (idx + 1) * 10

    out.push({
      code,
      discount_pct,
      label: label || null,
      is_active: true,
      sort_order,
    })
  }

  return out.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

export type ExistingPromoRow = { id: string; code: string }

export type PromoCodeUpsertPlan = {
  updates: Array<{
    id: string
    code: string
    discount_pct: number
    label: string | null
    sort_order: number
  }>
  inserts: Array<{
    code: string
    discount_pct: number
    label: string | null
    sort_order: number
  }>
  deactivateIds: string[]
}

/**
 * Plan upsert for promo codes under UNIQUE (config_id, lower(trim(code))).
 * Soft-delete + insert of the same code collides; update in place instead.
 */
export function planPromoCodeUpserts(
  existing: ExistingPromoRow[],
  desired: VentasPromoCode[]
): PromoCodeUpsertPlan {
  const byNorm = new Map<string, string>()
  for (const row of existing || []) {
    const norm = normalizeCouponCode(row.code)
    if (norm && !byNorm.has(norm)) byNorm.set(norm, row.id)
  }

  const keepNorms = new Set<string>()
  const updates: PromoCodeUpsertPlan['updates'] = []
  const inserts: PromoCodeUpsertPlan['inserts'] = []

  for (const [i, p] of desired.entries()) {
    const norm = normalizeCouponCode(p.code)
    if (!norm) continue
    keepNorms.add(norm)
    const sort_order = p.sort_order ?? (i + 1) * 10
    const payload = {
      code: p.code.trim(),
      discount_pct: p.discount_pct,
      label: p.label || null,
      sort_order,
    }
    const existingId = byNorm.get(norm)
    if (existingId) {
      updates.push({ id: existingId, ...payload })
    } else {
      inserts.push(payload)
    }
  }

  const deactivateIds = (existing || [])
    .filter((row) => {
      const norm = normalizeCouponCode(row.code)
      return !!norm && !keepNorms.has(norm)
    })
    .map((row) => row.id)

  return { updates, inserts, deactivateIds }
}
