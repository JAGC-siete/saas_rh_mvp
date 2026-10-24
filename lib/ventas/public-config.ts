import { createAdminClient } from '../supabase/server'
import { DEFAULT_VENTAS_BUSINESS_RULES, mergeVentasBusinessRules } from './business-rules'
import { loadEnterpriseAnnualPriceFromCatalog } from './enterprise-price'
import { FALLBACK_VENTAS_TIERS, loadActiveVentasConfig } from './load-ventas-config'
import { sortVentasTiersByEmployees } from './pricing'
import type { VentasPricingTier } from './types'
import { FALLBACK_LADDER_PLANS, loadLadderPlans, type LadderPlanPrice } from './ladder'
import { logger } from '../logger'

function publicPayload(
  currency: string,
  rules: ReturnType<typeof mergeVentasBusinessRules>,
  enterprise_annual_price: number,
  tiers: VentasPricingTier[],
  plans: LadderPlanPrice[],
  /**
   * False on the fallback path: fallback tier prices may be stale, so they are not published.
   * Plan prices are always published: FALLBACK_LADDER_PLANS mirrors plan_catalog, and the
   * Docker build has no Supabase access, so prerendered pages would otherwise say "Cotiza".
   */
  includeTierPrices: boolean
) {
  return {
    currency,
    business_rules: { ...rules, enterprise_annual_price },
    monthly_min_employees: rules.monthly_min_employees,
    max_auto_quote_terminals: rules.max_auto_quote_terminals,
    annual_terminals_included_min_employees: rules.annual_terminals_included_min_employees,
    hardware_sale_unit_price: rules.hardware_sale_unit_price,
    micro_max_employees: rules.micro_max_employees,
    basic_annual_price: rules.basic_annual_price,
    membership_discount_pct: rules.membership_discount_pct,
    enterprise_annual_price,
    hardware_continuity: rules.hardware_continuity,
    tiers: sortVentasTiersByEmployees(tiers || []).map((t) => ({
      min_employees: t.min_employees,
      max_employees: t.max_employees,
      annual_terminal_mode: t.annual_terminal_mode || 'auto',
      included_terminals_max: t.included_terminals_max ?? null,
      price: includeTierPrices ? t.price : null,
    })),
    plans: plans.map((p) => ({
      plan_key: p.plan_key,
      name: p.name,
      description: p.description,
      included_terminals_annual: p.included_terminals_annual,
      monthly_price_hnl: p.monthly_price_hnl,
      annual_price_hnl: p.annual_price_hnl,
      monthly_price_usd: p.monthly_price_usd,
      annual_price_usd: p.annual_price_usd,
    })),
  }
}

export type PublicVentasConfig = ReturnType<typeof publicPayload>

/**
 * Public read-only ventas knobs (no promo codes), for /api/ventas/public-config and
 * pages that prerender prices. Server-only: uses the service role.
 */
export async function loadPublicVentasConfig(): Promise<PublicVentasConfig> {
  try {
    const supabase = createAdminClient()
    const cfg = await loadActiveVentasConfig(supabase as any)
    const rules = mergeVentasBusinessRules(cfg.businessRules || DEFAULT_VENTAS_BUSINESS_RULES)
    const enterprise_annual_price = await loadEnterpriseAnnualPriceFromCatalog(
      supabase as any,
      rules.enterprise_annual_price
    )

    const plans = await loadLadderPlans(supabase as any)

    return publicPayload(cfg.currency, rules, enterprise_annual_price, cfg.tiers || [], plans, true)
  } catch (e: any) {
    logger.warn('ventas public-config fallback', { error: e?.message })
    const rules = DEFAULT_VENTAS_BUSINESS_RULES
    return publicPayload(
      'HNL',
      rules,
      rules.enterprise_annual_price,
      FALLBACK_VENTAS_TIERS,
      FALLBACK_LADDER_PLANS,
      false
    )
  }
}
