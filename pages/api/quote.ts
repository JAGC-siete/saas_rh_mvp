import type { NextApiRequest, NextApiResponse } from 'next'
import { withRateLimit } from '../../lib/deduction-validator/rate-limit-wrapper'
import { RATE_LIMITS } from '../../lib/rate-limit'
import { validateEmail } from '../../lib/deduction-validator/validation'
import { createAdminClient } from '../../lib/supabase/server'
import { logger } from '../../lib/logger'
import { maskEmail, normalizeSoftPhone } from '../../lib/privacy'
import { notificationManager } from '../../lib/notification-providers'
import { getResendFromContact } from '../../lib/resend-from'
import type { QuotationRequest, QuotationResponse, CurrencyCode } from '../../lib/ventas/types'
import { clampInt, resolveTierByEmployees } from '../../lib/ventas/pricing'
import {
  DEFAULT_VENTAS_BUSINESS_RULES,
  isMonthlyModalityAvailable,
  mergeVentasBusinessRules,
  resolveFormMaxTerminals,
  ventasBasicAnnualOnlyMessage,
  ventasMonthlyUnavailableMessage,
  ventasTooManyTerminalsErrorMessage,
} from '../../lib/ventas/business-rules'
import { loadEnterpriseAnnualPriceFromCatalog } from '../../lib/ventas/enterprise-price'
import { computeVentasQuotationQuote } from '../../lib/ventas/compute-quote'
import { resolveVentasProductSelection } from '../../lib/ventas/product-catalog'
import {
  FALLBACK_VENTAS_TIERS,
  loadActiveVentasConfig,
  resolveSubmittedPromo,
} from '../../lib/ventas/load-ventas-config'
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
import { localizeQuotationQuote } from '../../lib/ventas/currency'
import { computeFrozenQuoteAmounts } from '../../lib/billing/quote-amounts'
import { getHondurasTimestamp } from '../../lib/timezone'
import { addDays } from 'date-fns'

const FALLBACK_CURRENCY: CurrencyCode = 'HNL'

function normalizeBillingModality(v: unknown): 'annual' | 'monthly' {
  const raw = typeof v === 'string' ? v.trim().toLowerCase() : ''
  return raw === 'monthly' || raw === 'mensual' ? 'monthly' : 'annual'
}

function parseFlag(v: unknown): boolean {
  return v === true || v === 1 || v === '1' || (typeof v === 'string' && v.trim().toLowerCase() === 'true')
}

function parseQuoteSource(v: unknown): 'ventas' | 'membresia-anual' {
  return v === 'membresia-anual' ? 'membresia-anual' : 'ventas'
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

  const employeesCount = clampInt(Number(body.employees_count), 1, 10000)
  if (employeesCount < 1) {
    return res.status(400).json({ error: 'Seleccione un rango de empleados válido.' })
  }

  const billingModality = normalizeBillingModality((body as any).billing_modality)
  const terminalsCountRaw = (body as any).terminals_count
  const terminalsCount = clampInt(Number(terminalsCountRaw ?? 0), 0, 10000)
  const complementBiometric = parseFlag((body as any).complement_biometric)
  const includeTerminals = parseFlag((body as any).include_terminals) || complementBiometric
  const affiliateMembership = parseFlag((body as any).affiliate_membership)
  const includeEnterprise = parseFlag((body as any).include_enterprise)
  const quoteSource = parseQuoteSource((body as any).source)

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
        tiers: FALLBACK_VENTAS_TIERS,
        promoCodes: [],
        businessRules: DEFAULT_VENTAS_BUSINESS_RULES,
      }
    }

    const { currency: configCurrency, tiers, promoCodes, businessRules } = ventasConfig
    const listCurrency: CurrencyCode = configCurrency || FALLBACK_CURRENCY
    const displayCurrency = currencyForCountryCode(countryCode)
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

    const enterpriseAnnualPrice = await loadEnterpriseAnnualPriceFromCatalog(
      supabase as any,
      mergeVentasBusinessRules(businessRules).enterprise_annual_price
    )

    const product = resolveVentasProductSelection({
      employeesCount,
      complementBiometric,
      includeTerminals,
      affiliateMembership,
      includeEnterprise,
      rules: businessRules,
    })

    if (product.forceAnnual && billingModality === 'monthly') {
      return res.status(400).json({ error: ventasBasicAnnualOnlyMessage(businessRules) })
    }

    if (billingModality === 'monthly' && !isMonthlyModalityAvailable(employeesCount, businessRules)) {
      return res.status(400).json({ error: ventasMonthlyUnavailableMessage(businessRules) })
    }

    const formMaxTerminals = resolveFormMaxTerminals(businessRules)
    if (product.chargeHardware) {
      const terminalsForCheck = terminalsCount >= 1 ? terminalsCount : 1
      if (terminalsForCheck > formMaxTerminals) {
        return res.status(400).json({ error: ventasTooManyTerminalsErrorMessage(businessRules) })
      }
    }

    const { quote: quoteList } = computeVentasQuotationQuote({
      employeesCount,
      billingModality,
      terminalsCount,
      complementBiometric,
      includeTerminals,
      affiliateMembership,
      includeEnterprise,
      enterpriseAnnualPrice,
      listCurrency,
      tier,
      businessRules,
      coupon: {
        applied: isCouponValid,
        discountPct: discountPctApplied,
        code: couponCodeApplied,
      },
    })
    const terminalsForPricing = quoteList.terminals_count
    const resolvedModality = quoteList.billing_modality

    // Montos al cliente: dólares (SV), quetzales (GT), lempiras (HN).
    const quote = localizeQuotationQuote(quoteList, listCurrency, displayCurrency)

    // Persist lead
    const meta = {
      source: quoteSource,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 120),
      referer: String(req.headers['referer'] || '').slice(0, 200),
      country_code: countryCode,
      sector_rubro: sectorRubro || undefined,
      billing_modality: resolvedModality,
      terminals_count: terminalsForPricing,
      terminals_included_count: quoteList.terminals_included_count,
      terminals_extra_count: quoteList.terminals_extra_count,
      product_kind: quoteList.product_kind,
      complement_biometric: quoteList.complement_biometric,
      include_terminals: quoteList.include_terminals,
      include_enterprise: quoteList.include_enterprise,
      enterprise_applied: quoteList.enterprise_applied,
      enterprise_annual_price: quoteList.enterprise_annual_price,
      commercial_plan_type: quoteList.commercial_plan_type,
      membership_applied: quoteList.membership_applied,
      membership_discount_pct: quoteList.membership_discount_pct,
      membership_annual_price: quoteList.membership_annual_price,
      list_currency: listCurrency,
      monthly_hardware_fee: quote.monthly_hardware_fee || undefined,
      hardware_sale_total: quote.hardware_sale_total || undefined,
      hardware_sale_unit_price: quote.hardware_sale_unit_price,
      hardware_sale_discount_pct: quoteList.hardware_sale_discount_pct,
      monthly_total: quote.monthly_total || undefined,
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
        currency: quote.currency,
        subtotal: quote.annual_subtotal,
        discount_amount: quote.annual_discount_amount,
        total: quote.annual_total,
        pricing_tier_id: pricingTierId,
        pricing_tier_snapshot: {
          min_employees: tier.min_employees,
          max_employees: tier.max_employees,
          price: Number(tier.price),
          quoted_software_price: quoteList.annual_subtotal,
          product_kind: quoteList.product_kind,
          list_currency: listCurrency,
          annual_terminal_mode: quoteList.tier.annual_terminal_mode,
          included_terminals_max: quoteList.tier.included_terminals_max,
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
      billing_modality: resolvedModality,
      monthly_total: quote.monthly_total,
      currency: quote.currency,
    })

    // Activar entorno automáticamente (no romper cotización si falla).
    try {
      const quoteMetaForCompany = {
        quote_id: quoteId,
        billing_modality: resolvedModality,
        terminals_count: terminalsForPricing,
        employees_count: employeesCount,
        country_code: countryCode,
        sector_rubro: sectorRubro || undefined,
        coupon_code_submitted: couponSubmittedNorm || undefined,
        coupon_applied: isCouponValid,
        product_kind: quoteList.product_kind,
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
        billingModality: resolvedModality,
        monthlySoftwareTotal: quoteList.monthly_software_total,
        monthlyHardwareFee: quoteList.monthly_hardware_fee,
        annualTotal: quoteList.annual_total,
        hardwareSaleTotal: quoteList.hardware_sale_total,
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
        status: resolvedModality,
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

