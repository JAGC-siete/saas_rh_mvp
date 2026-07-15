import { createClient } from '../supabase/client'

/** Authorization Bearer from the browser Supabase session (localStorage). */
export async function getBrowserAuthHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  } catch {
    return {}
  }
}
