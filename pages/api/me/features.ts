import type { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { COMMERCIAL_TO_INTERNAL, type CommercialPlanType } from '../../../lib/billing/plans'

/**
 * GET /api/me/features
 *
 * Returns the effective feature map for the authenticated user's company,
 * resolved by `has_feature()` semantics (plan mapping + per-company overrides).
 *
 * Response:
 * {
 *   company_id: string | null,
 *   plan: { commercial: string, internal_key: string },
 *   features: Record<feature_key, boolean>   // true = enabled for this company
 * }
 *
 * Super admins without a company return an "all enabled" map so the super-admin
 * layout keeps working. Users without a profile/company get an empty map.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { companyId, role } = await authenticateUser(req, res, {
      requireProfile: false,
      allowSuperAdminWithoutCompany: true,
    })

    const admin = createAdminClient()

    // Always load the feature catalog; it's small and changes rarely.
    const { data: catalog, error: catalogErr } = await admin
      .from('feature_catalog')
      .select('feature_key')
      .order('feature_key')

    if (catalogErr) {
      logger.warn('feature_catalog read failed', { error: catalogErr.message })
    }
    const featureKeys = (catalog || []).map((r: { feature_key: string }) => r.feature_key)

    const normalizedRole = String(role || '').trim().toLowerCase()

    // Super admin without a bound company: unlock everything from the sidebar perspective.
    if (normalizedRole === 'super_admin' && !companyId) {
      const features: Record<string, boolean> = {}
      for (const k of featureKeys) features[k] = true
      return res.status(200).json({
        success: true,
        company_id: null,
        plan: { commercial: 'enterprise', internal_key: 'enterprise' },
        features,
      })
    }

    if (!companyId) {
      // Authenticated but no company: no features available.
      return res.status(200).json({
        success: true,
        company_id: null,
        plan: { commercial: null, internal_key: null },
        features: {},
      })
    }

    // Read effective matrix from the SQL view (respects overrides).
    const [companyRes, effectiveRes] = await Promise.all([
      admin.from('companies').select('plan_type').eq('id', companyId).maybeSingle(),
      admin
        .from('v_company_effective_features')
        .select('feature_key, is_enabled')
        .eq('company_id', companyId),
    ])

    if (companyRes.error) {
      logger.warn('companies read failed (me/features)', { error: companyRes.error.message })
    }
    if (effectiveRes.error) {
      logger.warn('v_company_effective_features read failed', { error: effectiveRes.error.message })
    }

    const commercial = String(companyRes.data?.plan_type || 'basic').toLowerCase() as CommercialPlanType
    const internal_key = COMMERCIAL_TO_INTERNAL[commercial] || 'basic'

    const features: Record<string, boolean> = {}
    for (const k of featureKeys) features[k] = false
    for (const row of effectiveRes.data || []) {
      features[(row as any).feature_key] = !!(row as any).is_enabled
    }

    return res.status(200).json({
      success: true,
      company_id: companyId,
      plan: { commercial, internal_key },
      features,
    })
  } catch (err: any) {
    if (err?.message === 'UNAUTHORIZED' || err?.message === 'PROFILE_REQUIRED') {
      return
    }
    logger.error('Error in /api/me/features', { error: err?.message })
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
