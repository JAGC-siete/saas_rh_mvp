import type { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth/api-auth-fixed'
import { logger } from '../../../lib/logger'
import { resolveSettingsAccessFromProfile } from '../../../lib/security/settings-access'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userProfile } = await authenticateUser(req, res, {
      requireProfile: true,
      allowSuperAdminWithoutCompany: true,
    })

    const settings_access = resolveSettingsAccessFromProfile(userProfile)

    return res.status(200).json({ success: true, settings_access })
  } catch (err: any) {
    if (err?.message === 'UNAUTHORIZED' || err?.message === 'PROFILE_REQUIRED') {
      return
    }
    logger.error('Error in /api/me/settings-access', { error: err?.message })
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
