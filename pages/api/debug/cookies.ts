import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Obtener todas las cookies de la petición
    const allCookies = req.cookies || {}
    const cookieNames = Object.keys(allCookies)
    
    // Filtrar cookies relacionadas con Supabase
    const supabaseCookies = cookieNames.filter(name => 
      name.includes('sb-') || 
      name.includes('supabase') || 
      name.includes('auth-token') ||
      name.includes('session')
    )
    
    // Crear cliente de Supabase para verificar sesión
    const supabase = createClient(req, res)
    
    // Intentar obtener la sesión actual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Información de debug
    const debugInfo = {
      timestamp: new Date().toISOString(),
      cookies: {
        total: cookieNames.length,
        all: allCookies,
        supabase: supabaseCookies.reduce((acc: Record<string, any>, name) => {
          acc[name] = {
            exists: !!allCookies[name],
            hasValue: !!allCookies[name] && allCookies[name].length > 0,
            valueLength: allCookies[name]?.length || 0,
            value: allCookies[name] ? allCookies[name].substring(0, 20) + '...' : null
          }
          return acc
        }, {})
      },
      session: {
        exists: !!session,
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        error: sessionError?.message || userError?.message
      },
      headers: {
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer,
        origin: req.headers.origin,
        host: req.headers.host
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
      }
    }
    
    console.log('🍪 Debug de cookies:', debugInfo)
    
    return res.status(200).json(debugInfo)
    
  } catch (error) {
    console.error('❌ Error en debug de cookies:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}
