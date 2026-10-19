import { createAdminClient } from '../supabase/server'
import { DEFAULT_VENTAS_BUSINESS_RULES, mergeVentasBusinessRules } from './business-rules'
import { loadEnterpriseAnnualPriceFromCatalog } from './enterprise-price'
import { FALLBACK_VENTAS_TIERS, loadActiveVentasConfig } from './load-ventas-config'
import { sortVentasTiersByEmployees } from './pricing'
import type { VentasPricingTier } from './types'
import { logger } from '../logger'

function publicPayload(
  currency: string,
  rules: ReturnType<typeof mergeVentasBusinessRules>,
  enterprise_annual_price: number,
  tiers: VentasPricingTier[],
  /** False on the fallback path: fallback tier prices may be stale, so they are not published. */
  includePrices: boolean
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
      price: includePrices ? t.price : null,
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

    return publicPayload(cfg.currency, rules, enterprise_annual_price, cfg.tiers || [], true)
  } catch (e: any) {
    logger.warn('ventas public-config fallback', { error: e?.message })
    const rules = DEFAULT_VENTAS_BUSINESS_RULES
    return publicPayload('HNL', rules, rules.enterprise_annual_price, FALLBACK_VENTAS_TIERS, false)
  }
}
