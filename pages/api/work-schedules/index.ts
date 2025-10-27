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

    // Get user's company_id (optional for now)
    let companyId = '00000000-0000-0000-0000-000000000001' // Default company ID
    
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profileError && userProfile?.company_id) {
        companyId = userProfile.company_id
        console.log('✅ Found company_id for user:', companyId)
      } else {
        console.log('⚠️ No user profile found or no company_id:', profileError)
      }
    } catch (error) {
      console.log('⚠️ Error fetching user profile, using default company ID:', error)
    }

    // 1. Obtener todos los horarios de la compañía del usuario
    const { data: schedules, error: schedError } = await supabase
      .from('work_schedules')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name')

    if (schedError) {
      console.error('❌ Error fetching work schedules:', schedError)
      return res.status(500).json({ error: 'Error fetching work schedules', details: schedError.message })
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