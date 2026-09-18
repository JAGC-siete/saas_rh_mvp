/**
 * Cliente Supabase anon para el render público del directorio Mercado San Pablo.
 *
 * Misma lógica que landings/public-client: sin cookies de sesión.
 * RLS + GRANT de columnas limitan a filas active y campos públicos.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '../env'

let cached: SupabaseClient | null = null

export function createPublicMercadoClient(): SupabaseClient {
  if (cached) return cached

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY para el directorio público'
    )
  }

  cached = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-mercado-render': 'public' },
    },
  })

  return cached
}
