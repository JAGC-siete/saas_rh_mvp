import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔍 Probando conexión con Supabase desde Railway...')
    
    const supabase = createAdminClient()
    
    // Probar consulta de empleados
    console.log('📋 Consultando empleados...')
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, dni')
      .limit(3)
    
    if (empError) {
      console.error('❌ Error consultando empleados:', empError)
      return res.status(500).json({ 
        error: 'Error consultando empleados',
        details: empError.message 
      })
    }
    
    // Probar consulta de horarios
    console.log('📋 Consultando horarios...')
    const { data: schedules, error: schedError } = await supabase
      .from('work_schedules')
      .select('id, name')
      .limit(3)
    
    if (schedError) {
      console.error('❌ Error consultando horarios:', schedError)
      return res.status(500).json({ 
        error: 'Error consultando horarios',
        details: schedError.message 
      })
    }
    
    console.log('✅ Todas las consultas exitosas')
    
    return res.status(200).json({ 
      message: 'Conexión con Supabase exitosa',
      employees: employees || [],
      schedules: schedules || [],
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error general:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 