import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../../lib/supabase/server'
import { withGeneralRateLimit } from '../../../../../lib/security/rate-limiting'
import { userCanAccessFullSettings } from '../../../../../lib/security/settings-access'
import {
  buildLogoMetadata,
  clearCompanyLogoMetadata,
  createLogoSignedPreviewUrl,
  loadCompanyBranding,
  removeLogoFromStorage,
  saveCompanyLogoMetadata,
} from '../../../../../lib/company-branding/service'
import { COMPANY_LOGO_BUCKET, isCompanyLogoStoragePath } from '../../../../../lib/company-branding/storage'
import { logger } from '../../../../../lib/logger'

interface ConfirmBody {
  storage_path: string
  mime_type: string
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const auth = await requireCompanyAccess(req, res)
    const companyId = auth.companyId
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' })
    }

    if (!userCanAccessFullSettings(auth.userProfile) && auth.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' })
    }

    const { storage_path, mime_type } = req.body as ConfirmBody
    if (!storage_path || !isCompanyLogoStoragePath(storage_path, companyId)) {
      return res.status(400).json({ success: false, error: 'Ruta de almacenamiento inválida' })
    }

    const supabase = createAdminClient()

    const { data: listed, error: listError } = await supabase.storage
      .from(COMPANY_LOGO_BUCKET)
      .list(`companies/${companyId}/branding`, { limit: 10 })

    if (listError) {
      logger.error('Logo confirm list error', { listError, companyId })
      return res.status(400).json({ success: false, error: 'No se encontró el archivo subido' })
    }

    const fileName = storage_path.split('/').pop()
    const found = listed?.some((f) => f.name === fileName)
    if (!found) {
      return res.status(400).json({ success: false, error: 'No se encontró el archivo subido. Intente de nuevo.' })
    }

    const previous = await loadCompanyBranding(supabase, companyId)
    const { metadata } = buildLogoMetadata(companyId, mime_type, storage_path)
    await saveCompanyLogoMetadata(supabase, companyId, metadata)

    if (previous?.logo_storage_path && previous.logo_storage_path !== storage_path) {
      await removeLogoFromStorage(supabase, previous.logo_storage_path).catch(() => {})
    }

    const previewUrl = await createLogoSignedPreviewUrl(supabase, storage_path)

    return res.status(200).json({
      success: true,
      branding: metadata,
      previewUrl,
    })
  } catch (error: unknown) {
    if (error instanceof Error && ['UNAUTHORIZED', 'PROFILE_REQUIRED', 'COMPANY_ACCESS_REQUIRED'].includes(error.message)) {
      return
    }
    logger.error('company branding logo confirm error', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export default withGeneralRateLimit(['POST'])(handler)
