import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fwyxmovfrzauebiqxchz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('⏰ Work Schedules API: Iniciando fetch de datos...')

    // 1. Obtener todos los horarios
    const { data: schedules, error: schedError } = await supabase
      .from('work_schedules')
      .select('id, name')
      .order('name')

    if (schedError) {
      console.error('❌ Error fetching work schedules:', schedError)
      return res.status(500).json({ error: 'Error fetching work schedules' })
    }

    console.log('✅ Work schedules obtenidos:', schedules?.length || 0)

    const response = {
      schedules: schedules || []
    }

    console.log('✅ Work Schedules API: Datos procesados exitosamente')
    console.log('📊 Resumen:', {
      totalSchedules: response.schedules.length
    })

    res.status(200).json(response)

  } catch (error) {
    console.error('💥 Work Schedules API: Error inesperado:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}