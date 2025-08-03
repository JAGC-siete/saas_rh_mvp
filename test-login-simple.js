import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.pXArDqHGA4yjprTqJfsNQXwzS-WLz6NCK5QRbLAyYmA'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLogin() {
  try {
    console.log('🧪 Probando login con credenciales...\n')
    
    // Test login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'jorge7gomez@gmail.com',
      password: 'jorge123456'
    })
    
    if (error) {
      console.error('❌ Error en login:', error.message)
      console.log('\n🔍 Posibles causas:')
      console.log('1. Contraseña incorrecta')
      console.log('2. Usuario no confirmado')
      console.log('3. Problemas de configuración')
      return
    }
    
    console.log('✅ LOGIN EXITOSO!')
    console.log('👤 Usuario ID:', data.user.id)
    console.log('📧 Email:', data.user.email)
    console.log('🔑 Session:', data.session ? 'Activa' : 'No activa')
    console.log('⏰ Último login:', data.user.last_sign_in_at)
    
    // Test basic access
    console.log('\n🔍 Probando acceso básico...')
    
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('❌ Error obteniendo usuario:', userError.message)
    } else {
      console.log('✅ Usuario autenticado correctamente')
      console.log('👤 ID:', userData.user.id)
      console.log('📧 Email:', userData.user.email)
    }
    
    console.log('\n🎯 CREDENCIALES VERIFICADAS:')
    console.log('===========================')
    console.log('📧 Email: jorge7gomez@gmail.com')
    console.log('🔑 Password: jorge123456')
    console.log('✅ Estado: LOGIN FUNCIONAL')
    console.log('⚠️ Nota: El problema de RLS no afecta el login básico')
    
    console.log('\n🔧 Para resolver el problema de RLS:')
    console.log('1. Ir a Supabase Dashboard')
    console.log('2. SQL Editor')
    console.log('3. Ejecutar el contenido de fix-user-profiles-rls.sql')
    console.log('4. Esto resolverá el acceso a perfiles de usuario')
    
  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

testLogin() 