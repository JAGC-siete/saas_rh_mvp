import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { last5 } = req.body

    if (!last5 || !/^\d{5}$/.test(last5)) {
      return res.status(400).json({ error: 'Los últimos 5 dígitos del DNI son requeridos' })
    }

    console.log('🔍 Testing Supabase connection with last5:', last5)

    // Check environment variables first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase environment variables')
      return res.status(500).json({ 
        error: 'Missing Supabase environment variables',
        env: {
          url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      })
    }

    // Test basic connection first
    const supabase = createAdminClient()
    console.log('✅ Supabase client created successfully')
    
    // Simple query first
    const { error: testError } = await supabase
      .from('employees')
      .select('id, name, dni')
      .limit(1)

    if (testError) {
      console.error('Basic connection test failed:', testError)
      return res.status(500).json({ 
        error: 'Error en la conexión a la base de datos',
        details: testError.message 
      })
    }

    console.log('Basic connection works, testing DNI search...')

    // Now try DNI search
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, dni, position, status')
      .ilike('dni', `%${last5}`)
      .eq('status', 'active')

    if (empError) {
      console.error('DNI search failed:', empError)
      return res.status(500).json({ 
        error: 'Error buscando empleado',
        details: empError.message 
      })
    }

    console.log('Found employees:', employees)

    if (!employees || employees.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado con esos dígitos del DNI' })
    }

    if (employees.length > 1) {
      return res.status(400).json({ error: 'Múltiples empleados encontrados. Contacte a RH.' })
    }

    const employee = employees[0]

    return res.status(200).json({
      employee: {
        id: employee.id,
        name: employee.name,
        dni: employee.dni,
        position: employee.position,
        checkin_time: '08:00',
        checkout_time: '17:00',
        company_name: 'Test Company'
      },
      attendance: {
        hasCheckedIn: false,
        hasCheckedOut: false,
        checkInTime: null,
        checkOutTime: null
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
