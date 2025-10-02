import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

interface ValidateInvitationResponse {
  success: boolean
  invitation?: any
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ValidateInvitationResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    const { token } = req.query

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Token de invitación requerido' 
      })
    }

    const adminSupabase = createAdminClient()

    // Buscar la invitación válida - usar maybeSingle para evitar errores de múltiples filas
    const { data: invitation, error: invitationError } = await adminSupabase
      .from('employee_invitations')
      .select('id, email, employee_id, status, expires_at')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (invitationError) {
      logger.error('Error querying invitation for validation', { token, error: invitationError?.message })
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor al buscar invitación'
      })
    }

    if (!invitation) {
      logger.warn('Invalid invitation token validation', { token })
      return res.status(400).json({
        success: false,
        error: 'Invitación inválida o expirada'
      })
    }

    // Buscar información del empleado por separado
    const { data: employee, error: employeeError } = await adminSupabase
      .from('employees')
      .select('id, name, email, role')
      .eq('id', invitation.employee_id)
      .maybeSingle()

    if (employeeError) {
      logger.error('Error querying employee for invitation validation', { 
        invitationId: invitation.id, 
        employeeId: invitation.employee_id,
        error: employeeError?.message
      })
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor al buscar empleado'
      })
    }

    if (!employee) {
      logger.warn('Employee not found for invitation validation', { 
        invitationId: invitation.id, 
        employeeId: invitation.employee_id
      })
      return res.status(400).json({
        success: false,
        error: 'Empleado no encontrado'
      })
    }

    // Construir respuesta con datos del empleado
    const invitationWithEmployee = {
      ...invitation,
      employees: [employee]
    }

    return res.status(200).json({
      success: true,
      invitation: invitationWithEmployee
    })

  } catch (error) {
    logger.error('Validate invitation error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}
