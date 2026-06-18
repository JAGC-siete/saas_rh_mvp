import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../../lib/supabase/server'
import { withGeneralRateLimit } from '../../../../../lib/security/rate-limiting'
import { userCanAccessFullSettings } from '../../../../../lib/security/settings-access'
import {
  clearCompanyLogoMetadata,
  createLogoSignedPreviewUrl,
  loadCompanyBranding,
  removeLogoFromStorage,
} from '../../../../../lib/company-branding/service'
import { logger } from '../../../../../lib/logger'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await requireCompanyAccess(req, res)
    const companyId = auth.companyId
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' })
    }

    if (!userCanAccessFullSettings(auth.userProfile) && auth.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' })
    }

    const supabase = createAdminClient()

    if (req.method === 'GET') {
      const branding = await loadCompanyBranding(supabase, companyId)
      if (!branding?.logo_storage_path) {
        return res.status(200).json({ success: true, branding: null, previewUrl: null })
      }
      const previewUrl = await createLogoSignedPreviewUrl(supabase, branding.logo_storage_path)
      return res.status(200).json({ success: true, branding, previewUrl })
    }

    if (req.method === 'DELETE') {
      const oldPath = await clearCompanyLogoMetadata(supabase, companyId)
      if (oldPath) {
        await removeLogoFromStorage(supabase, oldPath).catch(() => {})
      }
      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', ['GET', 'DELETE'])
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error: unknown) {
    if (error instanceof Error && ['UNAUTHORIZED', 'PROFILE_REQUIRED', 'COMPANY_ACCESS_REQUIRED'].includes(error.message)) {
      return
    }
    logger.error('company branding logo API error', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export default withGeneralRateLimit(['GET', 'DELETE'])(handler)
