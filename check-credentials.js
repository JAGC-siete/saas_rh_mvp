import { createClient } from '@supabase/supabase-js'

// Load environment variables
const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCredentials() {
  try {
    console.log('🔍 Verificando credenciales disponibles...\n')
    
    // Check auth.users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Error obteniendo usuarios:', usersError.message)
      return
    }
    
    console.log('📋 USUARIOS DISPONIBLES:')
    console.log('========================')
    
    users.users.forEach((user, index) => {
      console.log(`${index + 1}. 📧 Email: ${user.email}`)
      console.log(`   👤 ID: ${user.id}`)
      console.log(`   ✅ Confirmado: ${user.email_confirmed_at ? 'Sí' : 'No'}`)
      console.log(`   🔒 Último login: ${user.last_sign_in_at || 'Nunca'}`)
      console.log('')
    })
    
    // Check user_profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
    
    if (profilesError) {
      console.error('❌ Error obteniendo perfiles:', profilesError.message)
      return
    }
    
    console.log('👥 PERFILES DE USUARIO:')
    console.log('=======================')
    
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. 👤 ID: ${profile.id}`)
      console.log(`   🏢 Company ID: ${profile.company_id}`)
      console.log(`   👔 Rol: ${profile.role}`)
      console.log(`   🔑 Permisos: ${JSON.stringify(profile.permissions)}`)
      console.log('')
    })
    
    console.log('🎯 CREDENCIALES DE PRUEBA RECOMENDADAS:')
    console.log('=====================================')
    console.log('1. jorge7gomez@gmail.com / jorge123456 (Recién creado)')
    console.log('2. Revisar usuarios anteriores en la lista de arriba')
    
  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

checkCredentials() 