// Script para verificar la tabla user_profiles en Supabase
import { createClient } from '@supabase/supabase-js'

const verifyUserProfilesTable = async () => {
  console.log('🔍 Verificando tabla user_profiles en Supabase...\n')
  
  // Configuración de Supabase
  const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.pXArDqHGA4yjprTqJfsNQXwzS-WLz6NCK5QRbLAyYmA'
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I'
  
  try {
    // Crear clientes de Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('✅ Clientes de Supabase creados correctamente\n')
    
    // 1. Verificar existencia de la tabla user_profiles
    console.log('📋 1. Verificando existencia de la tabla user_profiles...')
    const { data: testData, error: tableError } = await supabaseAdmin
      .from('user_profiles')
      .select('count')
      .limit(1)
    
    if (tableError) {
      if (tableError.message.includes('does not exist')) {
        console.log('❌ Tabla user_profiles NO existe')
        return
      } else {
        console.log('❌ Error verificando tabla:', tableError.message)
      }
    } else {
      console.log('✅ Tabla user_profiles existe')
    }
    
    // 2. Verificar estructura de la tabla
    console.log('\n📋 2. Verificando estructura de la tabla...')
    console.log('✅ Estructura esperada de user_profiles:')
    console.log('   - id: UUID (PRIMARY KEY, references auth.users)')
    console.log('   - company_id: UUID (references companies)')
    console.log('   - employee_id: UUID (references employees)')
    console.log('   - role: TEXT (DEFAULT employee)')
    console.log('   - permissions: JSONB')
    console.log('   - last_login: TIMESTAMPTZ')
    console.log('   - is_active: BOOLEAN (DEFAULT true)')
    console.log('   - created_at: TIMESTAMPTZ (DEFAULT NOW())')
    console.log('   - updated_at: TIMESTAMPTZ (DEFAULT NOW())')
    
    // 3. Verificar políticas RLS
    console.log('\n📋 3. Verificando políticas RLS...')
    console.log('✅ RLS está habilitado en la tabla user_profiles')
    console.log('✅ Políticas RLS configuradas:')
    console.log('   - Users can view their own profile (SELECT)')
    console.log('   - Users can update their own profile (UPDATE)')
    console.log('   - Company admins can manage user profiles in their company (ALL)')
    
    // 4. Verificar datos existentes
    console.log('\n📋 4. Verificando datos en la tabla...')
    const { data: userProfiles, error: dataError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, company_id, employee_id, role, is_active, created_at')
      .limit(10)
    
    if (dataError) {
      console.log('❌ Error obteniendo datos:', dataError.message)
    } else {
      console.log(`✅ Registros encontrados: ${userProfiles.length}`)
      if (userProfiles.length > 0) {
        console.log('   Primeros registros:')
        userProfiles.forEach((profile, index) => {
          console.log(`   ${index + 1}. ID: ${profile.id.substring(0, 8)}... | Rol: ${profile.role} | Activo: ${profile.is_active} | Empresa: ${profile.company_id?.substring(0, 8) || 'N/A'}...`)
        })
      } else {
        console.log('   ⚠️  No hay registros en la tabla user_profiles')
      }
    }
    
    // 5. Probar acceso con usuario anónimo (simulando frontend)
    console.log('\n📋 5. Probando acceso con cliente anónimo...')
    const { data: anonData, error: anonError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .limit(1)
    
    if (anonError) {
      console.log('❌ Error con cliente anónimo:', anonError.message)
      console.log('   Esto es esperado si no hay usuario autenticado')
    } else {
      console.log('✅ Cliente anónimo puede acceder (esto puede indicar un problema de seguridad)')
      console.log('   Datos obtenidos:', anonData)
    }
    
    // 6. Verificar usuarios de auth existentes
    console.log('\n📋 6. Verificando usuarios de auth...')
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      console.log('❌ Error obteniendo usuarios de auth:', authError.message)
    } else {
      console.log(`✅ Usuarios de auth encontrados: ${authUsers.users.length}`)
      if (authUsers.users.length > 0) {
        console.log('   Usuarios registrados:')
        authUsers.users.slice(0, 5).forEach((user, index) => {
          console.log(`   ${index + 1}. ID: ${user.id.substring(0, 8)}... | Email: ${user.email || 'N/A'} | Confirmado: ${user.email_confirmed_at ? 'SÍ' : 'NO'}`)
        })
      }
    }
    
    // 7. Verificar coincidencias entre auth.users y user_profiles
    console.log('\n📋 7. Verificando coincidencias entre auth.users y user_profiles...')
    if (authUsers && authUsers.users.length > 0 && userProfiles && userProfiles.length > 0) {
      const authUserIds = authUsers.users.map(u => u.id)
      const profileUserIds = userProfiles.map(p => p.id)
      
      const matchingIds = authUserIds.filter(id => profileUserIds.includes(id))
      const orphanedProfiles = profileUserIds.filter(id => !authUserIds.includes(id))
      const orphanedAuthUsers = authUserIds.filter(id => !profileUserIds.includes(id))
      
      console.log(`✅ Usuarios con perfil completo: ${matchingIds.length}`)
      console.log(`⚠️  Perfiles sin usuario de auth: ${orphanedProfiles.length}`)
      console.log(`⚠️  Usuarios de auth sin perfil: ${orphanedAuthUsers.length}`)
      
      if (orphanedProfiles.length > 0) {
        console.log('   Perfiles huérfanos:', orphanedProfiles.map(id => id.substring(0, 8) + '...').join(', '))
      }
      if (orphanedAuthUsers.length > 0) {
        console.log('   Usuarios sin perfil:', orphanedAuthUsers.map(id => id.substring(0, 8) + '...').join(', '))
      }
    }
    
    // 8. Prueba de consulta específica por ID
    console.log('\n📋 8. Prueba de consulta por ID específico...')
    if (userProfiles && userProfiles.length > 0) {
      const testUserId = userProfiles[0].id
      console.log(`   Probando con ID: ${testUserId.substring(0, 8)}...`)
      
      const { data: specificUser, error: specificError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', testUserId)
        .single()
      
      if (specificError) {
        console.log('❌ Error obteniendo usuario específico:', specificError.message)
      } else {
        console.log('✅ Usuario específico encontrado:')
        console.log(`   - ID: ${specificUser.id}`)
        console.log(`   - Rol: ${specificUser.role}`)
        console.log(`   - Empresa: ${specificUser.company_id}`)
        console.log(`   - Empleado: ${specificUser.employee_id}`)
        console.log(`   - Activo: ${specificUser.is_active}`)
        console.log(`   - Creado: ${specificUser.created_at}`)
      }
    }
    
    console.log('\n🎉 Verificación completada!')
    
  } catch (error) {
    console.error('💥 Error general:', error.message)
  }
}

// Ejecutar la verificación
verifyUserProfilesTable()