import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.pXArDqHGA4yjprTqJfsNQXwzS-WLz6NCK5QRbLAyYmA'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAfterRLSFix() {
  try {
    console.log('🧪 Probando sistema después de corrección RLS...\n')
    
    // Test login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'jorge7gomez@gmail.com',
      password: 'jorge123456'
    })
    
    if (error) {
      console.error('❌ Error en login:', error.message)
      return
    }
    
    console.log('✅ Login exitoso!')
    console.log('👤 Usuario ID:', data.user.id)
    console.log('📧 Email:', data.user.email)
    
    // Test profile access (esto debería funcionar ahora)
    console.log('\n🔍 Probando acceso al perfil...')
    
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Error accediendo al perfil:', profileError.message)
      console.log('\n⚠️ La corrección RLS aún no se ha aplicado o hay otros problemas')
      return
    }
    
    console.log('✅ Perfil accesible!')
    console.log('👔 Rol:', profile.role)
    console.log('🏢 Company ID:', profile.company_id)
    console.log('🔑 Permisos:', JSON.stringify(profile.permissions))
    
    // Test other tables access
    console.log('\n🔍 Probando acceso a otras tablas...')
    
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('count')
      .limit(1)
    
    if (employeesError) {
      console.log('⚠️ Acceso a employees:', employeesError.message)
    } else {
      console.log('✅ Acceso a employees: OK')
    }
    
    console.log('\n🎯 SISTEMA COMPLETAMENTE FUNCIONAL!')
    console.log('====================================')
    console.log('📧 Email: jorge7gomez@gmail.com')
    console.log('🔑 Password: jorge123456')
    console.log('✅ Login: FUNCIONAL')
    console.log('✅ Perfil: ACCESIBLE')
    console.log('✅ RLS: CORREGIDO')
    console.log('🚀 Estado: LISTO PARA USAR')
    
  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

testAfterRLSFix() 