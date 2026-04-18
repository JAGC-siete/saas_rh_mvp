import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../../../lib/auth/api-auth-fixed'
import { logger } from '../../../../../lib/logger'
import { COMMERCIAL_TO_INTERNAL } from '../../../../../lib/billing/plans'

/**
 * Per-company feature matrix: plan-derived features plus company overrides.
 * - GET: returns the effective feature set for the company
 *        (plan mapping + override), the raw overrides, and the plan keys.
 * - PUT: upsert a single feature override (or remove it via action=clear).
 *        Body: { feature_key: string, is_enabled?: boolean, reason?: string, action?: 'set' | 'clear' }
 *
 * Super admin only. Uses the service-role client so RLS is bypassed intentionally.
 */

type PutBody = {
  feature_key?: string
  is_enabled?: boolean
  reason?: string | null
  action?: 'set' | 'clear'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : Array.isArray(req.query.id) ? req.query.id[0] : undefined
  if (!id) {
    return res.status(400).json({ error: 'Company ID is required' })
  }

  try {
    const { user } = await requireSuperAdmin(req, res)
    const supabase = createAdminClient()

    if (req.method === 'GET') {
      return await getCompanyFeatures(supabase, id, res)
    }

    if (req.method === 'PUT') {
      return await setCompanyFeatureOverride(supabase, id, user?.id ?? null, req.body as PutBody, res)
    }

    res.setHeader('Allow', ['GET', 'PUT'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'INSUFFICIENT_PERMISSIONS') {
      return
    }
    logger.error('Error in company features admin API', {
      id,
      error: error instanceof Error ? error.message : String(error),
    })
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function getCompanyFeatures(supabase: any, company_id: string, res: NextApiResponse) {
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, plan_type')
    .eq('id', company_id)
    .single()

  if (companyError) {
    if (companyError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Company not found' })
    }
    throw companyError
  }

  const commercialPlan = (company.plan_type || 'basic').toLowerCase()
  const internalPlanKey =
    COMMERCIAL_TO_INTERNAL[commercialPlan as keyof typeof COMMERCIAL_TO_INTERNAL] || 'basic'

  const [effectiveRes, overridesRes, catalogRes] = await Promise.all([
    supabase
      .from('v_company_effective_features')
      .select('feature_key, feature_name, is_enabled, has_override, override_reason')
      .eq('company_id', company_id)
      .order('feature_key'),
    supabase
      .from('company_feature_overrides')
      .select('feature_key, is_enabled, reason, updated_at')
      .eq('company_id', company_id),
    supabase.from('feature_catalog').select('feature_key, name, description').order('feature_key'),
  ])

  if (effectiveRes.error) throw effectiveRes.error
  if (overridesRes.error) throw overridesRes.error
  if (catalogRes.error) throw catalogRes.error

  return res.status(200).json({
    success: true,
    company_id,
    plan: {
      commercial: commercialPlan,
      internal_key: internalPlanKey,
    },
    features: catalogRes.data || [],
    effective: effectiveRes.data || [],
    overrides: overridesRes.data || [],
  })
}

async function setCompanyFeatureOverride(
  supabase: any,
  company_id: string,
  actor_user_id: string | null,
  body: PutBody,
  res: NextApiResponse
) {
  const feature_key = typeof body.feature_key === 'string' ? body.feature_key.trim() : ''
  const action = body.action ?? 'set'

  if (!feature_key) {
    return res.status(400).json({ error: 'feature_key is required' })
  }

  // Validate feature exists
  const { data: feature, error: featureError } = await supabase
    .from('feature_catalog')
    .select('feature_key')
    .eq('feature_key', feature_key)
    .maybeSingle()

  if (featureError) throw featureError
  if (!feature) {
    return res.status(400).json({ error: 'Unknown feature_key', feature_key })
  }

  // Validate company exists
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('id', company_id)
    .maybeSingle()
  if (companyError) throw companyError
  if (!company) {
    return res.status(404).json({ error: 'Company not found' })
  }

  if (action === 'clear') {
    const { error } = await supabase
      .from('company_feature_overrides')
      .delete()
      .eq('company_id', company_id)
      .eq('feature_key', feature_key)
    if (error) throw error
    return res.status(200).json({ success: true, action: 'clear', feature_key })
  }

  if (typeof body.is_enabled !== 'boolean') {
    return res.status(400).json({ error: 'is_enabled (boolean) is required when action != "clear"' })
  }

  const row = {
    company_id,
    feature_key,
    is_enabled: body.is_enabled,
    reason: typeof body.reason === 'string' ? body.reason.slice(0, 500) : null,
    created_by: actor_user_id,
  }

  const { data, error } = await supabase
    .from('company_feature_overrides')
    .upsert(row, { onConflict: 'company_id,feature_key' })
    .select()
    .single()

  if (error) throw error

  return res.status(200).json({ success: true, action: 'set', override: data })
}
