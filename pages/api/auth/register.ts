import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { validateAdminPassword } from '../../../lib/auth/password-policy'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password, fullName, companyName } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' })
    }

    const pw = validateAdminPassword(password)
    if (!pw.ok) {
      return res.status(400).json({ error: pw.message })
    }

    const supabase = createClient(req, res)

    // Sign up user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0],
          company_name: companyName || 'Mi Empresa'
        }
      }
    })

    if (authError) {
      logger.warn('Registration failed', { code: authError.status })
      return res.status(400).json({
        error:
          'No se pudo completar el registro. Verifica los datos o inicia sesión si ya tienes cuenta.'
      })
    }

    if (!authData.user) {
      return res.status(400).json({ error: 'Failed to create user' })
    }

    // The trigger will automatically create company, profile, and demo data
    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        needsEmailConfirmation: !authData.user.email_confirmed_at
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
