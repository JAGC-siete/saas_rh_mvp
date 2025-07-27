import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { createAdminClient } from '../../../lib/supabase/server'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' })
    }

    const token = authHeader.substring(7)

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      
      // Validar con Supabase si el usuario aún existe y está activo
      const supabase = createAdminClient()
      
      // Verificar el token de Supabase si está disponible
      if (decoded.supabaseToken) {
        const { data: userData, error } = await supabase.auth.getUser(decoded.supabaseToken)
        
        if (error || !userData.user) {
          return res.status(401).json({ error: 'Sesión de Supabase inválida' })
        }
      }

      // Buscar información adicional del usuario si es empleado
      let userInfo = {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.email?.split('@')[0] || 'Usuario',
        role: decoded.role || 'admin'
      }

      // Buscar en tabla employees para información adicional
      const { data: employee } = await supabase
        .from('employees')
        .select('name, role, position')
        .eq('dni', decoded.email)
        .single()

      if (employee) {
        userInfo.name = employee.name
        // Actualizar rol basado en posición actual
        if (employee.position?.toLowerCase().includes('gerente') || 
            employee.position?.toLowerCase().includes('manager') ||
            employee.role?.toLowerCase().includes('jefe')) {
          userInfo.role = 'manager'
        } else if (employee.position?.toLowerCase().includes('recursos humanos') ||
                   employee.position?.toLowerCase().includes('hr')) {
          userInfo.role = 'hr'
        } else {
          userInfo.role = 'employee'
        }
      }

      return res.status(200).json({ user: userInfo })

    } catch (jwtError) {
      return res.status(401).json({ error: 'Token inválido' })
    }

  } catch (error) {
    console.error('Validation error:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
