import { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '../../../lib/logger'
import { confirmLegacySubscription } from '../../../lib/marketing/legacy-token-fallback'

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
}

function redirect(res: NextApiResponse, query: string) {
  return res.redirect(`${siteUrl()}/mail-list/confirm?${query}`)
}

/**
 * P4: Legacy double opt-in confirm links → marketing_leads.
 * P5: When mail_list_subscriptions is dropped, redirects to legacy_retired.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { token } = req.query

  if (!token || typeof token !== 'string') {
    return redirect(res, 'error=invalid_token')
  }

  try {
    const result = await confirmLegacySubscription(token)

    if (result.ok) {
      return redirect(res, 'success=true')
    }

    switch (result.reason) {
      case 'expired':
        return redirect(res, 'error=expired')
      case 'table_missing':
        return redirect(res, 'error=legacy_retired')
      case 'not_found':
        logger.warn('Invalid confirmation token', { tokenPrefix: token.substring(0, 8) })
        return redirect(res, 'error=invalid_token')
      default:
        return redirect(res, 'error=update_failed')
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Unexpected error confirming legacy subscription', { error: message })
    return redirect(res, 'error=server_error')
  }
}
