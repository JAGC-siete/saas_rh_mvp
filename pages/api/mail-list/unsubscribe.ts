import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { token } = req.query

  if (!token || typeof token !== 'string') {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
    return res.redirect(`${siteUrl}/mail-list/unsubscribe?error=invalid_token`)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
  
  // Usar cliente anónimo - RLS permitirá SELECT/UPDATE por token
  const supabase = createClient(req, res)

  try {
    // Buscar suscripción por token (RLS policy permite SELECT por token)
    const { data: subscription, error: fetchError } = await supabase
      .from('mail_list_subscriptions')
      .select('id, email, status')
      .eq('confirmation_token', token)
      .single()

    if (fetchError || !subscription) {
      logger.warn('Invalid unsubscribe token used', {
        token: token.substring(0, 8) + '...' // Log partial token for debugging
      })
      return res.redirect(`${siteUrl}/mail-list/unsubscribe?error=invalid_token`)
    }

    // Si ya está unsubscribed, redirigir a confirmación
    if (subscription.status === 'unsubscribed') {
      logger.debug('Subscription already unsubscribed', {
        subscriptionId: subscription.id
      })
      return res.redirect(`${siteUrl}/mail-list/unsubscribe?success=true`)
    }

    // Actualizar status a unsubscribed (RLS policy permite UPDATE por token)
    const { error: updateError } = await supabase
      .from('mail_list_subscriptions')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)

    if (updateError) {
      logger.error('Error unsubscribing from mail list', {
        subscriptionId: subscription.id,
        error: updateError.message
      })
      return res.redirect(`${siteUrl}/mail-list/unsubscribe?error=update_failed`)
    }

    logger.info('Mail list subscription unsubscribed', {
      subscriptionId: subscription.id,
      email: subscription.email
    })

    // Redirigir a página de confirmación
    return res.redirect(`${siteUrl}/mail-list/unsubscribe?success=true`)
  } catch (error: any) {
    logger.error('Unexpected error unsubscribing from mail list', {
      error: error?.message || error,
      stack: error?.stack,
      token: token.substring(0, 8) + '...'
    })
    return res.redirect(`${siteUrl}/mail-list/unsubscribe?error=server_error`)
  }
}

