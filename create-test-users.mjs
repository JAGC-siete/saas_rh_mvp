import { createAdminClient } from './lib/supabase/server.js'

async function createTestUser() {
  const supabase = createAdminClient()
  
  // Crear usuario de prueba
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@empresa.com',
    password: 'admin123456',
    email_confirm: true,
    user_metadata: {
      name: 'Administrador'
    }
  })

  if (error) {
    console.error('Error creando usuario:', error)
    return
  }

  console.log('Usuario creado exitosamente:', data.user?.email)
  
  // Crear otro usuario de HR
  const { data: hrData, error: hrError } = await supabase.auth.admin.createUser({
    email: 'hr@empresa.com',
    password: 'hr123456',
    email_confirm: true,
    user_metadata: {
      name: 'Recursos Humanos'
    }
  })

  if (hrError) {
    console.error('Error creando usuario HR:', hrError)
    return
  }

  console.log('Usuario HR creado exitosamente:', hrData.user?.email)
}

createTestUser().catch(console.error)
