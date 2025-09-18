import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { Resend } from 'resend'

interface SendOtpRequest {
  email: string
}

interface SendOtpResponse {
  success: boolean
  message?: string
  error?: string
  expiresIn?: number
}

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

export default async function handler(req: NextApiRequest, res: NextApiResponse<SendOtpResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    const { email }: SendOtpRequest = req.body

    // Input validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email inválido' 
      })
    }

    const supabase = createClient(req, res)
    
    // Verify the email belongs to an active employee
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, name, email, company_id')
      .eq('email', email)
      .eq('company_id', '00000000-0000-0000-0000-000000000001') // Paragon
      .eq('status', 'active')
      .single()

    if (employeeError || !employee) {
      logger.warn('Employee email not found for OTP', {
        email,
        error: employeeError?.message
      })
      
      return res.status(401).json({
        success: false,
        error: 'Email no encontrado o empleado inactivo'
      })
    }

    // Check rate limiting (max 3 attempts per 15 minutes)
    const existing = otpStore.get(email)
    if (existing && existing.attempts >= 3 && existing.expires > Date.now()) {
      return res.status(429).json({
        success: false,
        error: 'Demasiados intentos. Intente nuevamente en 15 minutos.'
      })
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

    // Send email using Resend SDK
    const resendApiKey = process.env.RESEND_API_KEY
    
    if (!resendApiKey) {
      logger.error('RESEND_API_KEY not configured')
      return res.status(500).json({
        success: false,
        error: 'Configuración de email no disponible'
      })
    }

    try {
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
              <h2 style="color: #1e293b; margin-bottom: 15px;">Su código de acceso</h2>
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
        throw new Error(resendError.message || 'Resend API error')
      }

      logger.info('OTP email sent via Resend SDK', {
        employeeId: employee.id,
        email: email,
        messageId: data?.id
      })

    } catch (emailError: any) {
      logger.error('Failed to send OTP email via Resend', {
        email,
        employeeId: employee.id,
        error: emailError.message
      })
      
      return res.status(500).json({
        success: false,
        error: 'Error enviando código. Intente nuevamente.'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Código enviado a su email. Revise su bandeja de entrada.',
      expiresIn: 600 // 10 minutes in seconds
    })

  } catch (error) {
    logger.error('Send OTP error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}

// Export OTP store for verification endpoint
export { otpStore }
