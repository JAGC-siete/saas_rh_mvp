import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  BanknotesIcon,
  BuildingOffice2Icon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import PublicPageShell from './PublicPageShell'
import PublicPageHead from '../SEO/PublicPageHead'
import SchemaMarkup from '../SEO/SchemaMarkup'
import RelatedGuides from '../SEO/RelatedGuides'
import BorderBeam from './BorderBeam'
import ScrollReveal from './ScrollReveal'
import TrackedInternalCta from '../TrackedInternalCta'
import { generateFAQPageSchema, generateWebPageSchema, generateBreadcrumbListSchema } from '../../lib/seo/schema'
import { PLAN_BASICO_COPY, PLAN_BASICO_PUBLIC_PATH } from '../../lib/marketing/plan-basico-copy'
import { PRIVACY_PUBLIC_PATH, TERMS_PUBLIC_PATH } from '../../lib/marketing/legal-paths'
import { mergeVentasBusinessRules, type VentasBusinessRules } from '../../lib/ventas/business-rules'
import {
  FALLBACK_LADDER_PLANS,
  findLadderPlan,
  ladderOnboardingFee,
  ladderPlanPrices,
  parseLadderPlans,
  ventasLadderCustomQuoteMessage,
  type LadderPlanPrice,
} from '../../lib/ventas/ladder'
import { formatMoney } from '../../lib/ventas/pricing'
import { VENTAS_COUNTRY_LABEL } from '../../lib/ventas-game/ventas-form'
import { currencyForCountryCode, isPublicCountryCode, type PublicCountryCode } from '../../lib/country/supported'
import type { QuotationRequest, QuotationResponse } from '../../lib/ventas/types'
import {
  buildMetaApiTrackingFields,
  createMetaEventId,
  trackQuotationSubmit,
} from '../../lib/analytics/metaPixel'
import { maskEmailForHint, writeThankYouContext } from '../../lib/analytics/thank-you-context'
import { trackCTAClick, trackWhatsAppClick } from '../../lib/analytics/googleAds'
import {
  buildQuotationAcquisitionWhatsAppText,
  buildVentasSupportWhatsAppUrl,
  getVentasSupportWhatsAppNumber,
} from '../../lib/ventas/bank-details'
import { SEO_BASE_URL } from '../../lib/seo/assets'

const copy = PLAN_BASICO_COPY
const MODULE_ICONS = [UserGroupIcon, ClipboardDocumentListIcon, BanknotesIcon] as const

function formatSalesWhatsApp(digits: string): string {
  if (digits.startsWith('504') && digits.length === 11) {
    return `+504 ${digits.slice(3, 7)} ${digits.slice(7)}`
  }
  return `+${digits}`
}

function scrollToSolicitud() {
  trackCTAClick('plan_basico_solicitud', 'plan_basico_hero')
  document.getElementById('solicitud')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function PlanBasicoLanding() {
  const salesPhone = getVentasSupportWhatsAppNumber()
  const salesWaDisplay = formatSalesWhatsApp(salesPhone)
  const [countryCode, setCountryCode] = useState<PublicCountryCode>('HND')
  const [plans, setPlans] = useState<LadderPlanPrice[]>(FALLBACK_LADDER_PLANS)
  const [rules, setRules] = useState<VentasBusinessRules>(() => mergeVentasBusinessRules(null))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/ventas/public-config', { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok || cancelled) return
        setRules(mergeVentasBusinessRules(data.business_rules || data))
        // Null prices mean the config fell back; the in-code list has the same values.
        if (Array.isArray(data.plans) && data.plans.every((p: { monthly_price_hnl?: unknown }) => p.monthly_price_hnl != null)) {
          setPlans(parseLadderPlans(data.plans))
        }
      } catch {
        /* keep defaults */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const plan = findLadderPlan(plans, 'basic')
  const displayCurrency = currencyForCountryCode(countryCode)
  const prices = ladderPlanPrices(plan, displayCurrency)
  const monthlyLabel = formatMoney(displayCurrency, prices.monthly)
  const annualLabel = formatMoney(displayCurrency, prices.annual)
  const feeLabel = formatMoney(displayCurrency, ladderOnboardingFee(displayCurrency, rules))
  const [costFaq, feeFaq, ...otherFaq] = copy.faq
  const faq = [
    { question: costFaq.question, answer: costFaq.answer(monthlyLabel, annualLabel) },
    { question: feeFaq.question, answer: feeFaq.answer(feeLabel) },
    ...otherFaq,
  ]
  const whatsappHref = buildVentasSupportWhatsAppUrl(
    `Quiero el plan Esencial de Humano SISU (${monthlyLabel} al mes).`
  )

  const webPageSchema = generateWebPageSchema({
    url: PLAN_BASICO_PUBLIC_PATH,
    title: copy.seo.title,
    description: copy.seo.description,
  })
  const faqSchema = generateFAQPageSchema(faq.map((item) => ({ question: item.question, answer: item.answer })))
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Inicio', url: '/' },
    { name: 'Plan Esencial', url: PLAN_BASICO_PUBLIC_PATH },
  ])
  const offerSchema = {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    name: 'Plan Esencial Humano SISU',
    description: copy.seo.description,
    url: `${SEO_BASE_URL}${PLAN_BASICO_PUBLIC_PATH}`,
    price: String(plan.monthly_price_hnl),
    priceCurrency: 'HNL',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: String(plan.monthly_price_hnl),
      priceCurrency: 'HNL',
      unitCode: 'MON',
      valueAddedTaxIncluded: true,
    },
    availability: 'https://schema.org/InStock',
    seller: { '@type': 'Organization', name: 'Humano SISU' },
    itemOffered: {
      '@type': 'SoftwareApplication',
      name: 'Humano SISU plan Esencial',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
    },
  }

  return (
    <PublicPageShell showSpotlight showTrustBar loginAlwaysVisible mainClassName="flex flex-col">
      <PublicPageHead
        title={copy.seo.title}
        description={copy.seo.description}
        canonicalPath={PLAN_BASICO_PUBLIC_PATH}
        keywords={copy.seo.keywords}
      />
      <SchemaMarkup schema={[webPageSchema, breadcrumbSchema, faqSchema, offerSchema]} />

      <section className="relative overflow-hidden px-4 sm:px-6 pt-6 sm:pt-10 pb-10 sm:pb-16">
        <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-10 h-56 w-56 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-12">
          <div>
            <div className="mb-5">
              <span className="inline-flex max-w-full items-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium leading-snug text-cyan-200">
                {copy.hero.kicker}
              </span>
            </div>
            <h1 className="landing-hero-gradient text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              {copy.hero.headline}
            </h1>
            <p className="landing-muted mt-5 max-w-2xl text-base font-medium sm:text-lg">
              {copy.hero.subheadline(monthlyLabel)}
            </p>
            <figure className="mt-5 flex max-w-2xl items-start gap-3">
              <img
                src={copy.testimonial.image}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded-full object-cover object-top"
              />
              <figcaption>
                <blockquote className="text-sm italic leading-relaxed text-slate-300">
                  “{copy.testimonial.quote}”
                </blockquote>
                <p className="mt-1.5 text-xs text-slate-500">
                  {copy.testimonial.name} · {copy.testimonial.role}, {copy.testimonial.company}
                </p>
              </figcaption>
            </figure>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={scrollToSolicitud}
                className="btn-shiny inline-flex min-h-[48px] items-center justify-center rounded-xl bg-green-600 px-6 py-3 text-base font-semibold text-white shadow-[0_0_24px_rgba(34,197,94,0.28)] transition-colors hover:bg-green-700"
              >
                {copy.hero.ctaPrimary}
              </button>
              <TrackedInternalCta
                href={`/activar?utm_source=membresia-anual&utm_medium=hero&utm_campaign=plan-esencial`}
                ctaType="activar_trial"
                location="plan_basico_hero"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/25 px-6 py-3 text-center text-base font-medium text-white transition-colors hover:bg-white/10"
              >
                {copy.hero.ctaSecondary}
              </TrackedInternalCta>
            </div>
          </div>

          <BorderBeam>
            <div className="glass-modern relative overflow-hidden rounded-2xl p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{copy.hero.priceLabel}</p>
              <p className="mt-2">
                <span className="text-4xl font-bold tabular-nums text-white sm:text-5xl">{monthlyLabel}</span>
                <span className="ml-1 text-sm font-medium text-slate-300">{copy.hero.perMonth}</span>
              </p>
              <p className="mt-1 text-sm text-cyan-300">{copy.hero.annualNote(annualLabel)}</p>
              <ul className="mt-6 space-y-3">
                {copy.hero.modules.map((label, index) => {
                  const Icon = MODULE_ICONS[index] ?? UserGroupIcon
                  return (
                    <li
                      key={label}
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 px-3 py-2.5"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10">
                        <Icon className="h-4 w-4 text-cyan-300" aria-hidden />
                      </span>
                      <span className="text-sm font-medium text-white">{label}</span>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-4 text-xs text-slate-400">{copy.hero.priceFoot}</p>
            </div>
          </BorderBeam>
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-12 sm:pb-16">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <h2 className="mb-6 text-center text-2xl font-bold text-white sm:text-3xl">{copy.honesty.title}</h2>
          </ScrollReveal>
          <div className="grid gap-4 md:grid-cols-3">
            {copy.honesty.items.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 0.06}>
                <div className="glass-modern h-full rounded-2xl p-5 sm:p-6">
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-12 sm:pb-16">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">{copy.modules.title}</h2>
              <p className="landing-muted mx-auto mt-2 max-w-2xl text-sm sm:text-base">{copy.modules.subtitle}</p>
            </div>
          </ScrollReveal>
          <div className="grid gap-4 md:grid-cols-3">
            {copy.modules.items.map((item, i) => {
              const Icon = MODULE_ICONS[i] ?? UserGroupIcon
              return (
                <ScrollReveal key={item.title} delay={i * 0.08}>
                  <div className="glass-modern h-full rounded-2xl p-5 sm:p-6">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-brand-400/25 bg-brand-500/15">
                      <Icon className="h-5 w-5 text-brand-300" aria-hidden />
                    </div>
                    <h3 className="text-lg font-bold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-300">{item.body}</p>
                    <p className="mt-3 text-xs text-slate-500">{item.limit}</p>
                  </div>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-12 sm:pb-16">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2">
          <div className="glass-modern rounded-2xl border border-green-500/20 p-5 sm:p-6">
            <h2 className="text-xl font-bold text-green-300">{copy.included.title}</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              {copy.included.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-modern rounded-2xl border border-white/10 p-5 sm:p-6">
            <h2 className="text-xl font-bold text-slate-100">{copy.excluded.title}</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {copy.excluded.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="solicitud" className="scroll-mt-28 px-4 sm:px-6 pb-12 sm:pb-16">
        <div className="mx-auto grid max-w-7xl items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">{copy.form.title}</h2>
            <p className="landing-muted mt-3 text-sm sm:text-base">{copy.form.subtitle}</p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick('plan_basico_landing')}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-slate-200 transition-colors hover:bg-white/10"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4 text-cyan-300" aria-hidden />
              {copy.form.whatsapp} · {salesWaDisplay}
            </a>
            <p className="mt-2 text-xs text-slate-500">{copy.form.whatsappHint}</p>
            <p className="mt-6 text-sm text-slate-400">
              <TrackedInternalCta
                href="/ventas?plan=pro&utm_source=membresia-anual&utm_medium=body&utm_campaign=plan-esencial"
                ctaType="solicitar_cotizacion"
                location="plan_basico_form_aside"
                className="text-brand-300 underline-offset-2 hover:underline"
              >
                {copy.form.morePlans}
              </TrackedInternalCta>
            </p>
          </div>
          <PlanBasicoQuoteForm
            countryCode={countryCode}
            onCountryCodeChange={setCountryCode}
            monthlyLabel={monthlyLabel}
            annualLabel={annualLabel}
            feeLabel={feeLabel}
            maxEmployees={rules.max_auto_quote_employees}
          />
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-12 sm:pb-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-center text-2xl font-bold text-white sm:text-3xl">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {faq.map((item) => (
              <details key={item.question} className="glass-modern group rounded-2xl px-5 py-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-white marker:content-none">
                  {item.question}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-8">
        <div className="mx-auto max-w-7xl">
          <RelatedGuides currentPath={PLAN_BASICO_PUBLIC_PATH} />
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="glass-modern mx-auto max-w-3xl rounded-3xl px-6 py-10 text-center sm:px-10">
          <BuildingOffice2Icon className="mx-auto mb-4 h-8 w-8 text-cyan-300" aria-hidden />
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{copy.close.headline}</h2>
          <p className="landing-muted mx-auto mt-3 max-w-lg">{copy.close.sub}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={scrollToSolicitud}
              className="btn-shiny inline-flex min-h-[48px] items-center justify-center rounded-xl bg-green-600 px-6 py-3 text-base font-semibold text-white hover:bg-green-700"
            >
              {copy.close.primary}
            </button>
            <TrackedInternalCta
              href="/#precios"
              ctaType="solicitar_cotizacion"
              location="plan_basico_final"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/25 px-6 py-3 text-base font-medium text-white hover:bg-white/10"
            >
              {copy.close.secondary}
            </TrackedInternalCta>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}

type FormErrors = {
  contact_name?: string
  company_name?: string
  contact_email?: string
  phone?: string
  employees_count?: string
  consent?: string
  submit?: string
}

function PlanBasicoQuoteForm({
  countryCode,
  onCountryCodeChange,
  monthlyLabel,
  annualLabel,
  feeLabel,
  maxEmployees,
}: {
  countryCode: PublicCountryCode
  onCountryCodeChange: (code: PublicCountryCode) => void
  monthlyLabel: string
  annualLabel: string
  feeLabel: string
  maxEmployees: number
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [form, setForm] = useState({
    contact_name: '',
    company_name: '',
    contact_email: '',
    phone: '',
    employees: '',
    billing_modality: 'monthly' as 'monthly' | 'annual',
  })

  const fieldClass =
    'input-glass w-full text-white placeholder:text-white/50 disabled:cursor-not-allowed disabled:opacity-50'

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const next: FormErrors = {}
    if (form.contact_name.trim().length < 2) next.contact_name = copy.form.errorName
    if (form.company_name.trim().length < 2) next.company_name = copy.form.errorCompany
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email.trim())) {
      next.contact_email = copy.form.errorEmail
    }
    if (form.phone.trim().length < 8) next.phone = copy.form.errorPhone
    const employeesCount = Number(form.employees)
    if (!Number.isInteger(employeesCount) || employeesCount < 1) {
      next.employees_count = copy.form.errorEmployees
    } else if (employeesCount > maxEmployees) {
      next.employees_count = ventasLadderCustomQuoteMessage({ max_auto_quote_employees: maxEmployees })
    }
    if (!consent) next.consent = copy.form.errorConsent
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    setIsLoading(true)
    setErrors({})
    const metaEventId = createMetaEventId('plan_basico')
    const payload: QuotationRequest = {
      contact_email: form.contact_email.trim(),
      contact_name: form.contact_name.trim(),
      company_name: form.company_name.trim(),
      phone: form.phone.trim(),
      country_code: countryCode,
      plan_key: 'basic',
      employees_count: employeesCount,
      billing_modality: form.billing_modality,
      // The annual plan includes one clock; monthly buys clocks separately.
      terminals_count: form.billing_modality === 'annual' ? 1 : 0,
      consent_newsletter: true,
    }

    try {
      const resp = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          source: 'membresia-anual',
          ...buildMetaApiTrackingFields(metaEventId),
        }),
      })
      const data = (await resp.json()) as QuotationResponse | { error?: string }
      if (!resp.ok) {
        setErrors({ submit: (data as { error?: string }).error || copy.form.errorSubmit })
        return
      }

      const responseQuote = (data as QuotationResponse).quote || null
      trackQuotationSubmit({
        eventId: metaEventId,
        email: payload.contact_email,
        phone: payload.phone,
        firstName: payload.contact_name,
        employeesCount: payload.employees_count,
        countryCode: payload.country_code,
        billingModality: payload.billing_modality,
        quoteValue:
          payload.billing_modality === 'monthly' ? responseQuote?.monthly_total : responseQuote?.annual_total,
        currency: responseQuote?.currency,
      })

      const waMsg = buildQuotationAcquisitionWhatsAppText({
        contactName: payload.contact_name,
        companyName: payload.company_name,
        includeBankPrompt: true,
      })
      writeThankYouContext('ventas', {
        displayName: payload.contact_name,
        empresa: payload.company_name,
        empleados: payload.employees_count,
        countryCode: payload.country_code,
        emailHintMasked: maskEmailForHint(payload.contact_email),
        whatsappUrl: buildVentasSupportWhatsAppUrl(waMsg),
      })
      await router.push('/ventas/gracias')
    } catch {
      setErrors({ submit: copy.form.errorSubmit })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <BorderBeam>
      <form onSubmit={onSubmit} className="glass-modern space-y-4 rounded-2xl p-5 sm:p-7" noValidate>
        <div>
          <label htmlFor="pb-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
            {copy.form.owner}
          </label>
          <input
            id="pb-name"
            className={fieldClass}
            autoComplete="name"
            value={form.contact_name}
            onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
          />
          {errors.contact_name ? <p className="mt-1 text-xs text-red-300">{errors.contact_name}</p> : null}
        </div>
        <div>
          <label htmlFor="pb-company" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
            {copy.form.company}
          </label>
          <input
            id="pb-company"
            className={fieldClass}
            autoComplete="organization"
            value={form.company_name}
            onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
          />
          {errors.company_name ? <p className="mt-1 text-xs text-red-300">{errors.company_name}</p> : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pb-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              {copy.form.email}
            </label>
            <input
              id="pb-email"
              type="email"
              className={fieldClass}
              autoComplete="email"
              value={form.contact_email}
              onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
            />
            {errors.contact_email ? <p className="mt-1 text-xs text-red-300">{errors.contact_email}</p> : null}
          </div>
          <div>
            <label htmlFor="pb-phone" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              {copy.form.phone}
            </label>
            <input
              id="pb-phone"
              type="tel"
              className={fieldClass}
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            {errors.phone ? <p className="mt-1 text-xs text-red-300">{errors.phone}</p> : null}
          </div>
        </div>
        <div>
          <label htmlFor="pb-country" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
            {copy.form.country}
          </label>
          <select
            id="pb-country"
            className={fieldClass}
            value={countryCode}
            onChange={(e) => {
              const value = e.target.value
              if (isPublicCountryCode(value)) onCountryCodeChange(value)
            }}
          >
            {Object.entries(VENTAS_COUNTRY_LABEL).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pb-employees" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              {copy.form.employees}
            </label>
            <input
              id="pb-employees"
              type="number"
              inputMode="numeric"
              min={1}
              className={fieldClass}
              value={form.employees}
              onChange={(e) => setForm((f) => ({ ...f, employees: e.target.value }))}
            />
            {errors.employees_count ? <p className="mt-1 text-xs text-red-300">{errors.employees_count}</p> : null}
          </div>
          <div>
            <label htmlFor="pb-modality" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              {copy.form.modality}
            </label>
            <select
              id="pb-modality"
              className={fieldClass}
              value={form.billing_modality}
              onChange={(e) =>
                setForm((f) => ({ ...f, billing_modality: e.target.value === 'annual' ? 'annual' : 'monthly' }))
              }
            >
              <option value="monthly">{copy.form.monthlyOption(monthlyLabel, feeLabel)}</option>
              <option value="annual">{copy.form.annualOption(annualLabel)}</option>
            </select>
          </div>
        </div>
        <label className="flex items-start gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            {copy.form.termsPrefix}{' '}
            <Link href={TERMS_PUBLIC_PATH} className="text-brand-300 underline-offset-2 hover:underline">
              {copy.form.terms}
            </Link>{' '}
            {copy.form.privacyJoin}{' '}
            <Link href={PRIVACY_PUBLIC_PATH} className="text-brand-300 underline-offset-2 hover:underline">
              {copy.form.privacy}
            </Link>
            {copy.form.consentSuffix}
          </span>
        </label>
        {errors.consent ? <p className="text-xs text-red-300">{errors.consent}</p> : null}
        {errors.submit ? <p className="text-sm text-red-300">{errors.submit}</p> : null}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-shiny inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-green-600 px-6 py-3 text-base font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {isLoading ? copy.form.submitting : copy.form.submit}
        </button>
        <p className="text-center text-xs text-slate-500">{copy.form.legalMicro}</p>
      </form>
    </BorderBeam>
  )
}
