import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Cargar variables de entorno
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Verificando variables de entorno...')
console.log('URL:', supabaseUrl ? '✅ Configurada' : '❌ Faltante')
console.log('Service Key:', supabaseServiceKey ? '✅ Configurada' : '❌ Faltante')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Verifica que .env.local tenga:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkUser() {
  try {
    // Buscar el usuario jorge7gomez@gmail.com
    const { data, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.error('Error:', error)
      return
    }

    const user = data.users.find(u => u.email === 'jorge7gomez@gmail.com')
    
    if (user) {
      console.log('✅ Usuario encontrado:')
      console.log('📧 Email:', user.email)
      console.log('🆔 ID:', user.id)
      console.log('✉️ Email confirmado:', user.email_confirmed_at ? '✅ Sí' : '❌ No')
      console.log('📅 Creado:', user.created_at)
      console.log('🔄 Última conexión:', user.last_sign_in_at || 'Nunca')
      console.log('📱 Teléfono confirmado:', user.phone_confirmed_at ? '✅ Sí' : '❌ No')
    } else {
      console.log('❌ Usuario jorge7gomez@gmail.com NO encontrado')
      console.log('👥 Usuarios existentes:')
      data.users.forEach(u => {
        console.log(`  - ${u.email} (${u.email_confirmed_at ? 'confirmado' : 'sin confirmar'})`)
      })
    }

  } catch (err) {
    console.error('Error:', err)
  }
}

checkUser()
