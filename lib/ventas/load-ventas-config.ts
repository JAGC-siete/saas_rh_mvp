import type { CurrencyCode, VentasPricingTier } from './types'
import { normalizeCouponCode } from './pricing'
import { matchVentasPromoCode, promoCodesFromLegacyConfig, type VentasPromoCode } from './promo-codes'

const FALLBACK_CURRENCY: CurrencyCode = 'HNL'
const FALLBACK_COUPON_CODE = 'gastro2026'
const FALLBACK_COUPON_DISCOUNT_PCT = 0.45

export const FALLBACK_VENTAS_TIERS: VentasPricingTier[] = [
  { min_employees: 1, max_employees: 30, price: 65000, is_active: true, sort_order: 10 },
  { min_employees: 31, max_employees: 50, price: 74000, is_active: true, sort_order: 20 },
  { min_employees: 51, max_employees: 100, price: 85000, is_active: true, sort_order: 30 },
  { min_employees: 101, max_employees: 200, price: 97450, is_active: true, sort_order: 40 },
]

export type LoadedVentasConfig = {
  configId: string | null
  currency: CurrencyCode
  tiers: VentasPricingTier[]
  promoCodes: VentasPromoCode[]
}

export async function loadActiveVentasConfig(supabase: any): Promise<LoadedVentasConfig> {
  const { data: configRow, error: configErr } = await supabase
    .from('config_ventas')
    .select('id, currency, coupon_code, coupon_discount_pct')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (configErr) throw new Error(`config_ventas: ${configErr.message}`)

  const currency: CurrencyCode = (configRow?.currency as CurrencyCode) || FALLBACK_CURRENCY
  let tiers: VentasPricingTier[] = FALLBACK_VENTAS_TIERS
  let promoCodes: VentasPromoCode[] = []

  if (configRow?.id) {
    const [{ data: tiersRows, error: tiersErr }, { data: promoRows, error: promoErr }] =
      await Promise.all([
        supabase
          .from('config_ventas_pricing_tiers')
          .select('id, min_employees, max_employees, price, is_active, sort_order')
          .eq('config_id', configRow.id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('config_ventas_promo_codes')
          .select('id, code, discount_pct, label, is_active, sort_order')
          .eq('config_id', configRow.id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
      ])

    if (tiersErr) throw new Error(`config_ventas_pricing_tiers: ${tiersErr.message}`)
    if (promoErr) throw new Error(`config_ventas_promo_codes: ${promoErr.message}`)

    if (Array.isArray(tiersRows) && tiersRows.length > 0) tiers = tiersRows
    if (Array.isArray(promoRows) && promoRows.length > 0) {
      promoCodes = promoRows.map((r: VentasPromoCode) => ({
        id: r.id,
        code: r.code,
        discount_pct: Number(r.discount_pct),
        label: r.label ?? null,
        is_active: r.is_active ?? true,
        sort_order: r.sort_order ?? 10,
      }))
    }
  }

  if (promoCodes.length === 0 && configRow) {
    promoCodes = promoCodesFromLegacyConfig(configRow)
  }

  return {
    configId: configRow?.id ?? null,
    currency,
    tiers,
    promoCodes,
  }
}

export function resolveSubmittedPromo(params: {
  promoCodes: VentasPromoCode[]
  submittedRaw: string
  legacyCouponCode?: string | null
  legacyDiscountPct?: number | null
}): {
  submittedNorm: string
  isCouponValid: boolean
  discountPctApplied: number
  couponCodeApplied: string | null
} {
  const codes =
    params.promoCodes.length > 0
      ? params.promoCodes
      : promoCodesFromLegacyConfig({
          coupon_code: params.legacyCouponCode ?? FALLBACK_COUPON_CODE,
          coupon_discount_pct: params.legacyDiscountPct ?? FALLBACK_COUPON_DISCOUNT_PCT,
        })

  const match = matchVentasPromoCode(codes, params.submittedRaw)
  return {
    submittedNorm: match.submittedNorm,
    isCouponValid: !!match.matched,
    discountPctApplied: match.discountPct,
    couponCodeApplied: match.matched ? normalizeCouponCode(match.matched.code) || match.matched.code : null,
  }
}
