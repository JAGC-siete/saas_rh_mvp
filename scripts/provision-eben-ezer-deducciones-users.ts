/**
 * Provisiona accesos limitados a Deducciones para Helen y Bayrón (Eben Ezer).
 *
 *   railway run -- npx tsx scripts/provision-eben-ezer-deducciones-users.ts
 *
 * - Actualiza emails en employees
 * - Crea auth users (invite) + user_profiles role=manager + can_manage_deducciones
 */
import { randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'

async function findAuthUserByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string
) {
  // Prefer Auth Admin getUserByEmail when available; avoid listUsers (can 500 on large projects).
  const admin = supabase.auth.admin as unknown as {
    getUserByEmail?: (email: string) => Promise<{ data: { user: { id: string; email?: string } | null }; error: Error | null }>
  }
  if (typeof admin.getUserByEmail === 'function') {
    const { data, error } = await admin.getUserByEmail(email)
    if (!error && data?.user) return data.user
  }
  return null
}

const COMPANY_ID = '566bcb1f-5f44-4a3a-9a92-9fbcbd3b5643'

const USERS = [
  {
    email: 'hcaceres@ferreteroebenezer.com',
    employeeId: '1a1be49b-a86c-45f1-897d-cdab5e7bf502',
    dni: '0501199207646',
    name: 'Helen Caceres Marin',
  },
  {
    email: 'bmejia@ferreteroebenezer.com',
    employeeId: 'fd11e680-5621-4ff3-80d8-10352554cb00',
    dni: '1411199500162', // DNI en DB (13 dígitos; el #2 del usuario traía un 2 extra)
    name: 'Bayrón Josué Mejía Campo',
  },
] as const

/** Solo módulo Deducciones — sin nómina, empleados, asistencia, etc. */
const DEDUCCIONES_ONLY_PERMISSIONS = {
  can_manage_deducciones: true,
  can_access_dashboard: false,
  can_view_employees: false,
  can_manage_employees: false,
  can_view_departments: false,
  can_manage_departments: false,
  can_view_attendance: false,
  can_manage_attendance: false,
  can_view_attendance_reports: false,
  can_export_attendance_reports: false,
  can_view_payroll: false,
  can_manage_payroll: false,
  can_authorize_payroll: false,
  can_view_reports: false,
  can_export_reports: false,
  can_view_settings: false,
  can_manage_settings: false,
  can_request_leave: false,
  can_approve_leave: false,
  can_view_own_profile: true,
  can_view_own_attendance: false,
  can_view_salary: false,
  can_edit_salary: false,
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  for (const u of USERS) {
    console.log(`\n=== ${u.name} <${u.email}> ===`)

    const { data: emp, error: empErr } = await supabase
      .from('employees')
      .update({ email: u.email, updated_at: new Date().toISOString() })
      .eq('id', u.employeeId)
      .eq('company_id', COMPANY_ID)
      .select('id, name, dni, email, status')
      .single()

    if (empErr || !emp) {
      console.error('No se actualizó empleado:', empErr)
      continue
    }
    console.log('Empleado OK:', emp.name, emp.dni, emp.email)

    let authUser = await findAuthUserByEmail(supabase, u.email)

    if (!authUser) {
      const ephemeralPassword = `Tmp!${randomBytes(18).toString('base64url')}`
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: ephemeralPassword,
        email_confirm: true,
        user_metadata: {
          company_id: COMPANY_ID,
          role: 'manager',
          employee_id: u.employeeId,
        },
      })
      if (createErr || !created.user) {
        // Si ya existe, reenviar invite/recovery
        console.warn('createUser:', createErr?.message)
        const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(u.email, {
          data: {
            company_id: COMPANY_ID,
            role: 'manager',
            employee_id: u.employeeId,
          },
        })
        if (inviteErr || !invited.user) {
          const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: u.email,
          })
          if (linkErr || !linkData.user) {
            console.error('No se pudo crear/recuperar auth user:', inviteErr || linkErr)
            continue
          }
          authUser = linkData.user
          console.log('Usuario existente; recovery link:', linkData.properties?.action_link)
        } else {
          authUser = invited.user
          console.log('Invite enviado a', u.email)
        }
      } else {
        authUser = created.user
        const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: u.email,
        })
        if (linkErr) {
          console.warn('Usuario creado; no recovery link:', linkErr.message)
        } else {
          console.log('Usuario creado; recovery link (definir contraseña):', linkData.properties?.action_link)
        }
      }
    } else {
      console.log('Auth user ya existía:', authUser.id)
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: u.email,
      })
      if (!linkErr) {
        console.log('Recovery link:', linkData.properties?.action_link)
      }
    }

    if (!authUser) {
      console.error('Sin auth user para', u.email)
      continue
    }

    const profilePayload = {
      id: authUser.id,
      company_id: COMPANY_ID,
      employee_id: u.employeeId,
      role: 'manager',
      permissions: DEDUCCIONES_ONLY_PERMISSIONS,
      is_active: true,
      updated_at: new Date().toISOString(),
    }

    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle()

    if (existingProfile) {
      const { error: upErr } = await supabase
        .from('user_profiles')
        .update(profilePayload)
        .eq('id', authUser.id)
      if (upErr) {
        console.error('Error actualizando profile:', upErr)
        continue
      }
      console.log('Profile actualizado (deducciones-only)')
    } else {
      const { error: insErr } = await supabase.from('user_profiles').insert({
        ...profilePayload,
        created_at: new Date().toISOString(),
      })
      if (insErr) {
        console.error('Error insertando profile:', insErr)
        continue
      }
      console.log('Profile creado (deducciones-only)')
    }
  }

  console.log('\nListo. Tras deploy del permiso can_manage_deducciones, deben ver solo /app/deducciones.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
