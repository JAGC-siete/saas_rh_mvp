import { NextApiRequest, NextApiResponse } from 'next'
import { generateDeductionReportPDF } from '../../../lib/deduction-validator/pdf-report'
import { notificationManager } from '../../../lib/notification-providers'
import { generateDeductionEmailHTML, generateDeductionEmailSubject } from '../../../lib/deduction-validator/email-template'
import { validateEmail } from '../../../lib/deduction-validator/validation'
import { withRateLimit } from '../../../lib/deduction-validator/rate-limit-wrapper'
import { RATE_LIMITS } from '../../../lib/rate-limit'
import { logger } from '../../../lib/logger'

interface SendDeductionReportRequest {
  email: string
  salary: number
  grossSalary: number
  monthlyGrossSalary: number
  paymentModality: 'quincenal' | 'mensual'
  year: number
  ihss: number
  ihssPercentage: number
  rap: number
  rapPercentage: number
  isr: number
  isrPercentage: number
  totalDeductions: number
  netSalary: number
  constants: {
    minimumWage: number
    ihssCeiling: number
  }
}

/**
 * Función auxiliar para enviar email con Resend
 */
async function sendEmailWithResend(
  email: string,
  subject: string,
  html: string,
  pdfBuffer: Buffer,
  filename: string,
  apiKey: string,
  fromEmail: string
) {
  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)

  const pdfBase64 = pdfBuffer.toString('base64')

  const result = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject,
    html,
    attachments: [
      {
        filename,
        content: pdfBase64
      }
    ]
  })

  return result
}

async function sendReportHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const startTime = Date.now()
  const clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown'

  try {
    const {
      email,
      salary,
      grossSalary,
      monthlyGrossSalary,
      paymentModality,
      year,
      ihss,
      ihssPercentage,
      rap,
      rapPercentage,
      isr,
      isrPercentage,
      totalDeductions,
      netSalary,
      constants
    }: SendDeductionReportRequest = req.body

    // Validación robusta de email
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      logger.warn('Email inválido en send-deduction-report', {
        email,
        error: emailValidation.error,
        ip: clientIP
      })
      return res.status(400).json({ 
        error: emailValidation.error || 'El email proporcionado no es válido' 
      })
    }

    const sanitizedEmail = emailValidation.sanitized as string

    // Log para métricas
    logger.info('Envío de reporte por email iniciado', {
      email: sanitizedEmail,
      year,
      paymentModality,
      ip: clientIP
    })

    // Generar PDF
    const pdfBuffer = await generateDeductionReportPDF({
      salary,
      grossSalary,
      monthlyGrossSalary,
      paymentModality,
      year,
      ihss,
      ihssPercentage,
      rap,
      rapPercentage,
      isr,
      isrPercentage,
      totalDeductions,
      netSalary,
      constants
    })

    // Generar HTML del email usando plantilla
    const emailHTML = generateDeductionEmailHTML({
      year,
      paymentModality,
      grossSalary,
      ihss,
      ihssPercentage,
      rap,
      rapPercentage,
      isr,
      isrPercentage,
      totalDeductions,
      netSalary
    })

    const subject = generateDeductionEmailSubject(year)
    const filename = `reporte-deducciones-${year}-${paymentModality}.pdf`

    // Obtener configuración de notificaciones
    const systemCompanyId = 'system-public-tool'
    const notificationConfig = await notificationManager.getConfigForCompany(systemCompanyId)

    // Determinar configuración de email
    const apiKey = notificationConfig?.emailProvider.apiKey || process.env.RESEND_API_KEY
    const fromEmail = notificationConfig?.emailProvider.fromEmail || process.env.RESEND_FROM || 'noreply@humanosisu.net'

    if (!apiKey) {
      logger.error('RESEND_API_KEY no configurado')
      return res.status(500).json({ 
        error: 'Error de configuración del servicio de email' 
      })
    }

    // Enviar email
    const result = await sendEmailWithResend(
      sanitizedEmail,
      subject,
      emailHTML,
      pdfBuffer,
      filename,
      apiKey,
      fromEmail
    )

    if ((result as any)?.error) {
      logger.error('Error enviando email con Resend', {
        error: (result as any).error?.message,
        email: sanitizedEmail,
        ip: clientIP
      })
      return res.status(500).json({ 
        error: 'Error al enviar el reporte por email',
        details: process.env.NODE_ENV === 'development' ? (result as any).error?.message : undefined
      })
    }

    // Log de éxito
    const duration = Date.now() - startTime
    logger.info('Reporte enviado exitosamente', {
      email: sanitizedEmail,
      messageId: (result as any)?.id,
      duration,
      ip: clientIP
    })

    return res.status(200).json({ 
      success: true,
      messageId: (result as any)?.id,
      message: 'Reporte enviado exitosamente'
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Error en send-deduction-report API', {
      error: error.message,
      stack: error.stack,
      duration,
      ip: clientIP
    })
    
    return res.status(500).json({ 
      error: 'Error interno del servidor al enviar el reporte',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Exportar handler con rate limiting aplicado
export default withRateLimit(RATE_LIMITS.PUBLIC_EMAIL, sendReportHandler)
