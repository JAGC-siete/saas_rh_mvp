/**
 * Script temporal para resetear contraseña de usuario
 * Usa SERVICE_ROLE_KEY para actualizar contraseña directamente
 */

const { execSync } = require('child_process')
const { createClient } = require('@supabase/supabase-js')

// Función para obtener variables de Railway
function getRailwayEnv() {
  try {
    const railwayVars = execSync('railway variables', { encoding: 'utf-8' })
    const vars = {}
    railwayVars.split('\n').forEach(line => {
      const match = line.match(/^(\w+)=(.+)$/)
      if (match) {
        vars[match[1]] = match[2]
      }
    })
    return vars
  } catch (error) {
    console.warn('⚠️  No se pudieron obtener variables de Railway, usando variables del sistema')
    return {}
  }
}

// Intentar cargar .env si existe
try {
  require('dotenv').config()
} catch (e) {
  // Ignorar si no existe dotenv
}

// Obtener variables de Railway si están disponibles
const railwayEnv = getRailwayEnv()

// Leer variables de entorno (prioridad: Railway > .env > sistema)
const SUPABASE_URL = railwayEnv.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = railwayEnv.SUPABASE_SERVICE_ROLE_KEY || 
                         process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗')
  console.error('\n💡 Sugerencia: Asegúrate de tener las variables configuradas en Railway o en .env')
  process.exit(1)
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetPassword(userId, newPassword) {
  try {
    console.log(`\n🔍 Reseteando contraseña para usuario ID: ${userId}`)
    
    // Verificar que el usuario existe primero
    console.log(`   Verificando usuario...`)
    const { data: userData, error: getUserError } = await adminClient.auth.admin.getUserById(userId)
    
    if (getUserError || !userData) {
      throw new Error(`Usuario no encontrado: ${getUserError?.message || 'Usuario no existe'}`)
    }
    
    console.log(`✅ Usuario encontrado:`)
    console.log(`   ID: ${userData.user.id}`)
    console.log(`   Email: ${userData.user.email}`)
    console.log(`   Creado: ${userData.user.created_at}`)
    
    // Actualizar contraseña
    console.log(`\n🔐 Actualizando contraseña...`)
    const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword
    })
    
    if (error) {
      console.error('Error completo al actualizar:', JSON.stringify(error, null, 2))
      throw new Error(`Error actualizando contraseña: ${error.message || JSON.stringify(error)}`)
    }
    
    console.log(`\n✅ Contraseña actualizada exitosamente`)
    console.log(`   Usuario ID: ${userId}`)
    console.log(`   Email: ${userData.user.email}`)
    console.log(`   Nueva contraseña: ${newPassword}`)
    
    return { success: true, user: { id: userId, email: userData.user.email } }
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`)
    if (error.stack) {
      console.error('Stack:', error.stack)
    }
    throw error
  }
}

// Ejecutar
const userId = '8c49be71-c48f-4fee-9935-44a168eb2dfe'
// Usar una contraseña más segura que no esté en la base de datos de contraseñas comprometidas
const newPassword = 'HumanoSISU2025!AdminSecure'

resetPassword(userId, newPassword)
  .then(() => {
    console.log('\n✅ Proceso completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Proceso falló:', error.message)
    process.exit(1)
  })

