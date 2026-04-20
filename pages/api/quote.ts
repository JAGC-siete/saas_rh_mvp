import type { NextApiRequest, NextApiResponse } from 'next'
import { withRateLimit } from '../../lib/deduction-validator/rate-limit-wrapper'
import { RATE_LIMITS } from '../../lib/rate-limit'
import { validateEmail } from '../../lib/deduction-validator/validation'
import { createAdminClient } from '../../lib/supabase/server'
import { logger } from '../../lib/logger'
import { maskEmail, normalizeSoftPhone } from '../../lib/privacy'
import { notificationManager } from '../../lib/notification-providers'
import type { QuotationRequest, QuotationResponse, VentasPricingTier, CurrencyCode } from '../../lib/ventas/types'
import { clampInt, normalizeCouponCode, resolveTierByEmployees, roundMoney } from '../../lib/ventas/pricing'
import { generateVentasQuotationPDF } from '../../lib/ventas/pdf'
import { generateVentasQuotationEmailHTML, generateVentasQuotationEmailSubject } from '../../lib/ventas/email-template'

const FALLBACK_CURRENCY: CurrencyCode = 'HNL'
const FALLBACK_COUPON_CODE = 'gastro2026'
const FALLBACK_COUPON_DISCOUNT_PCT = 0.45
const FALLBACK_TIERS: VentasPricingTier[] = [
  { min_employees: 1, max_employees: 30, price: 65000, is_active: true, sort_order: 10 },
  { min_employees: 31, max_employees: 50, price: 74000, is_active: true, sort_order: 20 },
  { min_employees: 51, max_employees: 100, price: 85000, is_active: true, sort_order: 30 },
  { min_employees: 101, max_employees: 200, price: 97450, is_active: true, sort_order: 40 },
]

async function sendEmailWithResend(params: {
  to: string | string[]
  subject: string
  html: string
  pdfBuffer: Buffer
  filename: string
  apiKey: string
  fromEmail: string
}) {
  const { Resend } = await import('resend')
  const resend = new Resend(params.apiKey)
  return await resend.emails.send({
    from: params.fromEmail,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: [{ filename: params.filename, content: params.pdfBuffer.toString('base64') }],
  })
}

async function handler(req: NextApiRequest, res: NextApiResponse<QuotationResponse | { error: string; message?: string }>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const startTime = Date.now()
  const body: QuotationRequest = req.body || ({} as any)

  const emailValidation = validateEmail(body.contact_email)
  if (!emailValidation.valid || !(emailValidation.sanitized as string)) {
    logger.warn('Email inválido en /api/quote', {
      email: maskEmail(body?.contact_email as any),
      error: emailValidation.error,
    })
    return res.status(400).json({ error: emailValidation.error || 'El email proporcionado no es válido' })
  }
  const contactEmail = emailValidation.sanitized as string

  const employeesCount = clampInt(Number(body.employees_count), 1, 200)
  if (employeesCount < 1 || employeesCount > 200) {
    return res.status(400).json({ error: 'El número de empleados debe estar entre 1 y 200.' })
  }

  const terminalsCountRaw = body.terminals_count
  const terminalsCount =
    terminalsCountRaw === undefined || terminalsCountRaw === null
      ? undefined
      : clampInt(Number(terminalsCountRaw), 0, 10000)

  const phoneNorm = normalizeSoftPhone(body.phone)
  const couponSubmitted = typeof body.coupon_code === 'string' ? body.coupon_code : ''
  const couponSubmittedNorm = normalizeCouponCode(couponSubmitted)

  const contactName = typeof body.contact_name === 'string' ? body.contact_name.trim() : ''
  const companyName = typeof body.company_name === 'string' ? body.company_name.trim() : ''
  const tipoEstablecimiento = typeof (body as any).tipo_establecimiento === 'string'
    ? String((body as any).tipo_establecimiento).trim()
    : ''

  try {
    const supabase = createAdminClient()

    // Load active config + tiers (private)
    const { data: configRow, error: configErr } = await (supabase as any)
      .from('config_ventas')
      .select('id, currency, coupon_code, coupon_discount_pct')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (configErr) {
      logger.warn('Error leyendo config_ventas, usando fallback', { error: configErr.message })
    }

    const configId: string | null = configRow?.id || null
    const currency: CurrencyCode =
      (configRow?.currency as CurrencyCode) || FALLBACK_CURRENCY
    const couponCode = normalizeCouponCode(configRow?.coupon_code || FALLBACK_COUPON_CODE)
    const discountPct = Number(configRow?.coupon_discount_pct ?? FALLBACK_COUPON_DISCOUNT_PCT)

    let tiers: VentasPricingTier[] = FALLBACK_TIERS
    let pricingTierId: string | null = null

    if (configId) {
      const { data: tiersRows, error: tiersErr } = await (supabase as any)
        .from('config_ventas_pricing_tiers')
        .select('id, min_employees, max_employees, price, is_active, sort_order')
        .eq('config_id', configId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (tiersErr) {
        logger.warn('Error leyendo config_ventas_pricing_tiers, usando fallback', { error: tiersErr.message })
      } else if (Array.isArray(tiersRows) && tiersRows.length > 0) {
        tiers = tiersRows
      }
    }

    const tier = resolveTierByEmployees(tiers, employeesCount)
    if (!tier) {
      return res.status(400).json({ error: 'No hay un rango de precios válido para el número de empleados indicado.' })
    }
    pricingTierId = (tier as any).id || null

    const subtotal = roundMoney(Number(tier.price))
    const isCouponValid = !!couponSubmittedNorm && couponSubmittedNorm === couponCode
    const discountPctApplied = isCouponValid ? discountPct : 0
    const discountAmount = roundMoney(subtotal * discountPctApplied)
    const total = roundMoney(subtotal - discountAmount)

    const quote = {
      currency,
      subtotal,
      discount_amount: discountAmount,
      total,
      coupon_applied: isCouponValid,
      discount_pct_applied: discountPctApplied,
      tier: { min_employees: tier.min_employees, max_employees: tier.max_employees }
    }

    // Persist lead
    const meta = {
      source: 'ventas',
      user_agent: String(req.headers['user-agent'] || '').slice(0, 120),
      referer: String(req.headers['referer'] || '').slice(0, 200),
      tipo_establecimiento: tipoEstablecimiento || undefined,
    }

    const { data: inserted, error: insertErr } = await (supabase as any)
      .from('cotizaciones')
      .insert({
        contact_email: contactEmail,
        contact_name: contactName || null,
        company_name: companyName || null,
        phone: phoneNorm || null,
        employees_count: employeesCount,
        terminals_count: typeof terminalsCount === 'number' ? terminalsCount : null,
        coupon_code_submitted: couponSubmittedNorm || null,
        coupon_applied: isCouponValid,
        discount_pct_applied: discountPctApplied,
        currency,
        subtotal,
        discount_amount: discountAmount,
        total,
        pricing_tier_id: pricingTierId,
        pricing_tier_snapshot: {
          min_employees: tier.min_employees,
          max_employees: tier.max_employees,
          price: Number(tier.price),
        },
        status: 'created',
        meta,
      })
      .select('id')
      .single()

    if (insertErr) {
      logger.error('Error insertando cotización', {
        email: maskEmail(contactEmail),
        error: insertErr.message,
      })
      return res.status(500).json({ error: 'No se pudo guardar la cotización. Intenta de nuevo.' })
    }

    const quoteId = inserted?.id as string

    // Generate PDF
    const pdf = await generateVentasQuotationPDF({
      quote,
      contactEmail,
      contactName,
      companyName,
      phone: phoneNorm || undefined,
      employeesCount,
      terminalsCount,
      couponCodeSubmitted: couponSubmittedNorm || undefined,
    })

    const html = generateVentasQuotationEmailHTML({
      quote,
      contactName,
      companyName,
    })
    const subject = generateVentasQuotationEmailSubject(companyName)
    const filename = `cotizacion-sisu-${quote.tier.min_employees}-${quote.tier.max_employees}.pdf`

    const systemCompanyId = 'system-public-tool'
    const notificationConfig = await notificationManager.getConfigForCompany(systemCompanyId)
    const apiKey = notificationConfig?.emailProvider.apiKey || process.env.RESEND_API_KEY
    const fromEmail = notificationConfig?.emailProvider.fromEmail || process.env.RESEND_FROM || 'noreply@humanosisu.net'

    if (!apiKey) {
      logger.error('RESEND_API_KEY no configurado (ventas)', { quoteId })
      await (supabase as any).from('cotizaciones').update({ status: 'failed_email' }).eq('id', quoteId)
      return res.status(500).json({ error: 'Error de configuración del servicio de email' })
    }

    const internal = process.env.VENTAS_NOTIFICATION_EMAIL
    const toList = internal ? [contactEmail, internal] : [contactEmail]

    const result = await sendEmailWithResend({
      to: toList,
      subject,
      html,
      pdfBuffer: pdf,
      filename,
      apiKey,
      fromEmail,
    })

    if ((result as any)?.error) {
      logger.error('Error enviando email (ventas)', {
        quoteId,
        email: maskEmail(contactEmail),
        error: (result as any).error?.message,
      })
      await (supabase as any).from('cotizaciones').update({ status: 'failed_email' }).eq('id', quoteId)
      return res.status(500).json({ error: 'Error al enviar la cotización por email' })
    }

    await (supabase as any)
      .from('cotizaciones')
      .update({ status: 'sent', email_message_id: (result as any)?.id || null })
      .eq('id', quoteId)

    const duration = Date.now() - startTime
    logger.info('Cotización enviada', {
      quoteId,
      email: maskEmail(contactEmail),
      duration,
    })

    return res.status(200).json({
      success: true,
      message: 'Cotización enviada a su correo',
      quote_id: quoteId,
      quote,
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Error en /api/quote', {
      error: error?.message,
      stack: error?.stack,
      duration,
      email: maskEmail(contactEmail),
    })
    return res.status(500).json({ error: 'Error interno del servidor al procesar la cotización' })
  }
}

export default withRateLimit(RATE_LIMITS.PUBLIC_EMAIL, handler)

