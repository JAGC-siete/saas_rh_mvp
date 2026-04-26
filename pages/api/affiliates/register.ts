import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { withRateLimit } from '../../../lib/security/rate-limiting'
import { env } from '../../../lib/env'

export default withRateLimit('general')(handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Servicio no disponible. Intenta más tarde.' })
  }
  const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  if (Array.isArray(req.body)) {
    const results = []
    for (const item of req.body) {
      const { name, email, password } = item

      if (!name || !email || !password) {
        results.push({ success: false, message: 'Todos los campos son requeridos.' })
        continue
      }

      try {
        // 1. Create a new user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        })

        if (authError) {
          if (authError.message.includes('User already registered')) {
            results.push({ success: false, message: 'Este correo electrónico ya está registrado.' })
          } else {
            results.push({ success: false, message: authError.message })
          }
          continue
        }

        const user = authData.user
        if (!user) {
          results.push({ success: false, message: 'No se pudo crear el usuario.' })
          continue
        }

        // 2. Create a profile for the new user
        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            id: user.id,
            role: 'affiliate',
            is_b2c: true
          })

        if (profileError) {
          // Rollback: delete user
          await supabaseAdmin.auth.admin.deleteUser(user.id)
          results.push({ success: false, message: profileError.message })
          continue
        }

        // 3. Create an affiliate record with retry for unique referral code
        let referralCode
        let affiliateError
        let attempts = 0
        const maxAttempts = 10

        do {
          referralCode = randomBytes(4).toString('hex')
          const { error } = await supabaseAdmin
            .from('affiliates')
            .insert({
              user_id: user.id,
              referral_code: referralCode,
              status: 'pending',
            })

          affiliateError = error
          attempts++

          if (!affiliateError) break

          if (affiliateError.code !== '23505') { // Not unique violation
            results.push({ success: false, message: affiliateError.message })
            break // Stop retrying for this item
          }
        } while (attempts < maxAttempts)

        if (affiliateError) {
          // Rollback: delete profile and user
          await supabaseAdmin.from('user_profiles').delete().eq('id', user.id)
          await supabaseAdmin.auth.admin.deleteUser(user.id)
          results.push({ success: false, message: affiliateError.message })
          continue
        }

        results.push({ success: true, message: 'Registro de afiliado exitoso.' })
      } catch (error: any) {
        console.error('Error en registro de afiliado:', error)
        results.push({ success: false, message: error.message || 'Ocurrió un error en el servidor.' })
      }
    }
    res.status(200).json({ results })
    return
  }

  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son requeridos.' })
  }

  try {
    // 1. Create a new user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })

    if (authError) {
      if (authError.message.includes('User already registered')) {
        return res.status(409).json({ error: 'Este correo electrónico ya está registrado.' })
      }
      throw authError
    }

    const user = authData.user
    if (!user) {
      throw new Error('No se pudo crear el usuario.')
    }

    // 2. Create a profile for the new user
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: user.id,
        role: 'affiliate',
        is_b2c: true
      })

    if (profileError) {
      // Rollback: delete user
      await supabaseAdmin.auth.admin.deleteUser(user.id)
      throw profileError
    }

    // 3. Create an affiliate record with retry for unique referral code
    let referralCode
    let affiliateError
    let attempts = 0
    const maxAttempts = 10

    do {
      referralCode = randomBytes(4).toString('hex')
      const { error } = await supabaseAdmin
        .from('affiliates')
        .insert({
          user_id: user.id,
          referral_code: referralCode,
          status: 'pending',
        })

      affiliateError = error
      attempts++

      if (!affiliateError) break

      if (affiliateError.code !== '23505') { // Not unique violation
        throw affiliateError
      }
    } while (attempts < maxAttempts)

    if (affiliateError) {
      // Rollback: delete profile and user
      await supabaseAdmin.from('user_profiles').delete().eq('id', user.id)
      await supabaseAdmin.auth.admin.deleteUser(user.id)
      throw affiliateError
    }

    res.status(201).json({ message: 'Registro de afiliado exitoso.' })
  } catch (error: any) {
    console.error('Error en registro de afiliado:', error)
    res.status(500).json({ error: error.message || 'Ocurrió un error en el servidor.' })
  }
}
