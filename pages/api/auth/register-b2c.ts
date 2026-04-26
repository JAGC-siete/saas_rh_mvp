import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { validateAdminPassword } from '../../../lib/auth/password-policy'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password, fullName } = req.body

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Email, contraseña y nombre completo son requeridos' })
  }

  const pw = validateAdminPassword(password)
  if (!pw.ok) {
    return res.status(400).json({ error: pw.message })
  }

  try {
    const supabase = createClient(req, res)

    // Sign up the user
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })

    if (authError || !user) {
      logger.warn('B2C registration failed', { code: authError?.status })
      return res.status(400).json({
        error:
          'No se pudo completar el registro. Verifica los datos o inicia sesión si ya tienes cuenta.'
      })
    }

    // Use admin client similar to authenticateUser
    const adminSupabase = createAdminClient()

    // Create employee record for B2C
    const { data: employee, error: employeeError } = await adminSupabase
      .from('employees')
      .insert({
        name: fullName,
        email,
        company_id: null,
        is_b2c: true,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (employeeError || !employee) {
      // Cleanup
      await adminSupabase.auth.admin.deleteUser(user.id)
      return res.status(500).json({ error: 'Failed to create employee record: ' + employeeError?.message })
    }

    // Create user profile
    const { error: profileError } = await adminSupabase
      .from('user_profiles')
      .insert({
        id: user.id,
        employee_id: employee.id,
        role: 'individual_employee',
        company_id: null,
        is_b2c: true,
        is_active: true,
        permissions: '{}',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      // Cleanup
      await adminSupabase.from('employees').delete().eq('id', employee.id)
      await adminSupabase.auth.admin.deleteUser(user.id)
      return res.status(500).json({ error: 'Failed to create user profile: ' + profileError.message })
    }

    return res.status(201).json({
      success: true,
      userId: user.id,
      email: user.email
    })

  } catch (error: any) {
    console.error('B2C registration error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
