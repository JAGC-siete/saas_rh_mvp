import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetPassword() {
  try {
    console.log('🔧 Reseteando contraseña para jorge7gomez@gmail.com...\n')
    
    // Reset password using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(
      '8c49be71-c48f-4fee-9935-44a168eb2dfe', // jorge7gomez@gmail.com ID
      {
        password: 'jorge123456'
      }
    )
    
    if (error) {
      console.error('❌ Error reseteando contraseña:', error.message)
      return
    }
    
    console.log('✅ Contraseña reseteada exitosamente!')
    console.log('📧 Email:', data.user.email)
    console.log('🔑 Nueva contraseña: jorge123456')
    
    // Test login
    console.log('\n🧪 Probando login...')
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'jorge7gomez@gmail.com',
      password: 'jorge123456'
    })
    
    if (loginError) {
      console.error('❌ Error en login:', loginError.message)
      return
    }
    
    console.log('✅ Login exitoso!')
    console.log('👤 Usuario ID:', loginData.user.id)
    console.log('📧 Email:', loginData.user.email)
    console.log('🔑 Session:', loginData.session ? 'Activa' : 'No activa')
    
    // Test user profile access
    console.log('\n🔍 Verificando acceso al perfil...')
    
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', loginData.user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Error accediendo al perfil:', profileError.message)
      return
    }
    
    console.log('✅ Perfil accesible!')
    console.log('👔 Rol:', profile.role)
    console.log('🏢 Company ID:', profile.company_id)
    console.log('🔑 Permisos:', JSON.stringify(profile.permissions))
    
    console.log('\n🎯 CREDENCIALES FINALES:')
    console.log('========================')
    console.log('📧 Email: jorge7gomez@gmail.com')
    console.log('🔑 Password: jorge123456')
    console.log('✅ Estado: VERIFICADO Y FUNCIONAL')
    
  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

resetPassword() 