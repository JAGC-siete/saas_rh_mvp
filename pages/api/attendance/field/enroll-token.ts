import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../lib/supabase/server'
import {
  issueFieldEnrollToken,
  revokeActiveCredentials,
} from '../../../../lib/attendance/field-enroll-token'
import { listActiveCredentials } from '../../../../lib/attendance/field-webauthn'
import { logger } from '../../../../lib/logger'

/**
 * HR: issue one-time enroll token or revoke device credentials.
 * POST { employee_id, action?: 'issue' | 'revoke' }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { role, companyId, userProfile } = await requireCompanyAccess(req, res)

    if (!['company_admin', 'hr_manager', 'manager', 'super_admin'].includes(role)) {
      return res.status(403).json({ error: 'Sin permiso para gestionar vinculación de campo' })
    }

    const effectiveCompanyId =
      role === 'super_admin'
        ? typeof req.body?.company_id === 'string'
          ? req.body.company_id
          : typeof req.query.company_id === 'string'
            ? req.query.company_id
            : companyId
        : companyId

    if (!effectiveCompanyId) {
      return res.status(400).json({ error: 'company_id requerido' })
    }

    const employeeId =
      typeof (req.method === 'GET' ? req.query.employee_id : req.body?.employee_id) === 'string'
        ? String(req.method === 'GET' ? req.query.employee_id : req.body.employee_id)
        : ''

    if (!employeeId) {
      return res.status(400).json({ error: 'employee_id requerido', code: 'EMPLOYEE_REQUIRED' })
    }

    const admin = createAdminClient()
    const { data: employee, error: empErr } = await admin
      .from('employees')
      .select('id, name, company_id, status')
      .eq('id', employeeId)
      .single()

    if (empErr || !employee || employee.company_id !== effectiveCompanyId) {
      return res.status(404).json({ error: 'Empleado no encontrado en la empresa' })
    }

    if (req.method === 'GET') {
      const creds = await listActiveCredentials(employeeId)
      return res.status(200).json({
        employee_id: employeeId,
        employee_name: employee.name,
        active_credentials: creds.map((c) => ({
          id: c.id,
          credential_id_prefix: c.credential_id.slice(0, 12),
          last_counter: c.counter,
        })),
      })
    }

    const action = req.body?.action === 'revoke' ? 'revoke' : 'issue'
    const createdBy = userProfile?.id || 'unknown'

    if (action === 'revoke') {
      const n = await revokeActiveCredentials({
        employeeId,
        companyId: effectiveCompanyId,
      })
      logger.info('Field credentials revoked by HR', { employeeId, count: n, by: createdBy })
      return res.status(200).json({
        success: true,
        action: 'revoke',
        revoked: n,
        message: n > 0 ? 'Dispositivo desvinculado' : 'No había credenciales activas',
      })
    }

    const { token, expiresAt } = await issueFieldEnrollToken({
      employeeId,
      companyId: effectiveCompanyId,
      createdBy,
    })

    logger.info('Field enroll token issued', { employeeId, by: createdBy })

    return res.status(200).json({
      success: true,
      action: 'issue',
      employee_id: employeeId,
      employee_name: employee.name,
      enroll_token: token,
      expires_at: expiresAt,
      message:
        'Entrega este token al empleado (QR/SMS). Expira en 30 min y solo sirve para vincular un teléfono.',
    })
  } catch (error: any) {
    if (res.headersSent) return
    logger.error('field enroll-token API error', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
