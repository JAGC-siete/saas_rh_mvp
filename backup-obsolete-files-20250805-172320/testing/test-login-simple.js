const { createClient } = require('@supabase/supabase-js')

// Supabase credentials (using anon key for auth)
const SUPABASE_URL = 'https://fwyxmovfrzauebiqxchz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.pXArDqHGA4yjprTqJfsNQXwzS-WLz6NCK5QRbLAyYmA'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testLogin() {
  try {
    console.log('🔐 Probando login...\n')
    
    const email = 'jorge7gomez@gmail.com'
    const password = 'jorge123456'
    
    console.log(`📧 Email: ${email}`)
    console.log(`🔑 Password: ${password}\n`)
    
    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    })
    
    if (error) {
      console.error('❌ Error de login:', error.message)
      
      if (error.message.includes('Invalid login credentials')) {
        console.log('\n💡 Posibles soluciones:')
        console.log('1. Verificar que el email esté correcto')
        console.log('2. Verificar que la contraseña esté correcta')
        console.log('3. El usuario puede no existir o estar deshabilitado')
      }
      return
    }
    
    console.log('✅ Login exitoso!')
    console.log(`   User ID: ${data.user.id}`)
    console.log(`   Email: ${data.user.email}`)
    console.log(`   Session: ${data.session ? 'Active' : 'No session'}`)
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()
    
    if (profileError) {
      console.log('⚠️  No se encontró perfil de usuario')
    } else {
      console.log('👤 Perfil de usuario:')
      console.log(`   Role: ${profile.role}`)
      console.log(`   Company ID: ${profile.company_id}`)
    }
    
  } catch (error) {
    console.error('❌ Error inesperado:', error.message)
  }
}

testLogin() 