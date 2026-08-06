import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { DEFAULT_VENTAS_BUSINESS_RULES } from '../../../lib/ventas/business-rules'
import { loadActiveVentasConfig } from '../../../lib/ventas/load-ventas-config'
import { logger } from '../../../lib/logger'

/**
 * Public read-only ventas knobs for the /ventas form (no promo codes).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createAdminClient()
    const cfg = await loadActiveVentasConfig(supabase as any)
    const rules = cfg.businessRules || DEFAULT_VENTAS_BUSINESS_RULES

    return res.status(200).json({
      currency: cfg.currency,
      monthly_min_employees: rules.monthly_min_employees,
      max_auto_quote_terminals: rules.max_auto_quote_terminals,
      annual_terminals_included_min_employees: rules.annual_terminals_included_min_employees,
      hardware_sale_unit_price: rules.hardware_sale_unit_price,
      tiers: (cfg.tiers || []).map((t) => ({
        min_employees: t.min_employees,
        max_employees: t.max_employees,
        annual_terminal_mode: t.annual_terminal_mode || 'auto',
        included_terminals_max: t.included_terminals_max ?? null,
      })),
    })
  } catch (e: any) {
    logger.warn('ventas public-config fallback', { error: e?.message })
    const rules = DEFAULT_VENTAS_BUSINESS_RULES
    return res.status(200).json({
      currency: 'HNL',
      monthly_min_employees: rules.monthly_min_employees,
      max_auto_quote_terminals: rules.max_auto_quote_terminals,
      annual_terminals_included_min_employees: rules.annual_terminals_included_min_employees,
      hardware_sale_unit_price: rules.hardware_sale_unit_price,
      tiers: [],
    })
  }
}
