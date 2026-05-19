import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'
import { withGeneralRateLimit } from '../../../lib/security/rate-limiting'
import { userCanAccessFullSettings } from '../../../lib/security/settings-access'
import { DEFAULT_PERFORMANCE_SETTINGS, parsePerformanceSettings } from '../../../lib/performance/settings'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await requireCompanyAccess(req, res)
    const companyId = auth.companyId
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' })

    const supabase = createAdminClient()

    if (req.method === 'GET') {
      if (!userCanAccessFullSettings(auth.userProfile) && auth.role !== 'super_admin') {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
      const { data, error } = await supabase
        .from('company_metadata')
        .select('employees_metadata')
        .eq('company_id', companyId)
        .maybeSingle()
      if (error) throw error
      const employees_metadata = data?.employees_metadata || {}
      return res.status(200).json({ employees_metadata, performance: parsePerformanceSettings(employees_metadata) })
    }

    if (req.method === 'PATCH') {
      if (!['super_admin', 'company_admin', 'hr_manager'].includes(auth.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }

      const { data: existing } = await supabase
        .from('company_metadata')
        .select('employees_metadata')
        .eq('company_id', companyId)
        .maybeSingle()
      const prev = (existing?.employees_metadata || {}) as Record<string, unknown>

      const incoming = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
      const merged = {
        ...prev,
        performance_require_all_rated_to_complete:
          typeof incoming.performance_require_all_rated_to_complete === 'boolean'
            ? incoming.performance_require_all_rated_to_complete
            : prev.performance_require_all_rated_to_complete ?? DEFAULT_PERFORMANCE_SETTINGS.performance_require_all_rated_to_complete,
        performance_require_comment_on_no_cumple:
          typeof incoming.performance_require_comment_on_no_cumple === 'boolean'
            ? incoming.performance_require_comment_on_no_cumple
            : prev.performance_require_comment_on_no_cumple ?? DEFAULT_PERFORMANCE_SETTINGS.performance_require_comment_on_no_cumple,
        performance_supera_multiplier:
          typeof incoming.performance_supera_multiplier === 'number' && Number.isFinite(incoming.performance_supera_multiplier)
            ? incoming.performance_supera_multiplier
            : prev.performance_supera_multiplier ?? DEFAULT_PERFORMANCE_SETTINGS.performance_supera_multiplier,
      }

      const { error } = await supabase
        .from('company_metadata')
        .upsert({ company_id: companyId, employees_metadata: merged }, { onConflict: 'company_id' })
      if (error) throw error

      return res.status(200).json({ employees_metadata: merged, performance: parsePerformanceSettings(merged) })
    }

    res.setHeader('Allow', ['GET', 'PATCH'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    if (['UNAUTHORIZED', 'PROFILE_REQUIRED', 'COMPANY_ACCESS_REQUIRED'].includes(error?.message)) return
    console.error('company-metadata/employees error:', error)
    return res.status(500).json({ error: error?.message || 'Internal server error' })
  }
}

export default withGeneralRateLimit(['GET', 'PATCH'])(handler)

