import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

interface AcceptInvitationRequest {
  token: string
  password: string
}

interface AcceptInvitationResponse {
  success: boolean
  message?: string
  error?: string
  user?: any
  session?: any
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<AcceptInvitationResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    const { token, password }: AcceptInvitationRequest = req.body

    // Validación de entrada
    if (!token || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token y contraseña son requeridos' 
      })
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'La contraseña debe tener al menos 8 caracteres' 
      })
    }

    const adminSupabase = createAdminClient()

    // Buscar la invitación válida
    const { data: invitation, error: invitationError } = await adminSupabase
      .from('employee_invitations')
      .select(`
        id,
        email,
        employee_id,
        company_id,
        status,
        expires_at,
        employees!inner(
          id,
          name,
          email,
          status
        )
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (invitationError || !invitation) {
      logger.warn('Invalid or expired invitation token', { token, error: invitationError?.message })
      return res.status(400).json({
        success: false,
        error: 'Invitación inválida o expirada'
      })
    }

    // Verificar que el empleado está activo
    if (invitation.employees[0].status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'El empleado no está activo'
      })
    }

    // Verificar que no existe ya un usuario con este email
    const { data: existingAuthUsers } = await adminSupabase.auth.admin.listUsers()
    const existingAuthUser = existingAuthUsers?.users?.find((u: any) => u.email === invitation.email)

    if (existingAuthUser) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe una cuenta con este email'
      })
    }

    // Crear usuario en Supabase Auth
    const { data: newUser, error: createUserError } = await adminSupabase.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        employee_id: invitation.employee_id,
        company_id: invitation.company_id,
        full_name: invitation.employees[0].name,
        role: 'employee',
        is_employee_portal: true
      }
    })

    if (createUserError || !newUser.user) {
      logger.error('Failed to create user from invitation', { 
        email: invitation.email, 
        error: createUserError,
        employeeId: invitation.employee_id
      })
      return res.status(500).json({
        success: false,
        error: 'Error creando cuenta de usuario'
      })
    }

    // Crear entrada en user_profiles
    const { error: profileError } = await adminSupabase
      .from('user_profiles')
      .insert({
        id: newUser.user.id,
        email: invitation.email,
        role: 'employee',
        company_id: invitation.company_id,
        employee_id: invitation.employee_id,
        permissions: {
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
      })

    if (profileError) {
      logger.warn('Failed to create user profile from invitation', { 
        userId: newUser.user.id, 
        error: profileError 
      })
    }

    // Marcar invitación como aceptada
    const { error: updateInvitationError } = await adminSupabase
      .from('employee_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    if (updateInvitationError) {
      logger.warn('Failed to update invitation status', { 
        invitationId: invitation.id, 
        error: updateInvitationError 
      })
    }

    // Crear sesión para el usuario recién creado
    const supabase = createClient(req, res)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: invitation.email,
      password: password
    })

    if (authError || !authData.user) {
      logger.error('Failed to create session after invitation acceptance', { 
        email: invitation.email, 
        error: authError?.message 
      })
      return res.status(500).json({
        success: false,
        error: 'Error iniciando sesión'
      })
    }

    logger.info('Employee invitation accepted successfully', {
      email: invitation.email,
      employeeId: invitation.employee_id,
      employeeName: invitation.employees[0].name,
      userId: newUser.user.id,
      invitationId: invitation.id
    })

    return res.status(200).json({
      success: true,
      message: 'Cuenta creada y sesión iniciada exitosamente',
      user: authData.user,
      session: authData.session
    })

  } catch (error) {
    logger.error('Accept invitation error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}
