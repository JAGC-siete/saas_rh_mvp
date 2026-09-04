import { NextApiRequest, NextApiResponse } from 'next'
import { withAttendanceFieldRateLimit } from '../../../../lib/security/rate-limiting'
import { getTrustedClientIp } from '../../../../lib/security/trusted-client-ip'
import { lookupFieldEmployee } from '../../../../lib/attendance/field-employee-lookup'
import {
  createEnrollOptions,
  createAssertOptions,
  listActiveCredentials,
  isPlatformAuthenticatorAvailableClientHint,
} from '../../../../lib/attendance/field-webauthn'
import { peekFieldEnrollToken } from '../../../../lib/attendance/field-enroll-token'
import { logger } from '../../../../lib/logger'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const clientIp = getTrustedClientIp(req)
  const userAgent = (req.headers['user-agent'] || '').toString()

  try {
    const { dni, last5, company_id, purpose, enroll_token } = req.body || {}
    const purposeStr = purpose === 'enroll' ? 'enroll' : purpose === 'assert' ? 'assert' : null

    if (!purposeStr) {
      return res.status(400).json({
        error: 'purpose debe ser enroll o assert',
        code: 'PURPOSE_INVALID',
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
    const credentials = await listActiveCredentials(employee.id)
    const enrolled = credentials.length > 0

    if (purposeStr === 'assert' && !enrolled) {
      return res.status(409).json({
        error: 'Dispositivo no vinculado',
        code: 'WEBAUTHN_NOT_ENROLLED',
        message: 'Debes registrar la biometría de este teléfono antes de marcar.',
        needsEnroll: true,
        employeeName: employee.name,
        company_id: employee.company_id,
        platformHintOk: isPlatformAuthenticatorAvailableClientHint(userAgent),
      })
    }

    if (purposeStr === 'enroll') {
      const tokenCheck = await peekFieldEnrollToken({
        employeeId: employee.id,
        companyId: employee.company_id,
        token: typeof enroll_token === 'string' ? enroll_token : '',
      })
      if (!tokenCheck.ok) {
        return res.status(401).json({
          error: tokenCheck.message,
          code: tokenCheck.code,
          needsEnrollToken: true,
        })
      }

      const enrollResult = await createEnrollOptions({
        req,
        employeeId: employee.id,
        companyId: employee.company_id,
        employeeName: employee.name,
        employeeDni: employee.dni,
      })

      if (!enrollResult.ok) {
        return res.status(409).json({
          error: enrollResult.message,
          code: enrollResult.code,
          employeeName: employee.name,
          company_id: employee.company_id,
        })
      }

      logger.info('Field WebAuthn enroll options issued', {
        employeeId: employee.id,
        ip: clientIp,
      })

      return res.status(200).json({
        purpose: 'enroll',
        enrolled,
        employeeName: employee.name,
        company_id: employee.company_id,
        options: enrollResult.options,
        platformHintOk: isPlatformAuthenticatorAvailableClientHint(userAgent),
      })
    }

    const assertResult = await createAssertOptions({
      req,
      employeeId: employee.id,
      companyId: employee.company_id,
    })

    if (!assertResult.ok) {
      return res.status(409).json({
        error: assertResult.message,
        code: assertResult.code,
        needsEnroll: assertResult.code === 'WEBAUTHN_NOT_ENROLLED',
        employeeName: employee.name,
        company_id: employee.company_id,
      })
    }

    logger.info('Field WebAuthn assert options issued', {
      employeeId: employee.id,
      ip: clientIp,
    })

    return res.status(200).json({
      purpose: 'assert',
      enrolled: true,
      employeeName: employee.name,
      company_id: employee.company_id,
      options: assertResult.options,
      platformHintOk: isPlatformAuthenticatorAvailableClientHint(userAgent),
    })
  } catch (error: any) {
    if (String(error?.message || '').includes('WEBAUTHN_RP_ID')) {
      return res.status(500).json({
        error: error.message,
        code: 'WEBAUTHN_RP_MISCONFIGURED',
      })
    }
    logger.error('Unexpected error in field WebAuthn options', error)
    return res.status(500).json({ error: 'Error interno del servidor', code: 'INTERNAL' })
  }
}

export default withAttendanceFieldRateLimit(['POST'])(handler)
