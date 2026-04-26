/**
 * Reset de contraseña vía Supabase Admin (service role).
 * Uso:
 *   USER_ID=<uuid> NEW_PASSWORD='<contraseña>' node scripts/reset-password-temp.js
 * o:
 *   node scripts/reset-password-temp.js <uuid>   # NEW_PASSWORD obligatorio en env
 *
 * Variables: NEXT_PUBLIC_SUPABASE_URL (o SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY.
 * Opcional: variables desde `railway variables` si está enlazado el proyecto.
 */

const { execSync } = require('child_process')
const { createClient } = require('@supabase/supabase-js')

function getRailwayEnv() {
  try {
    const railwayVars = execSync('railway variables', { encoding: 'utf-8' })
    const vars = {}
    railwayVars.split('\n').forEach((line) => {
      const match = line.match(/^(\w+)=(.+)$/)
      if (match) {
        vars[match[1]] = match[2]
      }
    })
    return vars
  } catch {
    console.warn('⚠️  No se pudieron leer variables de Railway; se usan solo env del proceso.')
    return {}
  }
}

try {
  require('dotenv').config()
} catch {
  // sin dotenv
}

const railwayEnv = getRailwayEnv()
const SUPABASE_URL =
  railwayEnv.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL
const SERVICE_ROLE_KEY =
  railwayEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

const userId = String(process.argv[2] || process.env.USER_ID || '').trim()
const newPassword = String(process.argv[3] || process.env.NEW_PASSWORD || '').trim()

if (!userId || !newPassword) {
  console.error('Uso: USER_ID=<uuid> NEW_PASSWORD=\'…\' node scripts/reset-password-temp.js')
  console.error('  o: node scripts/reset-password-temp.js <uuid>  (con NEW_PASSWORD en env)')
  process.exit(1)
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function resetPassword(uid, password) {
  const { data: userData, error: getUserError } = await adminClient.auth.admin.getUserById(uid)
  if (getUserError || !userData) {
    throw new Error(getUserError?.message || 'Usuario no encontrado')
  }
  const { error } = await adminClient.auth.admin.updateUserById(uid, { password })
  if (error) {
    throw new Error(error.message || JSON.stringify(error))
  }
  console.log('Contraseña actualizada para:', userData.user.email)
}

resetPassword(userId, newPassword)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message || err)
    process.exit(1)
  })
