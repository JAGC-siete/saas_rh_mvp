import { Resend } from 'resend'
import { logger } from './logger'
import { getResendFromNoreply } from './resend-from'
import {
  escapeHtml,
  transactionalInfoBox,
  transactionalParagraph,
  wrapTransactionalEmail,
} from './emails/transactional-layout'

// Store OTP codes temporarily (in production, use Redis or database)
// Rate limiting for send/verify is enforced in API routes via lib/security/rate-limiting
const otpStore = new Map<string, { code: string; expires: number }>()

// Clean expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now()
  const entries = Array.from(otpStore.entries())
  for (const [email, data] of entries) {
    if (data.expires < now) {
      otpStore.delete(email)
    }
  }
}, 5 * 60 * 1000)

export async function sendOtp(email: string, employeeId: string, employeeName: string) {
  try {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000

    otpStore.set(email.trim().toLowerCase(), {
      code: otpCode,
      expires: expiresAt,
    })

    const resendApiKey = process.env.RESEND_API_KEY

    if (!resendApiKey) {
      logger.error('RESEND_API_KEY not configured')
      return {
        success: false,
        error: 'Configuración de email no disponible',
      }
    }

    const resend = new Resend(resendApiKey)

    const bodyHtml = [
      transactionalParagraph(`Hola <strong style="color: #1a1a1a;">${escapeHtml(employeeName)}</strong>,`),
      transactionalParagraph('Use este código para acceder al portal de empleados:'),
      `<div style="text-align: center; margin: 20px 0;">
        <motion></motion>
      </div>`.replace(
        '<motion></motion>',
        `<motion></motion>`.replace(
          '<motion></motion>',
          `<div style="display: inline-block; font-size: 32px; font-weight: 700; color: #0b4fa1; letter-spacing: 8px; font-family: monospace; background: #f8fafc; padding: 16px 24px; border-radius: 8px; border: 1px solid #e2e8f0;">${otpCode}</div>`
        )
      ),
      transactionalParagraph('Este código expira en <strong>10 minutos</strong>.'),
      transactionalInfoBox(
        '<strong>Seguridad:</strong> si no solicitó este código, ignore este mensaje. Nunca lo comparta con terceros.',
        'warning'
      ),
    ].join('')

    const html = wrapTransactionalEmail({
      title: 'Código de acceso',
      subtitle: 'Portal de Empleados',
      bodyHtml,
      footerNote: 'Correo automático de acceso. No responda a este mensaje.',
    })

    const { data, error: resendError } = await resend.emails.send({
      from: getResendFromNoreply({ displayName: 'Portal de Empleados' }),
      to: [email],
      subject: 'Código de Acceso - Portal de Empleados',
      html,
    })

    if (resendError) {
      logger.error('Failed to send OTP email via Resend', {
        email,
        employeeId,
        error: resendError.message,
      })

      return {
        success: false,
        error: 'Error enviando código. Intente nuevamente.',
      }
    }

    logger.info('OTP email sent successfully', {
      employeeId,
      email,
      messageId: data?.id,
    })

    return {
      success: true,
      message: 'Código enviado a su email. Revise su bandeja de entrada.',
      expiresIn: 600,
    }
  } catch (error: any) {
    logger.error('Send OTP error', error)
    return {
      success: false,
      error: 'Error interno del servidor',
    }
  }
}

export function verifyOtp(email: string, code: string) {
  const storedOtp = otpStore.get(email.trim().toLowerCase())

  if (!storedOtp) {
    return {
      success: false,
      error: 'Código no encontrado o expirado',
    }
  }

  if (storedOtp.expires < Date.now()) {
    otpStore.delete(email.trim().toLowerCase())
    return {
      success: false,
      error: 'Código expirado',
    }
  }

  if (storedOtp.code !== code) {
    return {
      success: false,
      error: 'Código inválido',
    }
  }

  otpStore.delete(email.trim().toLowerCase())

  return {
    success: true,
  }
}
