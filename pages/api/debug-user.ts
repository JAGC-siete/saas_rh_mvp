import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)
    
    // 1. Verificar sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      return res.status(500).json({ 
        error: 'Error obteniendo sesión',
        details: sessionError.message 
      })
    }

    if (!session) {
      return res.status(401).json({ 
        error: 'No hay sesión activa',
        message: 'Debe iniciar sesión'
      })
    }

    console.log('🔍 Debug - Sesión encontrada:', {
      userId: session.user.id,
      email: session.user.email,
      createdAt: session.user.created_at
    })

    // 2. Verificar perfil de usuario
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('❌ Error obteniendo perfil:', profileError)
      return res.status(500).json({ 
        error: 'Error obteniendo perfil',
        details: profileError.message,
        code: profileError.code
      })
    }

    if (!userProfile) {
      return res.status(404).json({ 
        error: 'Perfil no encontrado',
        message: 'No existe un perfil para este usuario',
        userId: session.user.id
      })
    }

    console.log('🔍 Debug - Perfil encontrado:', {
      id: userProfile.id,
      role: userProfile.role,
      companyId: userProfile.company_id,
      isActive: userProfile.is_active,
      createdAt: userProfile.created_at
    })

    // 3. Verificar si hay empresas
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, status')
      .limit(5)

    if (companiesError) {
      console.error('❌ Error obteniendo empresas:', companiesError)
    }

    // 4. Verificar empleados
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, employee_code, company_id, status')
      .limit(5)

    if (employeesError) {
      console.error('❌ Error obteniendo empleados:', employeesError)
    }

    // 5. Verificar políticas RLS
    const { data: rlsPolicies, error: rlsError } = await supabase
      .rpc('get_rls_policies', { table_name: 'user_profiles' })
      .catch(() => ({ data: null, error: { message: 'Función RPC no disponible' } }))

    return res.status(200).json({
      success: true,
      session: {
        userId: session.user.id,
        email: session.user.email,
        createdAt: session.user.created_at
      },
      userProfile: {
        id: userProfile.id,
        role: userProfile.role,
        companyId: userProfile.company_id,
        isActive: userProfile.is_active,
        createdAt: userProfile.created_at,
        permissions: userProfile.permissions
      },
      system: {
        companiesCount: companies?.length || 0,
        employeesCount: employees?.length || 0,
        companies: companies || [],
        employees: employees || [],
        rlsError: rlsError?.message
      }
    })

  } catch (error) {
    console.error('❌ Error general en debug:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
} 