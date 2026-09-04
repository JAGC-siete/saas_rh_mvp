import { NextApiRequest, NextApiResponse } from 'next'
import { withAttendanceFieldRateLimit } from '../../../../lib/security/rate-limiting'
import { getTrustedClientIp } from '../../../../lib/security/trusted-client-ip'
import { lookupFieldEmployee } from '../../../../lib/attendance/field-employee-lookup'
import { verifyAndStoreEnrollment } from '../../../../lib/attendance/field-webauthn'
import { consumeFieldEnrollToken } from '../../../../lib/attendance/field-enroll-token'
import { logger } from '../../../../lib/logger'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const clientIp = getTrustedClientIp(req)

  try {
    const { dni, last5, company_id, attestation, device_label, enroll_token } = req.body || {}

    if (!attestation || typeof attestation !== 'object') {
      return res.status(400).json({
        error: 'attestation WebAuthn requerida',
        code: 'ATTESTATION_REQUIRED',
      })
    }

    const lookup = await lookupFieldEmployee({
      dni,
      last5,
      companyId: company_id,
    })

    if (!lookup.ok) {
      return res.status(lookup.status).json(lookup.body)
    }

    const { employee } = lookup

    const tokenResult = await consumeFieldEnrollToken({
      employeeId: employee.id,
      companyId: employee.company_id,
      token: typeof enroll_token === 'string' ? enroll_token : '',
    })
    if (!tokenResult.ok) {
      return res.status(401).json({
        error: tokenResult.message,
        code: tokenResult.code,
        needsEnrollToken: true,
      })
    }

    const result = await verifyAndStoreEnrollment({
      req,
      employeeId: employee.id,
      companyId: employee.company_id,
      response: attestation as RegistrationResponseJSON,
      deviceLabel: typeof device_label === 'string' ? device_label.slice(0, 80) : undefined,
    })

    if (!result.ok) {
      return res.status(400).json({
        error: result.message,
        code: result.code,
      })
    }

    logger.info('Field device WebAuthn enrolled', {
      employeeId: employee.id,
      credentialPrefix: result.credentialId.slice(0, 12),
      ip: clientIp,
    })

    return res.status(200).json({
      success: true,
      message: 'Dispositivo vinculado. Ya puedes marcar asistencia con biometría.',
      employeeName: employee.name,
      company_id: employee.company_id,
      credentialIdPrefix: result.credentialId.slice(0, 12),
    })
  } catch (error) {
    logger.error('Unexpected error in field WebAuthn enroll', error)
    return res.status(500).json({ error: 'Error interno del servidor', code: 'INTERNAL' })
  }
}

export default withAttendanceFieldRateLimit(['POST'])(handler)
