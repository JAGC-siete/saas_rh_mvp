import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../../lib/supabase/server'
import { withGeneralRateLimit } from '../../../../../lib/security/rate-limiting'
import { userCanAccessFullSettings } from '../../../../../lib/security/settings-access'
import {
  MAX_LOGO_SIZE_BYTES,
  isValidLogoMimeType,
} from '../../../../../lib/company-branding/storage'
import { getMimeTypeFromFilename } from '../../../../../lib/security/file-upload-validation'
import {
  buildLogoMetadata,
  createLogoSignedPreviewUrl,
  loadCompanyBranding,
  removeLogoFromStorage,
  saveCompanyLogoMetadata,
} from '../../../../../lib/company-branding/service'
import { COMPANY_LOGO_BUCKET, isCompanyLogoStoragePath } from '../../../../../lib/company-branding/storage'
import { logger } from '../../../../../lib/logger'

interface UploadUrlBody {
  filename: string
  file_size: number
  mime_type?: string
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

    const body = req.body as UploadUrlBody
    const { filename, file_size, mime_type } = body

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ success: false, error: 'filename is required' })
    }
    if (!file_size || typeof file_size !== 'number' || file_size <= 0) {
      return res.status(400).json({ success: false, error: 'file_size must be a positive number' })
    }
    if (file_size > MAX_LOGO_SIZE_BYTES) {
      return res.status(400).json({ success: false, error: 'El logo no puede superar 2MB' })
    }

    const finalMime = mime_type || getMimeTypeFromFilename(filename)
    if (!finalMime || !isValidLogoMimeType(finalMime)) {
      return res.status(400).json({ success: false, error: 'Solo se permiten archivos JPG o PNG' })
    }

    const { storagePath } = buildLogoMetadata(companyId, finalMime)
    const supabase = createAdminClient()

    const { data: urlData, error: urlError } = await supabase.storage
      .from(COMPANY_LOGO_BUCKET)
      .createSignedUploadUrl(storagePath)

    if (urlError || !urlData) {
      logger.error('Failed to create signed upload URL for company logo', { error: urlError, companyId })
      return res.status(500).json({ success: false, error: 'No se pudo preparar la carga' })
    }

    return res.status(200).json({
      success: true,
      uploadUrl: urlData.signedUrl,
      storagePath,
      mimeType: finalMime,
    })
  } catch (error: unknown) {
    if (error instanceof Error && ['UNAUTHORIZED', 'PROFILE_REQUIRED', 'COMPANY_ACCESS_REQUIRED'].includes(error.message)) {
      return
    }
    logger.error('company branding logo upload-url error', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export default withGeneralRateLimit(['POST'])(handler)
