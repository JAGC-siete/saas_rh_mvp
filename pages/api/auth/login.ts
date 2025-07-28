import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { createAdminClient } from '../../../lib/supabase/server'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' })
    }

    // Usar Supabase Auth para autenticación (con anon key para login)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Configuración de Supabase incompleta' })
    }
    
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      console.error('Supabase Auth Error:', authError)
      return res.status(401).json({ 
        error: 'Credenciales inválidas',
        debug: process.env.NODE_ENV === 'development' ? authError.message : undefined
      })
    }

    if (!authData.user) {
      console.error('No user data returned from Supabase')
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    // Buscar información adicional del usuario en la tabla employees
    let userRole = 'admin' // Por defecto
    let userName = authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'Usuario'

    // Buscar rol en tabla employees si es empleado
    const { data: employee } = await supabase
      .from('employees')
      .select('name, role, position')
      .eq('dni', email) // Si usas email en vez de DNI
      .single()

    if (employee) {
      userName = employee.name
      // Determinar rol basado en posición
      if (employee.position?.toLowerCase().includes('gerente') || 
          employee.position?.toLowerCase().includes('manager') ||
          employee.role?.toLowerCase().includes('jefe')) {
        userRole = 'manager'
      } else if (employee.position?.toLowerCase().includes('recursos humanos') ||
                 employee.position?.toLowerCase().includes('hr')) {
        userRole = 'hr'
      } else {
        userRole = 'employee'
      }
    }

    // Crear token JWT personalizado
    const token = jwt.sign(
      { 
        userId: authData.user.id, 
        email: authData.user.email, 
        role: userRole,
        supabaseToken: authData.session?.access_token
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    return res.status(200).json({
      token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: userName,
        role: userRole
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
