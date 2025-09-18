import { Resend } from 'resend'
import { logger } from './logger'

// Store OTP codes temporarily (in production, use Redis or database)
const otpStore = new Map<string, { code: string, expires: number, attempts: number }>()

// Clean expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [email, data] of otpStore.entries()) {
    if (data.expires < now) {
      otpStore.delete(email)
    }
  }
}, 5 * 60 * 1000)

export async function sendOtp(email: string, employeeId: string, employeeName: string) {
  try {
    // Check rate limiting (max 3 attempts per 15 minutes)
    const existing = otpStore.get(email)
    if (existing && existing.attempts >= 3 && existing.expires > Date.now()) {
      return {
        success: false,
        error: 'Demasiados intentos. Intente nuevamente en 15 minutos.'
      }
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + (10 * 60 * 1000) // 10 minutes
    
    // Store OTP
    otpStore.set(email, {
      code: otpCode,
      expires: expiresAt,
      attempts: (existing?.attempts || 0) + 1
    })

    // Send email using Resend
    const resendApiKey = process.env.RESEND_API_KEY
    
    if (!resendApiKey) {
      logger.error('RESEND_API_KEY not configured')
      return {
        success: false,
        error: 'Configuración de email no disponible'
      }
    }

    const resend = new Resend(resendApiKey)
    
    const { data, error: resendError } = await resend.emails.send({
      from: 'Portal de Empleados <noreply@humanosisu.net>',
      to: [email],
      subject: 'Código de Acceso - Portal de Empleados',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e293b; margin-bottom: 10px;">Portal de Empleados</h1>
            <p style="color: #64748b; font-size: 16px;">Paragon Honduras</p>
          </div>
          
          <div style="background: #f8fafc; border-radius: 8px; padding: 30px; text-align: center; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-bottom: 15px;">Hola ${employeeName}</h2>
            <p style="color: #64748b; margin-bottom: 20px;">Su código de acceso es:</p>
            <div style="font-size: 32px; font-weight: bold; color: #3b82f6; letter-spacing: 8px; font-family: monospace; background: white; padding: 15px; border-radius: 6px; border: 2px solid #e2e8f0;">
              ${otpCode}
            </div>
            <p style="color: #64748b; margin-top: 15px; font-size: 14px;">
              Este código expira en <strong>10 minutos</strong>
            </p>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Importante:</strong> Si no solicitó este código, ignore este mensaje. 
              Nunca comparta este código con nadie.
            </p>
          </div>
          
          <div style="text-align: center; color: #64748b; font-size: 12px;">
            <p>Paragon Honduras - Sistema de Recursos Humanos</p>
            <p>Este es un mensaje automático, no responda a este email.</p>
          </div>
        </div>
      `
    })

    if (resendError) {
      logger.error('Failed to send OTP email via Resend', {
        email,
        employeeId,
        error: resendError.message
      })
      
      return {
        success: false,
        error: 'Error enviando código. Intente nuevamente.'
      }
    }

    logger.info('OTP email sent successfully', {
      employeeId,
      email,
      messageId: data?.id
    })

    return {
      success: true,
      message: 'Código enviado a su email. Revise su bandeja de entrada.',
      expiresIn: 600
    }

  } catch (error: any) {
    logger.error('Send OTP error', error)
    return {
      success: false,
      error: 'Error interno del servidor'
    }
  }
}

export function verifyOtp(email: string, code: string) {
  // Verify OTP from store
  const storedOtp = otpStore.get(email)
  
  if (!storedOtp) {
    return {
      success: false,
      error: 'Código no encontrado o expirado'
    }
  }

  if (storedOtp.expires < Date.now()) {
    otpStore.delete(email)
    return {
      success: false,
      error: 'Código expirado'
    }
  }

  if (storedOtp.code !== code) {
    return {
      success: false,
      error: 'Código inválido'
    }
  }

  // OTP verified successfully, clear from store
  otpStore.delete(email)
  
  return {
    success: true
  }
}
