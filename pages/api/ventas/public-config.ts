import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { DEFAULT_VENTAS_BUSINESS_RULES, mergeVentasBusinessRules } from '../../../lib/ventas/business-rules'
import { loadEnterpriseAnnualPriceFromCatalog } from '../../../lib/ventas/enterprise-price'
import { FALLBACK_VENTAS_TIERS, loadActiveVentasConfig } from '../../../lib/ventas/load-ventas-config'
import { sortVentasTiersByEmployees } from '../../../lib/ventas/pricing'
import type { VentasPricingTier } from '../../../lib/ventas/types'
import { logger } from '../../../lib/logger'

/**
 * Public read-only ventas knobs for the /ventas form (no promo codes).
 */
function publicPayload(
  currency: string,
  rules: ReturnType<typeof mergeVentasBusinessRules>,
  enterprise_annual_price: number,
  tiers: VentasPricingTier[]
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
    })),
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')

  try {
    const supabase = createAdminClient()
    const cfg = await loadActiveVentasConfig(supabase as any)
    const rules = mergeVentasBusinessRules(cfg.businessRules || DEFAULT_VENTAS_BUSINESS_RULES)
    const enterprise_annual_price = await loadEnterpriseAnnualPriceFromCatalog(
      supabase as any,
      rules.enterprise_annual_price
    )

    return res.status(200).json(
      publicPayload(cfg.currency, rules, enterprise_annual_price, cfg.tiers || [])
    )
  } catch (e: any) {
    logger.warn('ventas public-config fallback', { error: e?.message })
    const rules = DEFAULT_VENTAS_BUSINESS_RULES
    return res.status(200).json(
      publicPayload('HNL', rules, rules.enterprise_annual_price, FALLBACK_VENTAS_TIERS)
    )
  }
}
