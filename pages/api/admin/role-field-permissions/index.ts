import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'

const MANAGED_ROLES = [
  'super_admin',
  'admin',
  'company_admin',
  'hr_manager',
  'manager',
  'employee',
] as const

type ManagedRole = (typeof MANAGED_ROLES)[number]

function isManagedRole(v: string): v is ManagedRole {
  return (MANAGED_ROLES as readonly string[]).includes(v)
}

type AccessLevel = 'none' | 'read' | 'write'
type DisplayMode = 'hidden' | 'masked' | 'locked'

function isAccessLevel(v: unknown): v is AccessLevel {
  return v === 'none' || v === 'read' || v === 'write'
}

function isDisplayMode(v: unknown): v is DisplayMode {
  return v === 'hidden' || v === 'masked' || v === 'locked'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = createAdminClient()

  try {
    await requireSuperAdmin(req, res)

    if (req.method === 'GET') {
      const [{ data: fields, error: e1 }, { data: permissions, error: e2 }] = await Promise.all([
        admin.from('field_catalog').select('field_key, module_key, name, description, default_display_mode').order('field_key'),
        admin.from('role_field_permissions').select('role, field_key, access_level, display_mode'),
      ])

      if (e1 || e2) {
        console.error('role-field-permissions GET', e1, e2)
        return res.status(500).json({ error: 'Error al cargar permisos de campo' })
      }

      return res.status(200).json({
        success: true,
        fields: fields || [],
        role_field_permissions: permissions || [],
        roles: MANAGED_ROLES,
      })
    }

    if (req.method === 'PUT') {
      const body = req.body as {
        role?: string
        field_key?: string
        access_level?: AccessLevel
        display_mode?: DisplayMode
      }

      const role = typeof body.role === 'string' ? body.role.trim() : ''
      const field_key = typeof body.field_key === 'string' ? body.field_key.trim() : ''

      if (!isManagedRole(role)) {
        return res.status(400).json({ error: 'role inválido', roles: MANAGED_ROLES })
      }
      if (!field_key) {
        return res.status(400).json({ error: 'field_key requerido' })
      }
      if (!isAccessLevel(body.access_level)) {
        return res.status(400).json({ error: 'access_level inválido' })
      }
      if (!isDisplayMode(body.display_mode)) {
        return res.status(400).json({ error: 'display_mode inválido' })
      }

      const { data: fieldExists } = await admin
        .from('field_catalog')
        .select('field_key')
        .eq('field_key', field_key)
        .maybeSingle()

      if (!fieldExists) {
        return res.status(400).json({ error: 'field_key desconocido' })
      }

      const { error: upsertErr } = await admin.from('role_field_permissions').upsert(
        {
          role,
          field_key,
          access_level: body.access_level,
          display_mode: body.display_mode,
        },
        { onConflict: 'role,field_key' }
      )

      if (upsertErr) {
        console.error('role-field-permissions PUT', upsertErr)
        return res.status(500).json({ error: 'Error al guardar permiso de campo' })
      }

      return res.status(200).json({
        success: true,
        role,
        field_key,
        access_level: body.access_level,
        display_mode: body.display_mode,
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return
    }
    console.error('role-field-permissions API', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
