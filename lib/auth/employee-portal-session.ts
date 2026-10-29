import { randomBytes } from 'crypto'
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { logger } from '../logger'

export const EMPLOYEE_PORTAL_PERMISSIONS = {
  dashboard: true,
  employees: false,
  departments: false,
  attendance: true,
  leave: true,
  payroll: true,
  reports: false,
  gamification: false,
  settings: false
}

export const EMPLOYEE_PORTAL_SESSION_ERROR = 'No pudimos abrir tu sesión. Intenta de nuevo en unos minutos.'
export const EMPLOYEE_PORTAL_NOT_EMPLOYEE_ACCOUNT =
  'Este correo ya tiene una cuenta que no es del portal de empleados. Entra con tu contraseña o pide ayuda a Recursos Humanos.'

export interface PortalEmployee {
  id: string
  name: string
  company_id: string
}

export type EmployeePortalSessionResult =
  | { ok: true; user: User; session: Session }
  | { ok: false; status: number; error: string }

// Nobody ever signs in with this password: the session comes from a one-time token below.
// It only exists because GoTrue requires one, so it must be unguessable.
export function randomAuthPassword(): string {
  return randomBytes(32).toString('base64url')
}

function isAlreadyRegistered(error: { message?: string; code?: string } | null): boolean {
  return error?.code === 'email_exists' || !!error?.message?.includes('already been registered')
}

/**
 * Call only after the employee proved control of `email` (OTP verified).
 * Ensures the auth user and its employee profile exist, then opens a session
 * on `client` (the cookie client) with an admin-issued magic-link token.
 * generateLink does not send any email.
 */
export async function openEmployeePortalSession(
  admin: SupabaseClient,
  client: SupabaseClient,
  email: string,
  employee: PortalEmployee
): Promise<EmployeePortalSessionResult> {
  const portalMetadata = {
    employee_id: employee.id,
    company_id: employee.company_id,
    full_name: employee.name,
    role: 'employee',
    is_employee_portal: true
  }

  const { error: createUserError } = await admin.auth.admin.createUser({
    email,
    password: randomAuthPassword(),
    email_confirm: true,
    user_metadata: portalMetadata
  })

  if (createUserError && !isAlreadyRegistered(createUserError)) {
    logger.error('Failed to create employee auth user', { employeeId: employee.id, error: createUserError.message })
    return { ok: false, status: 500, error: EMPLOYEE_PORTAL_SESSION_ERROR }
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  const authUser = linkData?.user
  const tokenHash = linkData?.properties?.hashed_token

  if (linkError || !authUser || !tokenHash) {
    logger.error('Failed to issue employee session token', { employeeId: employee.id, error: linkError?.message })
    return { ok: false, status: 500, error: EMPLOYEE_PORTAL_SESSION_ERROR }
  }

  const { data: profile, error: profileReadError } = await admin
    .from('user_profiles')
    .select('id, role, employee_id')
    .eq('id', authUser.id)
    .maybeSingle()

  if (profileReadError) {
    logger.error('Failed to read employee profile', { userId: authUser.id, error: profileReadError.message })
    return { ok: false, status: 500, error: EMPLOYEE_PORTAL_SESSION_ERROR }
  }

  // An OTP to an employee email must never open an admin/HR account that shares that email.
  if (profile && (profile.role !== 'employee' || profile.employee_id !== employee.id)) {
    logger.warn('Employee OTP refused for a non-employee profile', { userId: authUser.id, employeeId: employee.id })
    return { ok: false, status: 403, error: EMPLOYEE_PORTAL_NOT_EMPLOYEE_ACCOUNT }
  }

  if (!profile) {
    const { error: profileInsertError } = await admin.from('user_profiles').insert({
      id: authUser.id,
      role: 'employee',
      company_id: employee.company_id,
      employee_id: employee.id,
      permissions: EMPLOYEE_PORTAL_PERMISSIONS
    })

    // Without a profile every portal API answers PROFILE_REQUIRED, so a session would be useless.
    if (profileInsertError) {
      logger.error('Failed to create employee profile', { userId: authUser.id, error: profileInsertError.message })
      return { ok: false, status: 500, error: EMPLOYEE_PORTAL_SESSION_ERROR }
    }
  }

  if (!authUser.user_metadata?.employee_id) {
    await admin.auth.admin.updateUserById(authUser.id, {
      user_metadata: { ...authUser.user_metadata, ...portalMetadata }
    })
  }

  const { data: authData, error: verifyError } = await client.auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash
  })

  if (verifyError || !authData.session || !authData.user) {
    logger.error('Failed to open employee session', { userId: authUser.id, error: verifyError?.message })
    return { ok: false, status: 500, error: EMPLOYEE_PORTAL_SESSION_ERROR }
  }

  return { ok: true, user: authData.user, session: authData.session }
}
