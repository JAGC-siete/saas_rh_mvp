import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL and service role key are required.')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { token } = req.query

  if (!token || typeof token !== 'string') {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
    return res.redirect(`${siteUrl}/mail-list/unsubscribe?error=invalid_token`)
  }

  try {
    // Buscar suscripción por token
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('mail_list_subscriptions')
      .select('id, email, status')
      .eq('confirmation_token', token)
      .single()

    if (fetchError || !subscription) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
      return res.redirect(`${siteUrl}/mail-list/unsubscribe?error=invalid_token`)
    }

    // Si ya está unsubscribed, redirigir a confirmación
    if (subscription.status === 'unsubscribed') {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
      return res.redirect(`${siteUrl}/mail-list/unsubscribe?success=true`)
    }

    // Actualizar status a unsubscribed
    const { error: updateError } = await supabaseAdmin
      .from('mail_list_subscriptions')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)

    if (updateError) {
      console.error('Error dando de baja suscripción:', updateError)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
      return res.redirect(`${siteUrl}/mail-list/unsubscribe?error=update_failed`)
    }

    // Redirigir a página de confirmación
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
    return res.redirect(`${siteUrl}/mail-list/unsubscribe?success=true`)
  } catch (error: any) {
    console.error('Error en baja de suscripción:', error)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
    return res.redirect(`${siteUrl}/mail-list/unsubscribe?error=server_error`)
  }
}

