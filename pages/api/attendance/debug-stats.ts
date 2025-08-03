import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔍 Debug endpoint: Iniciando...')
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Error de autenticación:', authError)
      return res.status(401).json({ error: 'Auth error', details: authError })
    }
    
    if (!user) {
      console.error('❌ No hay usuario autenticado')
      return res.status(401).json({ error: 'No user found' })
    }

    console.log('✅ Usuario autenticado:', user.email)

    // Verificar perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ Error obteniendo perfil:', profileError)
      return res.status(500).json({ error: 'Profile error', details: profileError })
    }

    console.log('✅ Perfil obtenido:', profile)

    // Verificar si hay empleados
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('count')
      .eq('status', 'active')

    if (empError) {
      console.error('❌ Error obteniendo empleados:', empError)
      return res.status(500).json({ error: 'Employees error', details: empError })
    }

    console.log('✅ Empleados activos:', employees?.length || 0)

    // Verificar si hay registros de asistencia de hoy
    const today = new Date().toISOString().split('T')[0]
    const { data: attendance, error: attError } = await supabase
      .from('attendance_records')
      .select('count')
      .eq('date', today)

    if (attError) {
      console.error('❌ Error obteniendo asistencia:', attError)
      return res.status(500).json({ error: 'Attendance error', details: attError })
    }

    console.log('✅ Registros de asistencia hoy:', attendance?.length || 0)

    // Retornar datos básicos
    res.status(200).json({
      success: true,
      user: {
        email: user.email,
        role: profile?.role,
        company_id: profile?.company_id
      },
      stats: {
        employees: employees?.length || 0,
        attendance: attendance?.length || 0,
        date: today
      },
      message: 'Debug endpoint funcionando correctamente'
    })

  } catch (error) {
    console.error('❌ Error general:', error)
    res.status(500).json({ error: 'Internal server error', details: error })
  }
} 