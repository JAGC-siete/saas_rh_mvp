import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { logger } from '../../../lib/logger'
import { unsubscribeLegacySubscription } from '../../../lib/marketing/legacy-token-fallback'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function unsubscribeMarketingLead(token: string): Promise<{ ok: boolean; already: boolean }> {
  const { data: lead, error: fetchError } = await supabaseAdmin
    .from('marketing_leads')
    .select('id, email, status')
    .eq('unsubscribe_token', token)
    .maybeSingle()

  if (fetchError || !lead) {
    return { ok: false, already: false }
  }

  if (lead.status === 'unsubscribed') {
    return { ok: true, already: true }
  }

  const { error: updateError } = await supabaseAdmin
    .from('marketing_leads')
    .update({
      status: 'unsubscribed',
      unsubscribed_at: new Date().toISOString(),
    })
    .eq('id', lead.id)

  if (updateError) {
    logger.error('Error unsubscribing marketing lead', {
      leadId: lead.id,
      error: updateError.message,
    })
    return { ok: false, already: false }
  }

  logger.info('Marketing lead unsubscribed', {
    leadId: lead.id,
    emailPartial: lead.email?.substring(0, 3) + '***',
  })

  return { ok: true, already: false }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { token } = req.query
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'

  if (!token || typeof token !== 'string') {
    return res.redirect(`${siteUrl}/mail-list/unsubscribe?error=invalid_token`)
  }

  try {
    const marketing = await unsubscribeMarketingLead(token)
    if (marketing.ok) {
      return res.redirect(`${siteUrl}/mail-list/unsubscribe?success=true`)
    }

    const legacy = await unsubscribeLegacySubscription(token)
    if (legacy.ok) {
      return res.redirect(`${siteUrl}/mail-list/unsubscribe?success=true`)
    }

    if (legacy.reason === 'table_missing') {
      logger.warn('Unsubscribe token not found (legacy table removed)', {
        tokenPrefix: token.substring(0, 8),
      })
    } else {
      logger.warn('Invalid unsubscribe token used', { tokenPrefix: token.substring(0, 8) })
    }

    return res.redirect(`${siteUrl}/mail-list/unsubscribe?error=invalid_token`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Unexpected error unsubscribing', { error: message })
    return res.redirect(`${siteUrl}/mail-list/unsubscribe?error=server_error`)
  }
}
