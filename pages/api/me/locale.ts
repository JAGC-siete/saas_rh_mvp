import type { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { APP_ENGLISH_FEATURE, isAppLocale } from '../../../lib/i18n/app/locale'

/**
 * PATCH /api/me/locale  { locale: 'es' | 'en' }
 *
 * Saves the admin app language on the caller's own profile. English is only
 * accepted while the company has the `app_english` feature; going back to
 * Spanish is always allowed.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const locale = req.body?.locale
  if (!isAppLocale(locale)) {
    return res.status(400).json({ code: 'INVALID_LOCALE', error: 'Idioma no válido' })
  }

  try {
    const { user, companyId, role } = await authenticateUser(req, res, {
      allowSuperAdminWithoutCompany: true,
    })
    const admin = createAdminClient()

    const isSuperAdminWithoutCompany = String(role).toLowerCase() === 'super_admin' && !companyId
    if (locale === 'en' && !isSuperAdminWithoutCompany) {
      const { data, error } = await admin
        .from('v_company_effective_features')
        .select('is_enabled')
        .eq('company_id', companyId)
        .eq('feature_key', APP_ENGLISH_FEATURE)
        .maybeSingle()
      if (error) throw error
      if (!data?.is_enabled) {
        return res.status(403).json({ code: 'FEATURE_DISABLED', error: 'El inglés no está activo para tu empresa' })
      }
    }

    const { error: updateError } = await admin.from('user_profiles').update({ locale }).eq('id', user.id)
    if (updateError) throw updateError

    return res.status(200).json({ success: true, locale })
  } catch (err: any) {
    if (err?.message === 'UNAUTHORIZED' || err?.message === 'PROFILE_REQUIRED') {
      return
    }
    logger.error('Error in /api/me/locale', { error: err?.message })
    return res.status(500).json({ code: 'INTERNAL_ERROR', error: 'Internal server error' })
  }
}
