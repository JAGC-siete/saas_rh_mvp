import type { NextApiRequest, NextApiResponse } from 'next'
import { withRateLimit } from '../../lib/deduction-validator/rate-limit-wrapper'
import { RATE_LIMITS } from '../../lib/rate-limit'
import { validateEmail } from '../../lib/deduction-validator/validation'
import { createAdminClient } from '../../lib/supabase/server'
import { logger } from '../../lib/logger'
import { maskEmail, normalizeSoftPhone } from '../../lib/privacy'
import { notificationManager } from '../../lib/notification-providers'
import { getResendFromContact } from '../../lib/resend-from'
import type { QuotationRequest, QuotationResponse, VentasPricingTier, CurrencyCode } from '../../lib/ventas/types'
import { clampInt, resolveTierByEmployees, roundMoney } from '../../lib/ventas/pricing'
import { hardwareFeeMonthly, ventasTooManyTerminalsErrorMessage } from '../../lib/ventas/modality-includes'
import {
  isMonthlyModalityAvailable,
  shouldChargeHardwareContinuity,
  ventasMonthlyUnavailableMessage,
} from '../../lib/ventas/business-rules'
import { loadActiveVentasConfig, resolveSubmittedPromo } from '../../lib/ventas/load-ventas-config'
import { generateVentasQuotationPDF } from '../../lib/ventas/pdf'
import { generateVentasQuotationEmailHTML, generateVentasQuotationEmailSubject, generateVentasQuotationEmailText } from '../../lib/ventas/email-template'
import { generateVentasActivationEmailHTML, generateVentasActivationEmailSubject } from '../../lib/ventas/activation-email'
import {
  generateVentasBankDetailsEmailHTML,
  generateVentasBankDetailsEmailSubject,
  getVentasBankDetailsFromEnv,
} from '../../lib/ventas/bank-details-email'
import { randomUUID } from 'crypto'
import {
  currencyForCountryCode,
  ianaTimezoneForCountryCode,
  isCountryCode,
  type CountryCode,
} from '../../lib/country/supported'
import {
  parseMetaTrackingPayload,
  sendMetaWebsiteConversionFireAndForget,
} from '../../lib/analytics/metaCapiServer'
import { enrollMarketingLead } from '../../lib/marketing/enroll-lead'
import { sendLeadRegistroNotification } from '../../lib/leads/registro-notification'
import { buildModalityComparisonSnapshot } from '../../lib/ventas/modality-comparison'
import { computeFrozenQuoteAmounts } from '../../lib/billing/quote-amounts'
import { getHondurasTimestamp } from '../../lib/timezone'
import { addDays } from 'date-fns'

const FALLBACK_CURRENCY: CurrencyCode = 'HNL'
const FALLBACK_TIERS: VentasPricingTier[] = [
  { min_employees: 1, max_employees: 30, price: 65000, is_active: true, sort_order: 10 },
  { min_employees: 31, max_employees: 50, price: 74000, is_active: true, sort_order: 20 },
  { min_employees: 51, max_employees: 100, price: 85000, is_active: true, sort_order: 30 },
  { min_employees: 101, max_employees: 200, price: 97450, is_active: true, sort_order: 40 },
]

function normalizeBillingModality(v: unknown): 'annual' | 'monthly' {
  const raw = typeof v === 'string' ? v.trim().toLowerCase() : ''
  return raw === 'monthly' || raw === 'mensual' ? 'monthly' : 'annual'
}

async function sendEmailWithResend(params: {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: { filename: string; contentBase64: string }[]
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
    ...(params.text ? { text: params.text } : {}),
    attachments: [
      { filename: params.filename, content: params.pdfBuffer.toString('base64') },
      ...(params.attachments || []).map((a) => ({ filename: a.filename, content: a.contentBase64 })),
    ],
  })
}

async function sendEmailHtmlOnly(params: {
  to: string | string[]
  subject: string
  html: string
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
  })
}

function operationCountryLabel(cc: CountryCode): string {
  if (cc === 'SLV') return 'El Salvador'
  if (cc === 'GTM') return 'Guatemala'
  return 'Honduras'
}

async function createTrialEnvironmentFromQuote(supabase: any, params: {
  contactEmail: string
  contactName: string
  companyName: string
  employeesCount: number
  quoteMeta: Record<string, any>
  countryCode: CountryCode
}) {
  const countryCode = params.countryCode
  const companyId = randomUUID()
  const subdomain = `ventas-${Date.now().toString(36)}`
  const tz = ianaTimezoneForCountryCode(countryCode)
  const currency = currencyForCountryCode(countryCode)
  const trialActivatedAt = getHondurasTimestamp()
  const trialEnd = addDays(new Date(trialActivatedAt), 30).toISOString()

  const { error: companyError } = await supabase
    .from('companies')
    .insert([{
      id: companyId,
      name: params.companyName || 'Empresa',
      subdomain,
      plan_type: 'trial',
      country_code: countryCode,
      timezone: tz,
      settings: {
        trial_employee_limit: params.employeesCount,
        trial_activated_at: trialActivatedAt,
        currency,
        language: 'es',
        ventas_quote: params.quoteMeta,
      },
      is_active: true,
    }])

  if (companyError) {
    throw new Error(`Error creando company: ${companyError.message}`)
  }

  const tempPassword = `SISU${Date.now().toString().slice(-6)}`
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: params.contactEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      company_id: companyId,
      role: 'company_admin',
      full_name: params.contactName || undefined,
      source: 'ventas_quote',
    },
  })

  if (authError || !authUser?.user) {
    throw new Error(`Error creando usuario: ${authError?.message || 'unknown'}`)
  }

  const companyAdminPermissions = {
    can_view_all: true,
    can_manage_all: true,
    manage_payroll: true,
    manage_reports: true,
    manage_settings: true,
    manage_employees: true,
    can_manage_employees: true,
  }

  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: authUser.user.id,
      company_id: companyId,
      role: 'company_admin',
      permissions: companyAdminPermissions,
      is_active: true,
    }, { onConflict: 'id' })

  if (profileError) {
    throw new Error(`Error creando perfil: ${profileError.message}`)
  }

  const { error: subError } = await supabase
    .from('company_subscriptions')
    .upsert({
      company_id: companyId,
      status: 'trial',
      plan: 'basic',
      trial_start: trialActivatedAt,
      trial_end: trialEnd,
    }, {
      onConflict: 'company_id',
      ignoreDuplicates: false,
    })

  if (subError) {
    throw new Error(`Error creando suscripción trial: ${subError.message}`)
  }

  return { companyId, userId: authUser.user.id, tempPassword }
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

  const billingModality = normalizeBillingModality((body as any).billing_modality)
  if (billingModality === 'monthly' && !isMonthlyModalityAvailable(employeesCount)) {
    return res.status(400).json({ error: ventasMonthlyUnavailableMessage() })
  }
  const terminalsCountRaw = (body as any).terminals_count
  const terminalsCount = clampInt(Number(terminalsCountRaw ?? 0), 0, 10000)

  const phoneNorm = normalizeSoftPhone(body.phone)
  const couponSubmitted = typeof body.coupon_code === 'string' ? body.coupon_code : ''

  const contactName = typeof body.contact_name === 'string' ? body.contact_name.trim() : ''
  const companyName = typeof body.company_name === 'string' ? body.company_name.trim() : ''
  const sectorRubro = typeof (body as any).sector_rubro === 'string'
    ? String((body as any).sector_rubro).trim()
    : ''

  const countryCodeRaw =
    typeof (body as any).country_code === 'string' ? String((body as any).country_code).trim().toUpperCase() : ''
  if (!isCountryCode(countryCodeRaw)) {
    return res.status(400).json({
      error: 'Seleccione el país donde opera la empresa (Honduras, El Salvador o Guatemala).',
    })
  }
  const countryCode: CountryCode = countryCodeRaw
  const countryLabel = operationCountryLabel(countryCode)

  try {
    const supabase = createAdminClient()

    let ventasConfig
    try {
      ventasConfig = await loadActiveVentasConfig(supabase as any)
    } catch (configLoadErr: any) {
      logger.warn('Error leyendo config ventas, usando fallback', { error: configLoadErr?.message })
      ventasConfig = {
        configId: null,
        currency: FALLBACK_CURRENCY,
        tiers: FALLBACK_TIERS,
        promoCodes: [],
      }
    }

    const { configId, currency, tiers, promoCodes } = ventasConfig
    const promo = resolveSubmittedPromo({
      promoCodes,
      submittedRaw: couponSubmitted,
    })
    const couponSubmittedNorm = promo.submittedNorm
    const isCouponValid = promo.isCouponValid
    const discountPctApplied = promo.discountPctApplied
    const couponCodeApplied = promo.couponCodeApplied

    let pricingTierId: string | null = null

    const tier = resolveTierByEmployees(tiers, employeesCount)
    if (!tier) {
      return res.status(400).json({ error: 'No hay un rango de precios válido para el número de empleados indicado.' })
    }
    pricingTierId = (tier as any).id || null

    const annualSubtotal = roundMoney(Number(tier.price))
    const annualDiscountAmount = roundMoney(annualSubtotal * discountPctApplied)
    const annualTotal = roundMoney(annualSubtotal - annualDiscountAmount)

    const monthlySoftwareTotal = roundMoney(annualTotal / 12)
    const terminalsForPricing = terminalsCount >= 1 ? terminalsCount : 1
    const hwQuote = hardwareFeeMonthly(terminalsForPricing)
    if (hwQuote.special) {
      return res.status(400).json({ error: ventasTooManyTerminalsErrorMessage() })
    }
    const monthlyHardwareFee = shouldChargeHardwareContinuity(billingModality, employeesCount)
      ? hwQuote.fee
      : 0
    const monthlyTotal = roundMoney(monthlySoftwareTotal + monthlyHardwareFee)

    const quote = {
      currency,
      annual_subtotal: annualSubtotal,
      annual_discount_amount: annualDiscountAmount,
      annual_total: annualTotal,
      monthly_software_total: monthlySoftwareTotal,
      monthly_hardware_fee: monthlyHardwareFee,
      monthly_total: monthlyTotal,
      coupon_applied: isCouponValid,
      discount_pct_applied: discountPctApplied,
      coupon_code_applied: couponCodeApplied,
      tier: { min_employees: tier.min_employees, max_employees: tier.max_employees },
      billing_modality: billingModality,
      terminals_count: terminalsForPricing,
      employees_count: employeesCount,
    }

    // Persist lead
    const meta = {
      source: 'ventas',
      user_agent: String(req.headers['user-agent'] || '').slice(0, 120),
      referer: String(req.headers['referer'] || '').slice(0, 200),
      country_code: countryCode,
      sector_rubro: sectorRubro || undefined,
      billing_modality: billingModality,
      terminals_count: terminalsForPricing,
      monthly_hardware_fee: monthlyHardwareFee || undefined,
      monthly_total: monthlyTotal || undefined,
      comparison_snapshot: buildModalityComparisonSnapshot(quote),
    }

    const { data: inserted, error: insertErr } = await (supabase as any)
      .from('cotizaciones')
      .insert({
        contact_email: contactEmail,
        contact_name: contactName || null,
        company_name: companyName || null,
        phone: phoneNorm || null,
        employees_count: employeesCount,
        terminals_count: terminalsForPricing || null,
        coupon_code_submitted: couponSubmittedNorm || null,
        coupon_applied: isCouponValid,
        discount_pct_applied: discountPctApplied,
        currency,
        subtotal: annualSubtotal,
        discount_amount: annualDiscountAmount,
        total: annualTotal,
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

    void enrollMarketingLead({
      email: contactEmail,
      source: 'ventas',
      fullName: contactName || undefined,
      phone: phoneNorm || undefined,
    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.warn('Marketing enroll failed after ventas quote (non-blocking)', {
        email: maskEmail(contactEmail),
        error: message,
      })
    })

    const sentAt = new Date()

    const bankDetails = getVentasBankDetailsFromEnv()

    // Generate PDF
    const pdf = await generateVentasQuotationPDF({
      quote,
      contactEmail,
      contactName,
      companyName,
      phone: phoneNorm || undefined,
      employeesCount,
      terminalsCount: terminalsForPricing,
      couponCodeSubmitted: couponSubmittedNorm || undefined,
      countryLabel,
      sentAt,
      bankDetails,
    })

    const html = generateVentasQuotationEmailHTML({
      quote,
      contactName,
      companyName,
      countryLabel,
      sentAt,
      bankDetails,
    })
    const text = generateVentasQuotationEmailText({
      quote,
      contactName,
      companyName,
      countryLabel,
      sentAt,
      bankDetails,
    })
    const subject = generateVentasQuotationEmailSubject({
      contactName,
      companyName,
    })
    const filename = `cotizacion-sisu-${quote.tier.min_employees}-${quote.tier.max_employees}.pdf`

    const systemCompanyId = 'system-public-tool'
    const notificationConfig = await notificationManager.getConfigForCompany(systemCompanyId)
    const apiKey = notificationConfig?.emailProvider.apiKey || process.env.RESEND_API_KEY
    const fromEmail = getResendFromContact()

    if (!apiKey) {
      logger.error('RESEND_API_KEY no configurado (ventas)', { quoteId })
      await (supabase as any).from('cotizaciones').update({ status: 'failed_email' }).eq('id', quoteId)
      return res.status(500).json({ error: 'Error de configuración del servicio de email' })
    }

    const result = await sendEmailWithResend({
      to: contactEmail,
      subject,
      html,
      text,
      attachments: [],
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
      .update({
        status: 'sent',
        email_message_id: (result as any)?.id || null,
        meta,
      })
      .eq('id', quoteId)

    void sendLeadRegistroNotification({
      source: 'ventas',
      nombre: contactName || 'Contacto no especificado',
      empresa: companyName || null,
      email: contactEmail,
      whatsapp: phoneNorm || null,
      country_code: countryCode,
      empleados: employeesCount,
      quote_id: quoteId,
      billing_modality: billingModality,
      monthly_total: quote.monthly_total,
      currency: quote.currency,
    })

    // Activar entorno automáticamente (no romper cotización si falla).
    try {
      const quoteMetaForCompany = {
        quote_id: quoteId,
        billing_modality: billingModality,
        terminals_count: terminalsForPricing,
        employees_count: employeesCount,
        country_code: countryCode,
        sector_rubro: sectorRubro || undefined,
        coupon_code_submitted: couponSubmittedNorm || undefined,
        coupon_applied: isCouponValid,
      }

      const env = await createTrialEnvironmentFromQuote(supabase as any, {
        contactEmail,
        contactName,
        companyName: companyName || `Empresa ${quoteId.slice(0, 6)}`,
        employeesCount,
        quoteMeta: quoteMetaForCompany,
        countryCode,
      })

      const frozenAmounts = computeFrozenQuoteAmounts({
        billingModality,
        monthlySoftwareTotal: quote.monthly_software_total,
        monthlyHardwareFee: quote.monthly_hardware_fee,
        annualTotal: quote.annual_total,
      })

      await (supabase as any)
        .from('cotizaciones')
        .update({
          company_id: env.companyId,
          expected_total_hnl: frozenAmounts.expectedTotalHnl,
          expected_deposit_hnl: frozenAmounts.expectedDepositHnl,
          payment_status: 'pending',
        })
        .eq('id', quoteId)

      const loginUrl = `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net').replace(/\/$/, '')}/app/login`
      const activationHtml = generateVentasActivationEmailHTML({
        contactName,
        companyName,
        email: contactEmail,
        password: env.tempPassword,
        loginUrl,
        bankDetails,
      })
      const activationSubject = generateVentasActivationEmailSubject(contactName)

      await sendEmailHtmlOnly({
        to: contactEmail,
        subject: activationSubject,
        html: activationHtml,
        apiKey,
        fromEmail,
      })

      const bank = getVentasBankDetailsFromEnv()
      if (bank && !bankDetails) {
        const bankHtml = generateVentasBankDetailsEmailHTML({ contactName, companyName, bank })
        const bankSubject = generateVentasBankDetailsEmailSubject(companyName)
        await sendEmailHtmlOnly({
          to: contactEmail,
          subject: bankSubject,
          html: bankHtml,
          apiKey,
          fromEmail,
        })
      }
    } catch (e: any) {
      logger.warn('Activación automática falló (ventas)', {
        quoteId,
        email: maskEmail(contactEmail),
        error: e?.message,
      })
    }

    const duration = Date.now() - startTime
    logger.info('Cotización enviada', {
      quoteId,
      email: maskEmail(contactEmail),
      duration,
    })

    const metaTracking = parseMetaTrackingPayload(body)
    const leadValue =
      quote.billing_modality === 'monthly' ? quote.monthly_total : quote.annual_total
    sendMetaWebsiteConversionFireAndForget({
      req,
      eventName: 'SubmitApplication',
      tracking: metaTracking,
      userData: {
        email: contactEmail,
        phone: phoneNorm || undefined,
        firstName: contactName || undefined,
      },
      customData: {
        content_name: 'ventas',
        content_category: countryCode,
        value: leadValue,
        currency: quote.currency,
        status: billingModality,
      },
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

