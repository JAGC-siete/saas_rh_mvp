import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    tests: {}
  }

  try {
    const supabase = createClient(req, res)
    
    // 1. Test de sesión
    console.log('🔍 Test 1: Verificando sesión...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    debugInfo.tests.session = {
      hasSession: !!session,
      sessionError: sessionError?.message,
      userId: session?.user?.id,
      email: session?.user?.email
    }

    if (!session) {
      return res.status(200).json({
        ...debugInfo,
        error: 'No hay sesión activa',
        nextStep: 'Iniciar sesión primero'
      })
    }

    // 2. Test de perfil de usuario
    console.log('🔍 Test 2: Verificando perfil de usuario...')
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    debugInfo.tests.userProfile = {
      hasProfile: !!userProfile,
      profileError: profileError?.message,
      profileData: userProfile ? {
        id: userProfile.id,
        role: userProfile.role,
        isActive: userProfile.is_active,
        companyId: userProfile.company_id,
        permissions: userProfile.permissions
      } : null
    }

    // 3. Test de empleados
    console.log('🔍 Test 3: Verificando acceso a empleados...')
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, employee_code, status')
      .limit(5)

    debugInfo.tests.employees = {
      count: employees?.length || 0,
      error: empError?.message,
      sample: employees?.slice(0, 2) || []
    }

    // 4. Test de nómina
    console.log('🔍 Test 4: Verificando acceso a nómina...')
    const { data: payroll, error: payrollError } = await supabase
      .from('payroll_records')
      .select('id, employee_id, period, total_gross')
      .limit(5)

    debugInfo.tests.payroll = {
      count: payroll?.length || 0,
      error: payrollError?.message,
      sample: payroll?.slice(0, 2) || []
    }

    // 5. Test de asistencia
    console.log('🔍 Test 5: Verificando acceso a asistencia...')
    const { data: attendance, error: attError } = await supabase
      .from('attendance_records')
      .select('id, employee_id, check_in, check_out')
      .limit(5)

    debugInfo.tests.attendance = {
      count: attendance?.length || 0,
      error: attError?.message,
      sample: attendance?.slice(0, 2) || []
    }

    // 6. Test de políticas RLS
    console.log('🔍 Test 6: Verificando políticas RLS...')
    let rlsPolicies = null
    let rlsError = null
    try {
      const result = await supabase.rpc('get_rls_policies', { table_name: 'user_profiles' })
      rlsPolicies = result.data
      rlsError = result.error
    } catch (error) {
      rlsError = { message: 'Función RPC no disponible' }
    }

    debugInfo.tests.rlsPolicies = {
      hasPolicies: !!rlsPolicies,
      error: rlsError?.message,
      policies: rlsPolicies
    }

    // 7. Test de configuración de tablas
    console.log('🔍 Test 7: Verificando configuración de tablas...')
    const { data: tableConfig, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .in('table_name', ['user_profiles', 'employees', 'payroll_records', 'attendance_records'])

    debugInfo.tests.tableConfig = {
      tables: tableConfig?.map(t => t.table_name) || [],
      error: tableError?.message
    }

    // 8. Test de permisos de usuario
    console.log('🔍 Test 8: Verificando permisos de usuario...')
    const { data: userPerms, error: permsError } = await supabase
      .from('information_schema.role_table_grants')
      .select('table_name, privilege_type')
      .eq('grantee', 'authenticated')
      .in('table_name', ['user_profiles', 'employees', 'payroll_records'])

    debugInfo.tests.userPermissions = {
      permissions: userPerms || [],
      error: permsError?.message
    }

    // 9. Test de endpoint de nómina
    console.log('🔍 Test 9: Verificando endpoint de nómina...')
    try {
      const payrollResponse = await fetch(`${req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000'}/api/payroll/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': req.headers.cookie || ''
        },
        body: JSON.stringify({
          periodo: '2025-01',
          quincena: 1,
          incluirDeducciones: false,
          soloEmpleadosConAsistencia: false
        })
      })

      debugInfo.tests.payrollEndpoint = {
        status: payrollResponse.status,
        statusText: payrollResponse.statusText,
        ok: payrollResponse.ok
      }
    } catch (endpointError) {
      debugInfo.tests.payrollEndpoint = {
        error: endpointError instanceof Error ? endpointError.message : 'Error desconocido'
      }
    }

    // 10. Resumen y diagnóstico
    const hasSession = debugInfo.tests.session.hasSession
    const hasProfile = debugInfo.tests.userProfile.hasProfile
    const hasEmployees = debugInfo.tests.employees.count > 0
    const hasPayrollAccess = !debugInfo.tests.payroll.error
    const hasAttendanceAccess = !debugInfo.tests.attendance.error

    debugInfo.diagnosis = {
      session: hasSession ? '✅ OK' : '❌ FALLO',
      profile: hasProfile ? '✅ OK' : '❌ FALLO',
      employees: hasEmployees ? '✅ OK' : '⚠️ SIN DATOS',
      payrollAccess: hasPayrollAccess ? '✅ OK' : '❌ FALLO',
      attendanceAccess: hasAttendanceAccess ? '✅ OK' : '❌ FALLO',
      overall: hasSession && hasProfile && hasPayrollAccess ? '✅ SISTEMA FUNCIONAL' : '❌ PROBLEMAS DETECTADOS'
    }

    debugInfo.recommendations = []
    
    if (!hasSession) {
      debugInfo.recommendations.push('Iniciar sesión primero')
    }
    if (!hasProfile) {
      debugInfo.recommendations.push('Crear perfil de usuario')
    }
    if (!hasEmployees) {
      debugInfo.recommendations.push('Crear empleados de prueba')
    }
    if (!hasPayrollAccess) {
      debugInfo.recommendations.push('Verificar políticas RLS para payroll_records')
    }

    return res.status(200).json(debugInfo)

  } catch (error) {
    console.error('❌ Error en diagnóstico completo:', error)
    return res.status(500).json({
      ...debugInfo,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
} 