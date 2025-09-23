/**
 * Client-side environment variables loader
 * This ensures NEXT_PUBLIC_ variables are available in the browser
 */

interface ClientEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
  NODE_ENV?: string
}

let clientEnv: ClientEnv | null = null
let envPromise: Promise<ClientEnv> | null = null

/**
 * Load environment variables for client-side usage
 * This fetches the variables from the server if they're not available in process.env
 */
async function loadClientEnv(): Promise<ClientEnv> {
  // If already loaded, return cached values
  if (clientEnv) {
    return clientEnv
  }

  // If already loading, wait for the existing promise
  if (envPromise) {
    return envPromise
  }

  // Create new loading promise
  envPromise = (async () => {
    try {
      // First, try to get from process.env (should work in Next.js)
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        clientEnv = {
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          NODE_ENV: process.env.NODE_ENV,
        }
        return clientEnv
      }

      // If not available in process.env, fetch from our API endpoint
      console.log('🔍 Loading environment variables from server...')
      
      const response = await fetch('/api/client-env', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch environment variables: ${response.status}`)
      }

      clientEnv = await response.json()
      
      console.log('✅ Environment variables loaded from server:', {
        NEXT_PUBLIC_SUPABASE_URL: clientEnv.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      })

      return clientEnv
    } catch (error) {
      console.error('❌ Failed to load environment variables:', error)
      
      // Return empty object as fallback
      clientEnv = {}
      return clientEnv
    }
  })()

  return envPromise
}

/**
 * Get environment variable for client-side usage
 * This function ensures variables are loaded before returning them
 */
export async function getClientEnv(): Promise<ClientEnv> {
  return loadClientEnv()
}

/**
 * Get a specific environment variable for client-side usage
 */
export async function getClientEnvVar(key: keyof ClientEnv): Promise<string | undefined> {
  const env = await getClientEnv()
  return env[key]
}

/**
 * Synchronous version that returns cached values or undefined
 * Use this only if you're sure the environment has been loaded
 */
export function getClientEnvSync(): ClientEnv {
  return clientEnv || {}
}

/**
 * Check if environment variables are available (synchronous)
 */
export function areClientEnvVarsAvailable(): boolean {
  const env = getClientEnvSync()
  return !!(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/**
 * Initialize environment variables for client-side usage
 * Call this early in your app initialization
 */
export async function initializeClientEnv(): Promise<ClientEnv> {
  return loadClientEnv()
}
