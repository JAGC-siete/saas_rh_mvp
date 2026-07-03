import { NextApiRequest, NextApiResponse } from 'next'
import { withRateLimit } from '../../../lib/deduction-validator/rate-limit-wrapper'
import { RATE_LIMITS } from '../../../lib/rate-limit'
import { logger } from '../../../lib/logger'
import { validateEmail } from '../../../lib/deduction-validator/validation'
import { notificationManager } from '../../../lib/notification-providers'
import { getResendFromContact } from '../../../lib/resend-from'
import { generatePrestacionesReportPDF } from '../../../lib/prestaciones-public/pdf-report'
import { createAdminClient } from '../../../lib/supabase/server'
import { maskEmail, normalizeSoftPhone } from '../../../lib/privacy'
import {
  enrollPublicToolLeadNonBlocking,
  marketingSourceForPrestacionesCalculator,
} from '../../../lib/marketing/enroll-public-tool-lead'
import {
  generatePrestacionesEmailHTML,
  generatePrestacionesEmailSubject,
} from '../../../lib/prestaciones-public/email-template'
import { PUBLIC_PRESTACIONES_CONFIG } from '../../../lib/public-calculator/prestaciones-config'

interface SendPrestacionesReportRequest {
  email: string
  fullName?: string
  company?: string
  phone?: string
  consentNewsletter?: boolean
  audience?: 'empleado' | 'empresa'
  datosManuales: {
    salarioBaseMensual: number
    salarioPromedioMensual: number
    fechaIngreso: string
    fechaEgreso: string
    antiguedadTexto: string
  }
  parametros: {
    motivoSalida: string
    preavisoGozado: boolean
  }
  rubros: {
    preaviso: number
    cesantiaBruta: number
    rapAplicado: number
    cesantiaNeta: number
    vacaciones: number
    aguinaldo: number
    decimoCuarto: number
    reservaLaboralEstimada?: number
    reservaLaboralEnTotal: number
    totalPagar: number
  }
  reservaLaboralDisclaimer?: string
}

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

  return await resend.emails.send({
    from: fromEmail,
    to: email,
    subject,
    html,
    attachments: [{ filename, content: pdfBase64 }],
  })
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const startTime = Date.now()

  try {
    const body: SendPrestacionesReportRequest = req.body

    const emailValidation = validateEmail(body.email)
    if (!emailValidation.valid) {
      logger.warn('Email inválido en send-prestaciones-report', {
        email: maskEmail(body.email),
        error: emailValidation.error,
      })
      return res.status(400).json({
        error: emailValidation.error || 'El email proporcionado no es válido',
      })
    }
    const sanitizedEmail = emailValidation.sanitized as string
    const consent = body.consentNewsletter === true
    const name = typeof body.fullName === 'string' ? body.fullName.trim() : ''

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

    const calcAudience =
      body.audience === 'empresa' || body.audience === 'empleado' ? body.audience : null
    const useGodfatherFunnel = calcAudience !== 'empresa'
    const godfatherKeyword = PUBLIC_PRESTACIONES_CONFIG.funnel.godfatherKeyword

    logger.info('Envío de prestaciones por email iniciado', {
      email: maskEmail(sanitizedEmail),
    })

    // Guardar lead (sin datos salariales)
    try {
      const supabase = createAdminClient()
      const phoneNorm = normalizeSoftPhone(body.phone)

      await (supabase as any)
        .from('leads_public_tools')
        .upsert(
          {
            email: sanitizedEmail,
            full_name: name,
            company: typeof body.company === 'string' ? body.company.trim() || null : null,
            phone: phoneNorm,
            source: 'prestaciones',
            calc_audience: calcAudience,
            consent_newsletter: true,
            consented_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        )
    } catch (e: any) {
      logger.warn('No se pudo guardar lead (prestaciones)', {
        email: maskEmail(sanitizedEmail),
        error: e?.message,
      })
      // No bloqueamos envío de PDF si falla el guardado
    }

    if (calcAudience === 'empresa') {
      logger.info('Lead B2B prioritaria — calculadora prestaciones', {
        email: maskEmail(sanitizedEmail),
        company: typeof body.company === 'string' ? body.company.trim() || null : null,
      })
    }

    const reservaLaboralEnTotal = Number(body.rubros.reservaLaboralEnTotal) || 0
    const reservaLaboralDisclaimer =
      typeof body.reservaLaboralDisclaimer === 'string' && body.reservaLaboralDisclaimer.trim()
        ? body.reservaLaboralDisclaimer.trim()
        : undefined

    const pdfBuffer = await generatePrestacionesReportPDF({
      salarioBaseMensual: body.datosManuales.salarioBaseMensual,
      salarioPromedioMensual: body.datosManuales.salarioPromedioMensual,
      fechaIngreso: body.datosManuales.fechaIngreso,
      fechaEgreso: body.datosManuales.fechaEgreso,
      antiguedadTexto: body.datosManuales.antiguedadTexto,
      motivoSalida: body.parametros.motivoSalida,
      preavisoGozado: body.parametros.preavisoGozado,
      reservaLaboralDisclaimer,
      rubros: {
        ...body.rubros,
        reservaLaboralEnTotal,
      },
    })

    const html = generatePrestacionesEmailHTML({
      totalPagar: body.rubros.totalPagar,
      motivoSalida: body.parametros.motivoSalida,
      preavisoGozado: body.parametros.preavisoGozado,
      salarioBaseMensual: body.datosManuales.salarioBaseMensual,
      salarioPromedioMensual: body.datosManuales.salarioPromedioMensual,
      antiguedadTexto: body.datosManuales.antiguedadTexto,
      audience: calcAudience ?? undefined,
      useGodfatherFunnel,
      godfatherKeyword,
      reservaLaboralDisclaimer,
      rubros: {
        preaviso: body.rubros.preaviso,
        cesantiaBruta: body.rubros.cesantiaBruta,
        rapAplicado: body.rubros.rapAplicado,
        cesantiaNeta: body.rubros.cesantiaNeta,
        vacaciones: body.rubros.vacaciones,
        aguinaldo: body.rubros.aguinaldo,
        decimoCuarto: body.rubros.decimoCuarto,
        reservaLaboralEnTotal,
      },
    })

    const subject = generatePrestacionesEmailSubject()
    const filename = `prestaciones-honduras.pdf`

    const systemCompanyId = 'system-public-tool'
    const notificationConfig = await notificationManager.getConfigForCompany(systemCompanyId)
    const apiKey = notificationConfig?.emailProvider.apiKey || process.env.RESEND_API_KEY
    const fromEmail = getResendFromContact()

    if (!apiKey) {
      logger.error('RESEND_API_KEY no configurado (prestaciones)')
      return res.status(500).json({ error: 'Error de configuración del servicio de email' })
    }

    const result = await sendEmailWithResend(
      sanitizedEmail,
      subject,
      html,
      pdfBuffer,
      filename,
      apiKey,
      fromEmail
    )

    if ((result as any)?.error) {
      logger.error('Error enviando email con Resend (prestaciones)', {
        error: (result as any).error?.message,
        email: maskEmail(sanitizedEmail),
      })
      return res.status(500).json({
        error: 'Error al enviar el reporte por email',
        details: process.env.NODE_ENV === 'development' ? (result as any).error?.message : undefined,
      })
    }

    const duration = Date.now() - startTime
    logger.info('Reporte prestaciones enviado exitosamente', {
      email: maskEmail(sanitizedEmail),
      messageId: (result as any)?.id,
      duration,
    })

    enrollPublicToolLeadNonBlocking(
      sanitizedEmail,
      marketingSourceForPrestacionesCalculator()
    )

    return res.status(200).json({
      success: true,
      messageId: (result as any)?.id,
      message: 'Reporte enviado exitosamente',
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Error en send-prestaciones-report API', {
      error: error?.message,
      stack: error?.stack,
      duration,
    })

    return res.status(500).json({
      error: 'Error interno del servidor al enviar el reporte',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    })
  }
}

export default withRateLimit(RATE_LIMITS.PUBLIC_EMAIL, handler)

