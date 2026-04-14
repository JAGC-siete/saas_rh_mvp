import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextApiResponse } from 'next'

export type EmployeePortalCompanySettings = {
  employee_portal_enabled?: boolean
  employee_self_service_leave?: boolean
}

export function parseEmployeePortalSettings(settings: unknown): { employeePortalEnabled: boolean } {
  if (settings == null || typeof settings !== 'object' || Array.isArray(settings)) {
    return { employeePortalEnabled: true }
  }
  const v = (settings as EmployeePortalCompanySettings).employee_portal_enabled
  if (v === false) return { employeePortalEnabled: false }
  return { employeePortalEnabled: true }
}

/**
 * Si la empresa deshabilitó el portal, responde 403 y devuelve false.
 * Si no hay companyId o falla la lectura, no bloquea (compatibilidad).
 */
/** Resuelve employee_id y company_id del usuario autenticado (portal empleado). */
export async function resolveEmployeeAndCompanyId(
  supabase: SupabaseClient,
  user: { id: string; user_metadata?: Record<string, unknown> }
): Promise<{ employeeId: string; companyId: string | undefined } | null> {
  let employeeId = user.user_metadata?.employee_id as string | undefined
  let companyId = user.user_metadata?.company_id as string | undefined
  if (!employeeId) {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('employee_id, company_id')
      .eq('id', user.id)
      .single()
    employeeId = userProfile?.employee_id as string | undefined
    companyId = (userProfile?.company_id as string | undefined) ?? undefined
  } else if (!companyId) {
    const { data: up } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle()
    companyId = (up?.company_id as string | undefined) ?? undefined
  }
  if (!employeeId) return null
  return { employeeId, companyId }
}

export async function assertEmployeePortalEnabled(
  supabase: SupabaseClient,
  companyId: string | null | undefined,
  res: NextApiResponse
): Promise<boolean> {
  if (!companyId) return true
  const { data, error } = await supabase.from('companies').select('settings').eq('id', companyId).maybeSingle()
  if (error || !data) return true
  const { employeePortalEnabled } = parseEmployeePortalSettings(data.settings)
  if (!employeePortalEnabled) {
    res.status(403).json({
      error: 'Portal no disponible',
      message: 'El portal de empleados no está habilitado para su empresa.',
    })
    return false
  }
  return true
}
