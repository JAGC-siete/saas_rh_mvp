import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'
import { env } from '../../../lib/env'
import { logger } from '../../../lib/logger'
import { enforceAuthRateLimits } from '../../../lib/security/rate-limiting'

type ForgotPasswordResponse = {
  success: boolean
  message?: string
  error?: string
}

/**
 * Self-service password recovery for B2B/admin users (Supabase Auth email).
 * Always returns a neutral success message when email format is valid (no user enumeration).
 * Add /auth/update-password to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<ForgotPasswordResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : ''
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Email inválido'
    })
  }

  if (!enforceAuthRateLimits(req, res, 'auth_forgot_password', email)) {
    return
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    logger.error('forgot-password: Supabase URL or anon key not configured')
    return res.status(503).json({
      success: false,
      error: 'Servicio no disponible'
    })
  }

  const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  const nextPath = typeof req.body?.next === 'string' && req.body.next.startsWith('/') ? req.body.next : '/app/login'
  const redirectTo = `${siteUrl}/auth/update-password?next=${encodeURIComponent(nextPath)}`

  try {
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    if (error) {
      logger.warn('forgot-password: resetPasswordForEmail returned error (neutral response to client)', {
        code: error.message
      })
    }
  } catch (e) {
    logger.error('forgot-password: unexpected error', e)
  }

  return res.status(200).json({
    success: true,
    message:
      'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.'
  })
}
