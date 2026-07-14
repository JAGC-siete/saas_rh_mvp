import { NextApiRequest, NextApiResponse } from 'next'
import { generateDeductionReportPDF } from '../../../lib/deduction-validator/pdf-report'
import { notificationManager } from '../../../lib/notification-providers'
import { getResendFromContact, getResendContactEmail } from '../../../lib/resend-from'
import { generateDeductionEmailHTML, generateDeductionEmailSubject } from '../../../lib/deduction-validator/email-template'
import { validateEmail } from '../../../lib/deduction-validator/validation'
import { withRateLimit } from '../../../lib/deduction-validator/rate-limit-wrapper'
import { RATE_LIMITS } from '../../../lib/rate-limit'
import { logger } from '../../../lib/logger'
import { createAdminClient } from '../../../lib/supabase/server'
import { maskEmail, normalizeSoftPhone } from '../../../lib/privacy'
import {
  enrollPublicToolLeadNonBlocking,
  marketingSourceForDeductionCalculator,
} from '../../../lib/marketing/enroll-public-tool-lead'
import { parseCountryCodeInput } from '../../../lib/country/supported'
import { PUBLIC_CALCULATOR_CONFIGS } from '../../../lib/public-calculator/config'
import {
  parseMetaTrackingPayload,
  sendMetaWebsiteConversionFireAndForget,
} from '../../../lib/analytics/metaCapiServer'

interface SendDeductionReportRequest {
  email: string
  fullName?: string
  company?: string
  phone?: string
  consentNewsletter?: boolean
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
  country_code?: string
  audience?: 'empleado' | 'empresa'
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
  fromEmail: string,
  replyTo?: string
) {
  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)

  const pdfBase64 = pdfBuffer.toString('base64')

  const result = await resend.emails.send({
    from: fromEmail,
    to: email,
    replyTo: replyTo || undefined,
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

  try {
    const {
      email,
      fullName,
      company,
      phone,
      consentNewsletter,
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
      constants,
      country_code: countryCode,
      audience: bodyAudience,
    }: SendDeductionReportRequest = req.body

    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      logger.warn('Email inválido en send-deduction-report', {
        email: maskEmail(email),
        error: emailValidation.error,
      })
      return res.status(400).json({ 
        error: emailValidation.error || 'El email proporcionado no es válido' 
      })
    }

    const sanitizedEmail = emailValidation.sanitized as string
    const consent = consentNewsletter === true
    const name = typeof fullName === 'string' ? fullName.trim() : ''
    const resolvedCountry = parseCountryCodeInput(
      typeof countryCode === 'string' ? countryCode : undefined
    ) ?? 'HND'
    const calcAudience =
      bodyAudience === 'empresa' || bodyAudience === 'empleado' ? bodyAudience : null
    const useGodfatherFunnel =
      resolvedCountry === 'HND' &&
      Boolean(PUBLIC_CALCULATOR_CONFIGS.HND.b2bFunnel) &&
      calcAudience !== 'empresa'
    const godfatherKeyword = PUBLIC_CALCULATOR_CONFIGS.HND.b2bFunnel?.godfatherKeyword

    if (!consent) {
      return res.status(400).json({
        error: 'Debes aceptar la suscripción para recibir el cálculo en PDF.',
      })
    }

    if (!name) {
      return res.status(400).json({
        error: 'Ingresa tu nombre para enviarte el PDF.',
      })
    }

    // Log para métricas
    logger.info('Envío de reporte por email iniciado', {
      email: maskEmail(sanitizedEmail),
      year,
      paymentModality,
    })

    // Guardar lead (sin datos salariales)
    try {
      const supabase = createAdminClient()
      const phoneNorm = normalizeSoftPhone(phone)

      await (supabase as any)
        .from('leads_public_tools')
        .upsert(
          {
            email: sanitizedEmail,
            full_name: name,
            company: typeof company === 'string' ? company.trim() || null : null,
            phone: phoneNorm,
            source: 'deducciones',
            calc_audience: calcAudience,
            consent_newsletter: true,
            consented_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            godfather_pending: useGodfatherFunnel,
            ...(useGodfatherFunnel ? {} : { godfather_sent_at: null }),
          },
          { onConflict: 'email' }
        )
    } catch (e: any) {
      logger.warn('No se pudo guardar lead (deducciones)', {
        email: maskEmail(sanitizedEmail),
        error: e?.message,
      })
      // No bloqueamos envío de PDF si falla el guardado
    }

    if (calcAudience === 'empresa') {
      logger.info('Lead B2B prioritaria — calculadora deducciones', {
        country: resolvedCountry,
        email: maskEmail(sanitizedEmail),
        company: typeof company === 'string' ? company.trim() || null : null,
      })
    }

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
      constants,
      countryCode: resolvedCountry,
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
      netSalary,
      countryCode: resolvedCountry,
      useGodfatherFunnel,
      godfatherKeyword,
      audience: calcAudience ?? undefined,
    })

    const subject = generateDeductionEmailSubject(year, useGodfatherFunnel)
    const filename = `reporte-deducciones-${year}-${paymentModality}.pdf`

    // Obtener configuración de notificaciones
    const systemCompanyId = 'system-public-tool'
    const notificationConfig = await notificationManager.getConfigForCompany(systemCompanyId)

    // Determinar configuración de email
    const apiKey = notificationConfig?.emailProvider.apiKey || process.env.RESEND_API_KEY
    const fromEmail = getResendFromContact()
    const replyTo = useGodfatherFunnel ? getResendContactEmail() : undefined

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
      fromEmail,
      replyTo
    )

    if ((result as any)?.error) {
      logger.error('Error enviando email con Resend', {
        error: (result as any).error?.message,
        email: maskEmail(sanitizedEmail),
      })
      return res.status(500).json({ 
        error: 'Error al enviar el reporte por email',
        details: process.env.NODE_ENV === 'development' ? (result as any).error?.message : undefined
      })
    }

    const duration = Date.now() - startTime
    logger.info('Reporte enviado exitosamente', {
      email: maskEmail(sanitizedEmail),
      messageId: (result as any)?.id,
      duration,
    })

    enrollPublicToolLeadNonBlocking(
      sanitizedEmail,
      marketingSourceForDeductionCalculator(resolvedCountry)
    )

    const metaTracking = parseMetaTrackingPayload(req.body)
    sendMetaWebsiteConversionFireAndForget({
      req,
      eventName: 'CompleteRegistration',
      tracking: metaTracking,
      userData: {
        email: sanitizedEmail,
        phone: typeof phone === 'string' ? phone : undefined,
        firstName: name || undefined,
      },
      customData: {
        content_name: marketingSourceForDeductionCalculator(resolvedCountry),
        content_category: 'calculator',
        value: 1,
        currency: 'USD',
        status: true,
      },
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
    })
    
    return res.status(500).json({ 
      error: 'Error interno del servidor al enviar el reporte',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Exportar handler con rate limiting aplicado
export default withRateLimit(RATE_LIMITS.PUBLIC_EMAIL, sendReportHandler)
