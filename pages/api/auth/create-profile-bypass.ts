import { createHash, timingSafeEqual } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

function verifyBootstrapSecret(received: string | undefined): boolean {
  const expected = process.env.PROFILE_BOOTSTRAP_SECRET
  if (!expected || typeof received !== 'string' || received.length === 0) {
    return false
  }
  try {
    const a = createHash('sha256').update(received, 'utf8').digest()
    const b = createHash('sha256').update(expected, 'utf8').digest()
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.PROFILE_BOOTSTRAP_SECRET) {
    return res.status(503).json({
      error: 'Bootstrap no configurado',
      hint: 'Defina PROFILE_BOOTSTRAP_SECRET en el servidor antes de usar este endpoint.',
    })
  }

  const provided =
    (typeof req.headers['x-profile-bootstrap-secret'] === 'string'
      ? req.headers['x-profile-bootstrap-secret']
      : Array.isArray(req.headers['x-profile-bootstrap-secret'])
        ? req.headers['x-profile-bootstrap-secret'][0]
        : undefined) ?? undefined

  if (!verifyBootstrapSecret(provided)) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  try {
    const { userId } = req.body as { userId?: string }

    if (!userId || typeof userId !== 'string' || !UUID_RE.test(userId)) {
      return res.status(400).json({ error: 'userId UUID inválido o ausente' })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return res.status(503).json({ error: 'Supabase admin no configurado' })
    }

    const supabase = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: authUser, error: authLookupError } = await supabase.auth.admin.getUserById(userId)
    if (authLookupError || !authUser?.user) {
      return res.status(404).json({ error: 'Usuario de auth no encontrado' })
    }

    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (existingProfile) {
      return res.status(200).json({ success: true, message: 'Profile already exists' })
    }

    const { error } = await supabase.from('user_profiles').insert({
      id: userId,
      role: 'super_admin',
      is_active: true,
      permissions: {
        can_manage_employees: true,
        can_view_payroll: true,
        can_manage_attendance: true,
        can_manage_departments: true,
        can_view_reports: true,
        can_manage_companies: true,
        can_generate_payroll: true,
        can_export_payroll: true,
        can_view_own_attendance: true,
        can_register_attendance: true,
      },
    })

    if (error) {
      console.error('Error creating user profile:', error)
      return res.status(500).json({ error: 'Failed to create user profile', details: error.message })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in create-profile-bypass API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
