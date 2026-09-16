/**
 * Cliente Supabase para el render público de landings (/p/[slug]).
 *
 * Usa la llave anon y NO lee cookies a propósito:
 * - El visitante no tiene empresa; el tenant se resuelve por el slug.
 * - Si usara la sesión del visitante, un usuario logueado de otra empresa caería en la
 *   política de tenant y recibiría 404 en una página que es pública para todos.
 *
 * Lo que puede leer está limitado por RLS (solo status='published') y por el GRANT
 * a nivel de columna del rol anon: el borrador y el correo de avisos quedan fuera.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '../env'

let cached: SupabaseClient | null = null

export function createPublicLandingClient(): SupabaseClient {
  if (cached) return cached

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY para el render público')
  }

  cached = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-landing-render': 'public' },
    },
  })

  return cached
}
