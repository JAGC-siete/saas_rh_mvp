import type { CurrencyCode, VentasPricingTier } from './types'
import { normalizeCouponCode, sortVentasTiersByEmployees } from './pricing'
import { matchVentasPromoCode, promoCodesFromLegacyConfig, type VentasPromoCode } from './promo-codes'
import {
  DEFAULT_VENTAS_BUSINESS_RULES,
  mergeVentasBusinessRules,
  normalizeAnnualTerminalMode,
  type VentasBusinessRules,
} from './business-rules'

const FALLBACK_CURRENCY: CurrencyCode = 'HNL'
const FALLBACK_COUPON_CODE = 'gastro2026'
const FALLBACK_COUPON_DISCOUNT_PCT = 0.45

/** Matriz comercial vigente (Superadmin → Rangos y precios). */
export const FALLBACK_VENTAS_TIERS: VentasPricingTier[] = [
  {
    min_employees: 2,
    max_employees: 10,
    price: 17507.7,
    is_active: true,
    sort_order: 10,
    annual_terminal_mode: 'sale',
    included_terminals_max: 5,
  },
  {
    min_employees: 11,
    max_employees: 50,
    price: 35000.77,
    is_active: true,
    sort_order: 20,
    annual_terminal_mode: 'included',
    included_terminals_max: 2,
  },
  {
    min_employees: 51,
    max_employees: 100,
    price: 45000.69,
    is_active: true,
    sort_order: 30,
    annual_terminal_mode: 'included',
    included_terminals_max: 2,
  },
  {
    min_employees: 101,
    max_employees: 200,
    price: 77000.71,
    is_active: true,
    sort_order: 40,
    annual_terminal_mode: 'included',
    included_terminals_max: 3,
  },
  {
    min_employees: 201,
    max_employees: 300,
    price: 85000.69,
    is_active: true,
    sort_order: 50,
    annual_terminal_mode: 'included',
    included_terminals_max: 3,
  },
]

export type LoadedVentasConfig = {
  configId: string | null
  currency: CurrencyCode
  tiers: VentasPricingTier[]
  promoCodes: VentasPromoCode[]
  businessRules: VentasBusinessRules
}

function mapTierRow(r: any): VentasPricingTier {
  const maxRaw = r.included_terminals_max
  const included_terminals_max =
    maxRaw == null || maxRaw === ''
      ? null
      : Number.isFinite(Number(maxRaw)) && Number(maxRaw) >= 1
        ? Math.trunc(Number(maxRaw))
        : null

  return {
    id: r.id,
    min_employees: Number(r.min_employees),
    max_employees: Number(r.max_employees),
    price: Number(r.price),
    is_active: r.is_active ?? true,
    sort_order: r.sort_order ?? 10,
    annual_terminal_mode: normalizeAnnualTerminalMode(r.annual_terminal_mode),
    included_terminals_max,
  }
}

export async function loadActiveVentasConfig(supabase: any): Promise<LoadedVentasConfig> {
  const { data: configRow, error: configErr } = await supabase
    .from('config_ventas')
    .select('id, currency, coupon_code, coupon_discount_pct, business_rules')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (configErr) throw new Error(`config_ventas: ${configErr.message}`)

  const currency: CurrencyCode = (configRow?.currency as CurrencyCode) || FALLBACK_CURRENCY
  let tiers: VentasPricingTier[] = FALLBACK_VENTAS_TIERS
  let promoCodes: VentasPromoCode[] = []
  let businessRules = mergeVentasBusinessRules(configRow?.business_rules ?? DEFAULT_VENTAS_BUSINESS_RULES)

  if (configRow?.id) {
    const [{ data: tiersRows, error: tiersErr }, { data: promoRows, error: promoErr }] =
      await Promise.all([
        supabase
          .from('config_ventas_pricing_tiers')
          .select(
            'id, min_employees, max_employees, price, is_active, sort_order, annual_terminal_mode, included_terminals_max'
          )
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

    if (Array.isArray(tiersRows) && tiersRows.length > 0) {
      tiers = sortVentasTiersByEmployees(tiersRows.map(mapTierRow))
    }
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
    businessRules,
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
