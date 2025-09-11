
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' })
    }

    // Usar el cliente con cookies para autenticación
    const supabase = createClient(req, res)
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    // Buscar información del usuario en user_profiles usando admin client
    const adminSupabase = createAdminClient()
    let userRole = 'employee' // Por defecto
    let userName = authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'Usuario'
    let companyId = null

    // Buscar perfil de usuario en user_profiles
    const { data: userProfile } = await adminSupabase
      .from('user_profiles')
      .select('role, company_id, employee_id, permissions')
      .eq('id', authData.user.id)
      .single()

    if (userProfile) {
      userRole = userProfile.role
      companyId = userProfile.company_id
      
      // Si tiene employee_id, obtener nombre del empleado
      if (userProfile.employee_id) {
        const { data: employee } = await adminSupabase
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

    console.log('🔍 Debug login response:', {
      hasUser: !!authData.user,
      hasSession: !!authData.session,
      sessionKeys: authData.session ? Object.keys(authData.session) : 'no session',
      cookiesSet: res.getHeader('Set-Cookie')
    })

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