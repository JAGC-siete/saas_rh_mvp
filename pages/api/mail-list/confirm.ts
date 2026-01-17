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
    return res.redirect(`${siteUrl}/mail-list/confirm?error=invalid_token`)
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
      logger.warn('Invalid confirmation token used', {
        token: token.substring(0, 8) + '...' // Log partial token for debugging
      })
      return res.redirect(`${siteUrl}/mail-list/confirm?error=invalid_token`)
    }

    // Si ya está confirmado, redirigir a éxito
    if (subscription.status === 'confirmed') {
      logger.debug('Subscription already confirmed', {
        subscriptionId: subscription.id
      })
      return res.redirect(`${siteUrl}/mail-list/confirm?success=true`)
    }

    // Si está unsubscribed, permitir reconfirmar
    if (subscription.status === 'unsubscribed') {
      const { error: updateError } = await supabase
        .from('mail_list_subscriptions')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          unsubscribed_at: null,
        })
        .eq('id', subscription.id)

      if (updateError) {
        logger.error('Error updating subscription status', {
          subscriptionId: subscription.id,
          error: updateError.message
        })
        return res.redirect(`${siteUrl}/mail-list/confirm?error=update_failed`)
      }

      logger.info('Subscription reconfirmed after unsubscribe', {
        subscriptionId: subscription.id,
        email: subscription.email
      })
      return res.redirect(`${siteUrl}/mail-list/confirm?success=true`)
    }

    // Actualizar status a confirmed (RLS policy permite UPDATE por token)
    const { error: updateError } = await supabase
      .from('mail_list_subscriptions')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)

    if (updateError) {
      logger.error('Error confirming subscription', {
        subscriptionId: subscription.id,
        error: updateError.message
      })
      return res.redirect(`${siteUrl}/mail-list/confirm?error=update_failed`)
    }

    logger.info('Mail list subscription confirmed', {
      subscriptionId: subscription.id,
      email: subscription.email
    })

    // Redirigir a página de éxito
    return res.redirect(`${siteUrl}/mail-list/confirm?success=true`)
  } catch (error: any) {
    logger.error('Unexpected error confirming subscription', {
      error: error?.message || error,
      stack: error?.stack,
      token: token.substring(0, 8) + '...'
    })
    return res.redirect(`${siteUrl}/mail-list/confirm?error=server_error`)
  }
}

