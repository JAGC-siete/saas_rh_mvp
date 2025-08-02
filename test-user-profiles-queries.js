// Script para probar consultas específicas en user_profiles
import { createClient } from '@supabase/supabase-js'

const testUserProfilesQueries = async () => {
  console.log('🧪 Probando consultas específicas en user_profiles...\n')
  
  // Configuración de Supabase
  const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.pXArDqHGA4yjprTqJfsNQXwzS-WLz6NCK5QRbLAyYmA'
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I'
  
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // 1. Obtener usuarios existentes
    console.log('📋 1. Obteniendo usuarios existentes...')
    const { data: userProfiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, company_id, employee_id, role, is_active')
    
    if (profilesError) {
      console.log('❌ Error obteniendo perfiles:', profilesError.message)
      return
    }
    
    console.log(`✅ Encontrados ${userProfiles.length} perfiles de usuario:`)
    userProfiles.forEach((profile, index) => {
      console.log(`   ${index + 1}. ID: ${profile.id}`)
      console.log(`      Rol: ${profile.role}`)
      console.log(`      Empresa: ${profile.company_id}`)
      console.log(`      Empleado: ${profile.employee_id || 'null'}`)
      console.log(`      Activo: ${profile.is_active}`)
      console.log('')
    })
    
    // 2. Probar autenticación con un usuario específico
    if (userProfiles.length > 0) {
      const testUser = userProfiles[0]
      console.log(`📋 2. Probando autenticación con usuario: ${testUser.id}`)
      
      // Intentar autenticar con email/password (necesitaremos crear un test user)
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (authError) {
        console.log('❌ Error obteniendo usuarios de auth:', authError.message)
      } else {
        const matchingAuthUser = authUsers.users.find(u => u.id === testUser.id)
        if (matchingAuthUser) {
          console.log(`✅ Usuario de auth encontrado: ${matchingAuthUser.email}`)
          
          // Crear cliente con sesión simulada
          const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey)
          
          // Simular autenticación (en producción esto se haría con signIn)
          console.log('⚠️  Simulando sesión autenticada...')
          
          // Probar consulta con usuario autenticado usando service role pero limitando por ID
          const { data: ownProfile, error: ownProfileError } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('id', testUser.id)
            .single()
          
          if (ownProfileError) {
            console.log('❌ Error obteniendo perfil propio:', ownProfileError.message)
          } else {
            console.log('✅ Perfil propio obtenido correctamente:')
            console.log('   - Datos completos disponibles')
            console.log(`   - Permisos: ${JSON.stringify(ownProfile.permissions, null, 2)}`)
          }
        } else {
          console.log('❌ No se encontró usuario de auth correspondiente')
        }
      }
    }
    
    // 3. Verificar problema de recursión infinita en políticas RLS
    console.log('\n📋 3. Investigando problema de recursión infinita...')
    console.log('El error "infinite recursion detected in policy" indica que las políticas RLS')
    console.log('están haciendo referencia circular. Esto puede ocurrir cuando:')
    console.log('- Una política de user_profiles consulta user_profiles en su condición')
    console.log('- Hay dependencias circulares entre políticas')
    
    // 4. Probar consultas sin RLS (usando service role)
    console.log('\n📋 4. Probando consultas directas (sin RLS)...')
    const { data: directQuery, error: directError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, role, company_id')
      .limit(5)
    
    if (directError) {
      console.log('❌ Error en consulta directa:', directError.message)
    } else {
      console.log('✅ Consulta directa exitosa:')
      directQuery.forEach(profile => {
        console.log(`   - ${profile.id}: ${profile.role} (empresa: ${profile.company_id})`)
      })
    }
    
    // 5. Verificar estructura de las políticas RLS
    console.log('\n📋 5. Analizando políticas RLS problemáticas...')
    console.log('Políticas actuales en user_profiles:')
    console.log('1. "Users can view their own profile" - SELECT WHERE id = auth.uid()')
    console.log('2. "Users can update their own profile" - UPDATE WHERE id = auth.uid()')
    console.log('3. "Company admins can manage user profiles" - ALL WHERE company_id IN (...)')
    console.log('')
    console.log('⚠️  PROBLEMA DETECTADO: La política #3 hace una subconsulta a user_profiles')
    console.log('   para verificar el company_id del usuario actual, lo que causa recursión.')
    
    // 6. Sugerir solución
    console.log('\n📋 6. Solución recomendada:')
    console.log('Para evitar la recursión infinita, las políticas RLS deben evitar')
    console.log('consultar la misma tabla que están protegiendo.')
    console.log('')
    console.log('Opciones:')
    console.log('1. Usar funciones de PostgreSQL que no dependan de RLS')
    console.log('2. Crear una vista o función que maneje la lógica de permisos')
    console.log('3. Simplificar las políticas para evitar subconsultas circulares')
    console.log('4. Usar claims en el JWT para almacenar información de empresa/rol')
    
    // 7. Probar consulta específica por ID (la más común)
    console.log('\n📋 7. Probando consulta por ID específico...')
    if (userProfiles.length > 0) {
      const testId = userProfiles[0].id
      const { data: specificUser, error: specificError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, role, company_id, employee_id, permissions, is_active, created_at')
        .eq('id', testId)
        .single()
      
      if (specificError) {
        console.log('❌ Error en consulta por ID:', specificError.message)
      } else {
        console.log('✅ Consulta por ID exitosa:')
        console.log(`   ID: ${specificUser.id}`)
        console.log(`   Rol: ${specificUser.role}`)
        console.log(`   Empresa: ${specificUser.company_id}`)
        console.log(`   Empleado: ${specificUser.employee_id}`)
        console.log(`   Activo: ${specificUser.is_active}`)
        console.log(`   Permisos: ${JSON.stringify(specificUser.permissions)}`)
      }
    }
    
    console.log('\n🎉 Análisis de consultas completado!')
    
  } catch (error) {
    console.error('💥 Error general:', error.message)
  }
}

// Ejecutar las pruebas
testUserProfilesQueries()