import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' })
    }

    // Use Supabase client with cookie handling
    const supabase = createClient(req, res)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error || !data.user) {
      console.error('Login error:', error)
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    // Get user role from employees table if exists
    let userRole = 'admin' // Default role
    let userName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuario'

    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('name, role, position')
        .eq('dni', email)
        .single()

      if (employee) {
        userName = employee.name
        // Determine role based on position
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
    } catch (employeeError) {
      // Employee not found, use default role
      console.log('Employee not found in database, using default role')
    }

    // Return success - Supabase handles the session automatically via cookies
    return res.status(200).json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: userName,
        role: userRole
      },
      message: 'Login successful - session managed by Supabase'
    })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
} 