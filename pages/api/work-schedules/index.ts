import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('⏰ Work Schedules API: Iniciando fetch de datos...')

    // Create Supabase client for Pages API
    const supabase = createClient(req, res)

    // Get user (more secure than getSession)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user's company_id
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !userProfile?.company_id) {
      return res.status(400).json({ error: 'User profile not found or no company assigned' })
    }

    // 1. Obtener todos los horarios de la compañía del usuario
    const { data: schedules, error: schedError } = await supabase
      .from('work_schedules')
      .select('id, name')
      .eq('company_id', userProfile.company_id)
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