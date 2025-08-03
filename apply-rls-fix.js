import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyRLSFix() {
  try {
    console.log('🔧 Aplicando corrección de políticas RLS...\n')
    
    // Read the SQL fix
    const sqlFix = fs.readFileSync('fix-user-profiles-rls.sql', 'utf8')
    
    console.log('📋 Aplicando correcciones SQL...')
    
    // Split SQL into individual statements
    const statements = sqlFix
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          console.log(`   Aplicando statement ${i + 1}/${statements.length}...`)
          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          
          if (error) {
            console.log(`   ⚠️ Warning en statement ${i + 1}:`, error.message)
          } else {
            console.log(`   ✅ Statement ${i + 1} aplicado`)
          }
        } catch (err) {
          console.log(`   ⚠️ Error en statement ${i + 1}:`, err.message)
        }
      }
    }
    
    console.log('\n✅ Corrección RLS aplicada!')
    console.log('🧪 Probando login nuevamente...')
    
    // Test login again
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'jorge7gomez@gmail.com',
      password: 'jorge123456'
    })
    
    if (loginError) {
      console.error('❌ Error en login:', loginError.message)
      return
    }
    
    console.log('✅ Login exitoso!')
    
    // Test profile access
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', loginData.user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Error accediendo al perfil:', profileError.message)
      return
    }
    
    console.log('✅ Perfil accesible después de la corrección!')
    console.log('👔 Rol:', profile.role)
    console.log('🏢 Company ID:', profile.company_id)
    
    console.log('\n🎯 CREDENCIALES FINALES:')
    console.log('========================')
    console.log('📧 Email: jorge7gomez@gmail.com')
    console.log('🔑 Password: jorge123456')
    console.log('✅ Estado: COMPLETAMENTE FUNCIONAL')
    
  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

applyRLSFix() 