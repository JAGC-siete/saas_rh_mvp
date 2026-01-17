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
    return res.status(400).json({ error: 'Token requerido.' })
  }

  try {
    // Buscar solicitud por token
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('affiliate_requests')
      .select('id, email, status')
      .eq('confirmation_token', token)
      .single()

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Token inválido o expirado.' })
    }

    return res.status(200).json({ 
      status: request.status,
      email: request.email
    })
  } catch (error: any) {
    console.error('Error verificando estado de solicitud:', error)
    return res.status(500).json({ error: 'Error procesando la solicitud.' })
  }
}








