import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { sendInviteEmail } from '../../../../lib/emails/invite'
import crypto from 'crypto'

interface SendInvitationRequest {
  employeeId: string
  email: string
  expiresInHours?: number
}

interface SendInvitationResponse {
  success: boolean
  message?: string
  error?: string
  invitationId?: string
  token?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SendInvitationResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    // Verificar autenticación y permisos de admin
    const supabase = createClient(req, res)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'No autorizado' 
      })
    }

    // Verificar que el usuario es admin
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['super_admin', 'admin'].includes(userProfile.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Permisos insuficientes' 
      })
    }

    const { employeeId, email, expiresInHours = 48 }: SendInvitationRequest = req.body

    // Validación de entrada
    if (!employeeId || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Employee ID y email son requeridos' 
      })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email inválido' 
      })
    }

    const adminSupabase = createAdminClient()

    // Verificar que el empleado existe y pertenece a la misma empresa
    const { data: employee, error: employeeError } = await adminSupabase
      .from('employees')
      .select('id, name, email, status, company_id, role')
      .eq('id', employeeId)
      .eq('status', 'active')
      .single()

    if (employeeError || !employee) {
      logger.warn('Employee not found for invitation', { employeeId, email, error: employeeError?.message })
      return res.status(404).json({
        success: false,
        error: 'Empleado no encontrado o inactivo'
      })
    }

    // Verificar que el empleado pertenece a la misma empresa del admin
    if (employee.company_id !== userProfile.company_id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para invitar empleados de otras empresas'
      })
    }

    // Verificar que no existe una invitación pendiente para este empleado
    const { data: existingInvitation } = await adminSupabase
      .from('employee_invitations')
      .select('id, status, expires_at')
      .eq('employee_id', employeeId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe una invitación pendiente para este empleado'
      })
    }

    // Verificar que el empleado no tiene ya una cuenta de usuario
    const { data: existingAuthUsers } = await adminSupabase.auth.admin.listUsers()
    const existingAuthUser = existingAuthUsers?.users?.find((u: any) => u.email === email)

    if (existingAuthUser) {
      return res.status(400).json({
        success: false,
        error: 'El empleado ya tiene una cuenta de usuario activa'
      })
    }

    // Generar token único y seguro
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expiresInHours)

    // Crear invitación en la base de datos
    const { data: invitation, error: invitationError } = await adminSupabase
      .from('employee_invitations')
      .insert({
        email: email,
        employee_id: employeeId,
        company_id: employee.company_id,
        token: token,
        invited_by: user.id,
        expires_at: expiresAt.toISOString()
      })
      .select('id')
      .single()

    if (invitationError) {
      logger.error('Failed to create invitation', { employeeId, email, error: invitationError })
      return res.status(500).json({
        success: false,
        error: 'Error creando invitación'
      })
    }

    // Enviar email de invitación
    const invitationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'}/employees/invitation?token=${token}`
    
    try {
      // Obtener nombre de la empresa
      const { data: company } = await adminSupabase
        .from('companies')
        .select('name')
        .eq('id', employee.company_id)
        .single()
      
      const companyName = company?.name || 'Paragon Financial Corp'
      
      // Enviar email de invitación
      await sendInviteEmail({
        to: email,
        inviteUrl: invitationUrl,
        companyName: companyName,
        role: employee.role || 'employee'
      })
      
      logger.info('Employee invitation email sent successfully', {
        invitationId: invitation.id,
        employeeId: employeeId,
        employeeName: employee.name,
        email: email,
        token: token,
        expiresAt: expiresAt.toISOString(),
        invitationUrl: invitationUrl,
        companyName: companyName
      })
      
    } catch (emailError: any) {
      logger.error('Failed to send invitation email', {
        invitationId: invitation.id,
        employeeId: employeeId,
        email: email,
        error: emailError.message
      })
      
      // Aunque el email falle, la invitación se creó correctamente
      // El usuario puede usar el token directamente
    }

    return res.status(200).json({
      success: true,
      message: 'Invitación enviada exitosamente',
      invitationId: invitation.id,
      token: token // Solo para desarrollo - en producción no enviar el token
    })

  } catch (error) {
    logger.error('Send invitation error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}
