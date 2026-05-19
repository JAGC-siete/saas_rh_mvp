import type { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { resolveFieldAccessContext } from '../../../lib/security/field-access'

/**
 * GET /api/me/field-access
 *
 * Returns effective field-level permissions for the authenticated user,
 * including Super Admin DB matrix + per-user JSON overrides.
 */
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

    const admin = createAdminClient()
    const salary = await resolveFieldAccessContext(userProfile, admin)

    return res.status(200).json({
      success: true,
      field_access: {
        salary: {
          canViewSalary: salary.canViewSalary,
          canEditSalary: salary.canEditSalary,
          salaryDisplayMode: salary.salaryDisplayMode,
        },
      },
    })
  } catch (err: any) {
    if (err?.message === 'UNAUTHORIZED' || err?.message === 'PROFILE_REQUIRED') {
      return
    }
    logger.error('Error in /api/me/field-access', { error: err?.message })
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
