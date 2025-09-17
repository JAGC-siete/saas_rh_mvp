import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

interface LoginRequest {
  last5: string
  pin: string
}

interface LoginResponse {
  success: boolean
  user?: any
  session?: any
  employee?: {
    id: string
    name: string
    dni_masked: string
    role: string
    department?: string
  }
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<LoginResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    const { last5, pin }: LoginRequest = req.body

    // Input validation
    if (!last5 || !pin || !/^\d{5}$/.test(last5) || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Credenciales inválidas' 
      })
    }

    const supabase = createClient(req, res)
    
    // PURE SUPABASE AUTH: Use synthetic email format
    const syntheticEmail = `${last5}@paragon.employee.local`
    
    // Authenticate using Supabase's built-in auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password: pin
    })

    if (error || !data.user) {
      logger.warn('Employee login failed', {
        last5,
        error: error?.message,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      })
      
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      })
    }

    // Get employee data from user metadata
    const employeeId = data.user.user_metadata?.employee_id
    if (!employeeId) {
      return res.status(401).json({
        success: false,
        error: 'Datos de empleado no encontrados'
      })
    }

    // Fetch employee details (RLS will automatically filter by authenticated user)
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        id, 
        name, 
        dni, 
        role,
        departments:department_id(name)
      `)
      .eq('id', employeeId)
      .single()

    if (employeeError || !employee) {
      logger.error('Employee data fetch failed', {
        employeeId,
        error: employeeError
      })
      
      return res.status(404).json({
        success: false,
        error: 'Empleado no encontrado'
      })
    }

    logger.info('Employee login successful', {
      employeeId: employee.id,
      employeeName: employee.name,
      method: 'supabase_auth'
    })

    return res.status(200).json({
      success: true,
      user: data.user,
      session: data.session,
      employee: {
        id: employee.id,
        name: employee.name,
        dni_masked: employee.dni.replace(/\d(?=\d{5})/g, '*'),
        role: employee.role || 'Empleado',
        department: (employee.departments as any)?.name
      }
    })

  } catch (error) {
    logger.error('Employee login error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}
