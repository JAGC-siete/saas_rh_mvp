import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL and service role key are required.')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
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

    if (profileError) throw profileError

    // 3. Create an affiliate record
    const referralCode = randomBytes(4).toString('hex') // 8-char code
    const { error: affiliateError } = await supabaseAdmin
      .from('affiliates')
      .insert({
        user_id: user.id,
        referral_code: referralCode,
        status: 'pending',
      })

    if (affiliateError) throw affiliateError

    res.status(201).json({ message: 'Registro de afiliado exitoso.' })
  } catch (error: any) {
    console.error('Error en registro de afiliado:', error)
    res.status(500).json({ error: error.message || 'Ocurrió un error en el servidor.' })
  }
}
