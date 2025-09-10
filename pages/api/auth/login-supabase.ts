
import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Para rutas de login, no validamos autenticación previa
    // pero sí validamos que sea una petición válida
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' })
    }

    // Usar Supabase Auth para autenticación
    const supabase = createAdminClient()
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    // Buscar información del usuario en user_profiles (sistema correcto)
    let userRole = 'employee' // Por defecto
    let userName = authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'Usuario'
    let companyId = null

    // Buscar perfil de usuario en user_profiles
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, company_id, employee_id, permissions')
      .eq('id', authData.user.id)
      .single()

    if (userProfile) {
      userRole = userProfile.role
      companyId = userProfile.company_id
      
      // Si tiene employee_id, obtener nombre del empleado
      if (userProfile.employee_id) {
        const { data: employee } = await supabase
          .from('employees')
          .select('name')
          .eq('id', userProfile.employee_id)
          .single()
        
        if (employee) {
          userName = employee.name
        }
      }
    } else {
      // Si no tiene perfil, crear uno básico
      console.warn('User profile not found, creating basic profile for:', authData.user.email)
      userRole = 'employee' // Rol por defecto
    }

    // Set Supabase session cookies for middleware compatibility
    if (authData.session) {
      const { access_token, refresh_token, expires_at } = authData.session
      const maxAge = expires_at ? expires_at - Math.floor(Date.now() / 1000) : 86400 // Default to 24 hours if expires_at is undefined
      
      // Set the session cookies that Supabase expects (correct names)
      res.setHeader('Set-Cookie', [
        `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token=${access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,
        `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token.${Math.random().toString(36).substring(2)}=${refresh_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
      ])
    }

    return res.status(200).json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: userName,
        role: userRole,
        company_id: companyId
      },
      session: authData.session
    })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}