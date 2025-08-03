import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔍 DEBUG: Auth debug endpoint called')
    
    // Verificar headers
    const headers = {
      'authorization': req.headers.authorization,
      'cookie': req.headers.cookie ? 'Present' : 'Missing',
      'user-agent': req.headers['user-agent'],
      'host': req.headers.host
    }
    
    console.log('📋 Headers:', headers)

    // Intentar obtener usuario
    const supabase = createClient(req, res)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('👤 User data:', user ? { id: user.id, email: user.email } : 'No user')
    console.log('❌ Auth error:', authError)

    // Verificar sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('🔐 Session:', session ? 'Present' : 'Missing')
    console.log('❌ Session error:', sessionError)

    // Verificar perfil de usuario si existe
    let userProfile = null
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .single()
      
      userProfile = profile
      console.log('👥 User profile:', profile)
      console.log('❌ Profile error:', profileError)
    }

    // Respuesta de debug
    const debugInfo = {
      timestamp: new Date().toISOString(),
      headers,
      user: user ? {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at
      } : null,
      session: session ? {
        access_token: session.access_token ? 'Present' : 'Missing',
        refresh_token: session.refresh_token ? 'Present' : 'Missing',
        expires_at: session.expires_at
      } : null,
      userProfile,
      errors: {
        auth: authError?.message,
        session: sessionError?.message
      },
      environment: {
        node_env: process.env.NODE_ENV,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
      }
    }

    console.log('📊 Debug info:', JSON.stringify(debugInfo, null, 2))

    return res.status(200).json(debugInfo)
  } catch (error) {
    console.error('💥 Debug endpoint error:', error)
    return res.status(500).json({ 
      error: 'Debug endpoint error', 
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    })
  }
} 