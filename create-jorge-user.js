import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createUser() {
  try {
    // Crear usuario jorge7gomez@gmail.com
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'jorge7gomez@gmail.com',
      password: 'jorge123456', // Cambia esta contraseña
      email_confirm: true,
      user_metadata: {
        name: 'Jorge Gómez'
      }
    })

    if (error) {
      console.error('Error creando usuario:', error.message)
      return
    }

    console.log('✅ Usuario creado exitosamente:', data.user?.email)
    console.log('📧 Email:', 'jorge7gomez@gmail.com')
    console.log('🔑 Password:', 'jorge123456')
    console.log('👤 Usuario ID:', data.user?.id)

  } catch (err) {
    console.error('Error:', err)
  }
}

createUser()
