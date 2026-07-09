import { useEffect, useState, useCallback, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import PublicPageShell from '../landing/PublicPageShell'
import TrackedWhatsAppLink from '../TrackedWhatsAppLink'
import { appendUtmParams, buildDemoWhatsAppUrl } from '../../lib/public-calculator/utm'
import SchemaMarkup from '../SEO/SchemaMarkup'
import { validateFormInputs } from '../../lib/deduction-validator/client-validation'
import type { PublicCalculatorConfig, PublicCalculatorDeductionKey } from '../../lib/public-calculator/config'
import { generateFAQPageSchema, generateWebPageSchema, generateBreadcrumbListSchema } from '../../lib/seo/schema'
import LandingBridgeShare from './LandingBridgeShare'
import { buildPeaceWizardUrl } from '../../lib/public-calculator/utm'
import CalculatorShareTrigger from './CalculatorShareTrigger'
import { CALCULATOR_OG_IMAGE_URL } from '../../lib/public-calculator/config'
import type { CalculatorAudience } from './AudienceSelector'
import RoleSelector, { type CalculatorRole } from './RoleSelector'
import CalculatingState from './CalculatingState'
import DeductionResultHero from './DeductionResultHero'
import BenefitLeadCapture from './BenefitLeadCapture'
import LeadCaptureSoftGate, { useLeadSoftGateTriggers } from './LeadCaptureSoftGate'
import { CalcPdfSentMessage, CalcTrustLine, CalcCheckIcon, CalcIconTextRow } from './CalculatorUiIcons'
import CalculatorSubscriptionBridge from './CalculatorSubscriptionBridge'
import {
  trackCalcActivarClick,
  trackCalcComplete,
  trackCalcLeadSubmit,
  type CalculatorTool,
} from '../../lib/analytics/calculator-events'

interface DeductionResult {
  grossSalary: number
  monthlyGrossSalary: number
  ihss: number
  ihssPercentage: number
  rap: number
  rapPercentage: number
  afp: number
  afpPercentage: number
  infop: number
  infopPercentage: number
  isr: number
  isrPercentage: number
  totalDeductions: number
  netSalary: number
  year: number
  paymentModality: 'quincenal' | 'mensual'
  countryCode: string
  constants: {
    minimumWage: number
    ihssCeiling: number
  }
}

function roleFromAudience(audience: CalculatorAudience | null): CalculatorRole | null {
  if (audience === 'jefe') return 'empresa'
  if (audience === 'empleado') return 'empleado'
  return null
}

function leadAudience(audience: CalculatorAudience | null): 'empleado' | 'empresa' | undefined {
  if (audience === 'jefe') return 'empresa'
  if (audience === 'empleado') return 'empleado'
  return undefined
}

function Tooltip({ title, content, children }: { title: string; content: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const tooltipId = `tooltip-${title.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="relative inline-block">
      <button
        type="button"
        id={tooltipId}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center text-cyan-400 hover:text-cyan-300 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
        aria-label={`Información sobre ${title}`}
        aria-describedby={`${tooltipId}-content`}
        aria-expanded={isOpen}
      >
        {children}
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {isOpen && (
        <div
          id={`${tooltipId}-content`}
          role="tooltip"
          className="absolute z-50 w-64 p-3 mt-2 text-sm text-white glass rounded-xl shadow-xl border border-white/20 backdrop-blur-sm left-0 md:left-auto md:right-0"
          aria-live="polite"
        >
          <div className="font-semibold mb-1 text-cyan-300">{title}</div>
          <div className="text-brand-200/90">{content}</div>
        </div>
      )}
    </div>
  )
}

export default function PublicDeductionCalculator({ config }: { config: PublicCalculatorConfig }) {
  const [salary, setSalary] = useState('')
  const [paymentModality, setPaymentModality] = useState<'quincenal' | 'mensual'>('mensual')
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [consentNewsletter, setConsentNewsletter] = useState(false)
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [selectedDeductions, setSelectedDeductions] = useState(config.defaultDeductions)
  const currentYear = new Date().getFullYear()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [result, setResult] = useState<DeductionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [emailSent, setEmailSent] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [pendingResult, setPendingResult] = useState<DeductionResult | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const b2b = config.b2bFunnel
  const croEnabled = Boolean(b2b)
  const audienceStorageKey = `${config.contactStorageKey}_audience`
  const [audience, setAudience] = useState<CalculatorAudience | null>(null)

  const calcTool: CalculatorTool = `deducciones_${config.countryCode.toLowerCase()}` as CalculatorTool

  const { showSoftGate, dismissSoftGate } = useLeadSoftGateTriggers(
    croEnabled && Boolean(result) && !emailSent,
    5000
  )

  const finalizeResult = useCallback(
    (data: DeductionResult) => {
      setResult(data)
      setVerifying(false)
      setPendingResult(null)
      trackCalcComplete({
        tool: calcTool,
        value: data.netSalary,
        modo: data.paymentModality,
        audience: leadAudience(audience),
      })
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    },
    [calcTool, audience]
  )

  useEffect(() => {
    if (!b2b) return
    try {
      const stored = sessionStorage.getItem(audienceStorageKey)
      if (stored === 'empleado' || stored === 'jefe') setAudience(stored)
    } catch {
      // ignore
    }
  }, [audienceStorageKey, b2b])

  const handleAudienceSelect = (role: CalculatorRole) => {
    const mapped: CalculatorAudience = role === 'empresa' ? 'jefe' : 'empleado'
    setAudience(mapped)
    try {
      sessionStorage.setItem(audienceStorageKey, mapped)
    } catch {
      // ignore
    }
  }

  const heroCopy = b2b
    ? b2b.hero
    : { headlineLead: config.hero.headlineLead, headlineAccent: config.hero.headlineAccent, subheadline: config.hero.subheadline, authorityLine: '' }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(config.contactStorageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        consentNewsletter?: boolean
        fullName?: string
        company?: string
        phone?: string
      }
      if (parsed?.consentNewsletter === true) {
        if (typeof parsed.fullName === 'string') setFullName(parsed.fullName)
        if (typeof parsed.company === 'string') setCompany(parsed.company)
        if (typeof parsed.phone === 'string') setPhone(parsed.phone)
        setConsentNewsletter(true)
      }
    } catch {
      // ignore
    }
  }, [config.contactStorageKey])

  useEffect(() => {
    try {
      if (!consentNewsletter) {
        localStorage.removeItem(config.contactStorageKey)
        return
      }
      localStorage.setItem(
        config.contactStorageKey,
        JSON.stringify({ consentNewsletter: true, fullName, company, phone })
      )
    } catch {
      // ignore
    }
  }, [config.contactStorageKey, consentNewsletter, fullName, company, phone])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const canSendPdf = consentNewsletter && fullName.trim().length > 0 && emailRegex.test(email)
  const selectorOptions = config.deductionOptions.filter((item) => item.showInSelector)

  const activarUrl = (
    campaign: 'post-calc' | 'footer' | 'bridge' | 'sticky' | 'sticky-constancia' | 'godfather-email' | 'godfather-pdf'
  ) => appendUtmParams(config.conversion.inlineHref, config.countryCode, campaign)
  const demoUrl = (label: string) => buildDemoWhatsAppUrl(config.countryCode, label)

  const ConversionButtons = ({
    campaign,
    size = 'md',
    activarLabel,
  }: {
    campaign: 'post-calc' | 'footer' | 'sticky' | 'sticky-constancia'
    size?: 'md' | 'sm'
    activarLabel?: string
  }) => {
    const pad = size === 'sm' ? 'py-2.5 px-5 text-sm' : 'py-3 px-8'
    const label = activarLabel ?? config.conversion.inlineButton
    return (
      <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
        <Link
          href={activarUrl(campaign)}
          onClick={() => trackCalcActivarClick(calcTool, campaign)}
          className={`inline-block ${pad} bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-all text-center`}
        >
          {label}
        </Link>
        <TrackedWhatsAppLink
          href={demoUrl(campaign)}
          target="_blank"
          rel="noopener noreferrer"
          trackingContext={`calc_deducciones_demo_${config.countryCode}_${campaign}`}
          className={`inline-block ${pad} bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all text-center`}
        >
          {config.conversion.demoButton}
        </TrackedWhatsAppLink>
      </div>
    )
  }

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setEmailSent(false)
    setValidationErrors({})

    if (croEnabled && !audience) {
      setError('Selecciona si calculas tu propio sueldo o el de tu equipo.')
      return
    }

    const validation = validateFormInputs({ salary, paymentModality, email })
    if (!validation.valid) {
      const errorsMap: Record<string, string> = {}
      validation.errors.forEach((err) => {
        errorsMap[err.field] = err.message
      })
      setValidationErrors(errorsMap)
      if (validation.errors.length > 0) setError(validation.errors[0].message)
      return
    }

    const salaryNum = parseFloat(salary.replace(/[^\d.]/g, ''))
    setLoading(true)

    try {
      const response = await fetch('/api/public/calculate-deductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salary: salaryNum,
          paymentModality,
          year: currentYear,
          country_code: config.countryCode,
          deductions: selectedDeductions
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error al calcular deducciones')
      if (croEnabled) {
        setPendingResult(data)
        setVerifying(true)
      } else {
        setResult(data)
        trackCalcComplete({
          tool: calcTool,
          value: data.netSalary,
          modo: data.paymentModality,
        })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al calcular deducciones. Por favor intenta de nuevo.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!email || !result) return
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un email válido')
      return
    }
    if (!consentNewsletter) {
      setError('Debes aceptar la suscripción para recibir el cálculo en PDF.')
      return
    }
    if (!fullName.trim()) {
      setError('Ingresa tu nombre para enviarte el PDF.')
      return
    }

    setSendingEmail(true)
    setError(null)
    try {
      const response = await fetch('/api/public/send-deduction-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName,
          company,
          phone,
          consentNewsletter,
          country_code: config.countryCode,
          audience: leadAudience(audience),
          ...result,
          salary: parseFloat(salary.replace(/[^\d.]/g, ''))
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error al enviar el reporte por email')
      setEmailSent(true)
      dismissSoftGate()
      trackCalcLeadSubmit({
        tool: calcTool,
        audience: leadAudience(audience),
        hasPhone: Boolean(phone.trim()),
        hasCompany: Boolean(company.trim()),
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al enviar el reporte por email. Por favor intenta de nuevo.'
      setError(message)
    } finally {
      setSendingEmail(false)
    }
  }

  const webPageSchema = generateWebPageSchema({
    url: config.path,
    title: config.seo.title,
    description: config.seo.description,
    inLanguage: config.seo.inLanguage
  })
  const faqSchema = generateFAQPageSchema(config.faqs)
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Inicio', url: '/' },
    { name: 'Calculadoras', url: '/calculadora' },
    { name: config.breadcrumbLabel, url: config.path }
  ])

  const renderResultRow = (
    key: PublicCalculatorDeductionKey,
    label: string,
    longLabel: string,
    tooltip: string,
    amount: number,
    percentage: number
  ) => {
    if (!selectedDeductions[key]) return null
    const option = config.deductionOptions.find((o) => o.key === key)
    if (option && !option.showInResults) return null
    return (
      <div key={key} className="glass rounded-xl p-4 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{label}</span>
            <Tooltip title={label} content={tooltip}>
              <span className="text-brand-300">{longLabel}</span>
            </Tooltip>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-white">{formatCurrency(amount)}</div>
            <div className="text-sm text-brand-300">{percentage.toFixed(2)}%</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PublicPageShell mainClassName={result ? 'pb-28 sm:pb-24' : ''}>
      <Head>
        <title>{config.seo.title}</title>
        <meta name="description" content={config.seo.description} />
        <meta name="keywords" content={config.seo.keywords} />
        <meta property="og:title" content={config.seo.title} />
        <meta property="og:description" content={config.seo.description} />
        <meta property="og:url" content={config.canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={CALCULATOR_OG_IMAGE_URL} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={config.seo.title} />
        <meta name="twitter:description" content={config.seo.description} />
        <meta name="twitter:image" content={CALCULATOR_OG_IMAGE_URL} />
        <link rel="canonical" href={config.canonicalUrl} />
      </Head>
      <SchemaMarkup schema={[webPageSchema, faqSchema, breadcrumbSchema]} />

      {croEnabled && result && (
        <div className="sticky top-0 z-30 bg-slate-900/95 border-b border-green-500/30 backdrop-blur-md py-2 px-4 sm:hidden">
          <p className="text-center text-sm text-brand-200">
            Neto: <span className="font-bold text-green-400">{formatCurrency(result.netSalary)}</span>
          </p>
        </div>
      )}

      <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10 ${result ? 'pb-28 sm:pb-24' : ''}`}>
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-6 animate-fade-up-subtle">
            {config.hero.badges.map((badge) => (
              <span
                key={badge}
                className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30"
              >
                {badge}
              </span>
            ))}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            <span className="text-white block sm:inline">{heroCopy.headlineLead}</span>
            <span className="text-brand-300 block sm:inline mt-2 sm:mt-1">{heroCopy.headlineAccent}</span>
          </h1>
          <p className="text-lg sm:text-xl text-brand-200/90 max-w-2xl mx-auto">{heroCopy.subheadline}</p>
          {b2b?.hero.authorityLine && (
            <p className="text-sm text-brand-300/80 mt-3 max-w-xl mx-auto">{b2b.hero.authorityLine}</p>
          )}
        </div>

        {croEnabled && b2b && (
          <RoleSelector
            audience={roleFromAudience(audience)}
            onSelect={handleAudienceSelect}
            employeeTitle={b2b.audience.employeeTitle}
            employeeBody={b2b.audience.employeeBody}
            companyTitle={b2b.audience.bossTitle}
            companyBody={b2b.audience.bossBody}
            tool={calcTool}
          />
        )}

        {(!croEnabled || audience) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-modern rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 opacity-50 blur-xl pointer-events-none" />
            <form onSubmit={handleCalculate} className="space-y-6 relative z-10">
              <div>
                <label htmlFor="salary" className="block text-sm font-medium text-white mb-2">
                  Salario {paymentModality === 'quincenal' ? 'Quincenal' : 'Mensual'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-brand-300 sm:text-sm">{config.currencyPrefix}</span>
                  </div>
                  <input
                    type="text"
                    id="salary"
                    value={salary}
                    onChange={(e) => {
                      setSalary(e.target.value)
                      if (validationErrors.salary) {
                        setValidationErrors((prev) => {
                          const next = { ...prev }
                          delete next.salary
                          return next
                        })
                      }
                    }}
                    placeholder="0.00"
                    className={`block w-full pl-16 pr-3 py-3.5 border rounded-xl bg-white/5 backdrop-blur-sm text-white placeholder-brand-200/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all hover:border-cyan-400/30 hover:bg-white/10 ${
                      validationErrors.salary ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                    }`}
                    required
                  />
                </div>
                {validationErrors.salary ? (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.salary}</p>
                ) : (
                  <p className="mt-1 text-sm text-brand-300/70">
                    Ingresa tu salario {paymentModality === 'quincenal' ? 'quincenal' : 'mensual'} antes de deducciones
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-3">Modalidad de Pago</label>
                <div className="grid grid-cols-2 gap-4">
                  {(['quincenal', 'mensual'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentModality(mode)}
                      className={`py-3.5 px-4 rounded-xl border-2 transition-all font-medium ${
                        paymentModality === mode
                          ? 'border-brand-500/70 bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-black/20'
                          : 'border-white/20 bg-white/5 backdrop-blur-sm text-brand-200 hover:border-cyan-400/50 hover:bg-white/10'
                      }`}
                    >
                      {mode === 'quincenal' ? 'Quincenal' : 'Mensual'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-3">Deducciones a incluir</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectorOptions.map((item) => {
                    const active = selectedDeductions[item.key]
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setSelectedDeductions((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                        className={`text-left rounded-xl border-2 px-4 py-3.5 transition-all backdrop-blur-sm ${
                          active
                            ? 'border-brand-500/70 bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-black/20'
                            : 'border-white/20 bg-white/5 text-brand-200 hover:border-cyan-400/50 hover:bg-white/10'
                        }`}
                        aria-pressed={active}
                      >
                        <div className="font-semibold">{item.title}</div>
                        <div className="text-xs mt-0.5 text-brand-300/80">{item.subtitle}</div>
                        <div className="text-xs mt-2 text-brand-200/70">{item.hint}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {!croEnabled && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                  Email (opcional)
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className={`block w-full px-3 py-3.5 border rounded-xl bg-white/5 backdrop-blur-sm text-white placeholder-brand-200/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all hover:border-cyan-400/30 hover:bg-white/10 ${
                    validationErrors.email ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                  }`}
                />
              </div>
              )}

              {!croEnabled && (
              <div className="glass rounded-xl border border-white/10 backdrop-blur-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsContactOpen((v) => !v)}
                  className="w-full px-4 py-4 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
                  aria-expanded={isContactOpen}
                >
                  <div className="text-left">
                    <div className="text-white font-semibold">Recibe el cálculo en PDF (opcional)</div>
                    <div className="text-xs text-brand-200/70 mt-1">Respetamos tu privacidad. No guardamos datos salariales.</div>
                  </div>
                </button>
                {isContactOpen && (
                  <div className="px-4 pb-4 space-y-4">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Tu nombre"
                      className="block w-full px-3 py-3 border rounded-xl bg-white/5 text-white border-white/20"
                    />
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Nombre de tu empresa"
                      className="block w-full px-3 py-3 border rounded-xl bg-white/5 text-white border-white/20"
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={config.phonePlaceholder}
                      className="block w-full px-3 py-3 border rounded-xl bg-white/5 text-white border-white/20"
                    />
                    <label className="flex items-start gap-3 text-sm text-brand-100">
                      <input
                        type="checkbox"
                        checked={consentNewsletter}
                        onChange={(e) => setConsentNewsletter(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-white/30 bg-slate-900"
                      />
                      Acepto suscribirme al newsletter para recibir mi cálculo en PDF.
                    </label>
                  </div>
                )}
              </div>
              )}

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-200 backdrop-blur-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading || verifying}
                className="w-full py-3.5 px-6 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? 'Calculando...' : 'Calcular Deducciones'}
              </button>
            </form>
          </div>

          <div ref={resultRef} className="glass-modern rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden scroll-mt-28">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-cyan-500/20 to-blue-500/20 opacity-50 blur-xl pointer-events-none" />
            <div className="relative z-10">
              {croEnabled && verifying && pendingResult && b2b ? (
                <CalculatingState steps={b2b.verificationSteps} onComplete={() => finalizeResult(pendingResult)} />
              ) : !result ? (
                <div className="text-sm text-brand-200/80">
                  Completa el formulario para ver el desglose. Si eres empresa,{' '}
                  <Link href={activarUrl('post-calc')} onClick={() => trackCalcActivarClick(calcTool, 'post-calc')} className="text-brand-300 hover:text-white underline">
                    activa Humano SISU
                  </Link>{' '}
                  y automatiza tu planilla.
                </div>
              ) : (
                <>
                  {croEnabled && b2b ? (
                    <DeductionResultHero
                      netSalaryFormatted={formatCurrency(result.netSalary)}
                      grossSalaryFormatted={formatCurrency(result.grossSalary)}
                      paymentModality={result.paymentModality}
                      year={result.year}
                    />
                  ) : (
                    <>
                      <div className="mb-6">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Resultados del Cálculo</h2>
                        <p className="text-brand-300/80 text-sm">
                          Año: {result.year} | Modalidad: {result.paymentModality === 'quincenal' ? 'Quincenal' : 'Mensual'}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                          <div className="text-sm text-brand-300/80 mb-2 font-medium">Salario Bruto</div>
                          <div className="text-3xl font-bold text-white">{formatCurrency(result.grossSalary)}</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-5 border border-green-500/30">
                          <div className="text-sm text-green-300 mb-2 font-medium">Salario Neto</div>
                          <div className="text-3xl font-bold text-green-400">{formatCurrency(result.netSalary)}</div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-3 mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Desglose de Deducciones</h3>
                    {renderResultRow(
                      'ihss',
                      config.resultLabels.socialPrimary,
                      config.resultLabels.socialPrimaryLong,
                      config.resultLabels.socialPrimaryTooltip,
                      result.ihss,
                      result.ihssPercentage
                    )}
                    {config.resultLabels.socialSecondary &&
                      renderResultRow(
                        'rap',
                        config.resultLabels.socialSecondary,
                        config.resultLabels.socialSecondaryLong || '',
                        config.resultLabels.socialSecondaryTooltip || '',
                        result.rap,
                        result.rapPercentage
                      )}
                    {config.resultLabels.afp &&
                      renderResultRow(
                        'afp',
                        config.resultLabels.afp,
                        config.resultLabels.afpLong || '',
                        config.resultLabels.afpTooltip || '',
                        result.afp,
                        result.afpPercentage
                      )}
                    {config.resultLabels.infop &&
                      renderResultRow(
                        'infop',
                        config.resultLabels.infop,
                        config.resultLabels.infopLong || '',
                        config.resultLabels.infopTooltip || '',
                        result.infop,
                        result.infopPercentage
                      )}
                    {renderResultRow(
                      'isr',
                      'ISR',
                      config.resultLabels.isrLong,
                      config.resultLabels.isrTooltip,
                      result.isr,
                      result.isrPercentage
                    )}
                    <div className="glass rounded-xl p-4 border border-red-500/30 bg-gradient-to-br from-red-500/10 to-orange-500/5">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-semibold">Total de Deducciones</span>
                        <div className="text-xl font-bold text-red-400">{formatCurrency(result.totalDeductions)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="glass rounded-xl p-4 border border-blue-500/30 backdrop-blur-sm bg-gradient-to-r from-blue-500/10 to-cyan-500/5 mb-6">
                    <CalcTrustLine className="text-sm text-blue-300 text-center font-medium">
                      {config.trust.line}
                    </CalcTrustLine>
                    <p className="text-xs text-blue-400/70 text-center mt-1">
                      {config.trust.minimumWageLabel}: {formatCurrency(result.constants.minimumWage)} |{' '}
                      {config.trust.ceilingLabel}: {formatCurrency(result.constants.ihssCeiling)}
                    </p>
                  </div>

                  <div className="mb-6 text-center">
                    <p className="text-sm text-brand-200/90 mb-3">{config.socialShare.postCalcScript}</p>
                    <CalculatorShareTrigger
                      config={config}
                      calcTool={calcTool}
                      placement="post-calc"
                      fullWidth
                    />
                  </div>

                  {croEnabled && b2b ? (
                    <div className="space-y-6">
                      <BenefitLeadCapture
                        headline={b2b.leadCapture.headline}
                        subheadline={b2b.leadCapture.subheadline}
                        fullName={fullName}
                        email={email}
                        company={company}
                        phone={phone}
                        consentNewsletter={consentNewsletter}
                        onFullNameChange={setFullName}
                        onEmailChange={setEmail}
                        onCompanyChange={setCompany}
                        onPhoneChange={setPhone}
                        onConsentChange={setConsentNewsletter}
                        onSubmit={handleSendEmail}
                        sending={sendingEmail}
                        sent={emailSent}
                        showCompanyField={audience === 'jefe'}
                        idPrefix="deduction-lead"
                        containerId="deduction-lead-capture"
                      />
                      {emailSent && (
                        <div className="glass rounded-xl p-4 border border-green-500/50 text-green-200 text-center">
                          <CalcIconTextRow icon={<CalcCheckIcon className="text-green-400" solid />}>
                            Reporte enviado exitosamente a {email}
                          </CalcIconTextRow>
                        </div>
                      )}
                      {audience === 'jefe' ? (
                        <div className="glass-modern rounded-xl p-6 border border-cyan-500/30 text-center">
                          <h3 className="text-xl font-bold text-white mb-2">{config.conversion.inlineTitle}</h3>
                          {b2b.audience.bossBody ? (
                            <p className="text-brand-200/90 mb-4">{b2b.audience.bossBody}</p>
                          ) : null}
                          <ConversionButtons campaign="post-calc" />
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      {email && !emailSent && (
                        <button
                          onClick={handleSendEmail}
                          disabled={sendingEmail || !canSendPdf}
                          className="w-full py-3.5 px-6 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 mb-6"
                        >
                          {sendingEmail ? 'Enviando reporte por email...' : 'Enviar Reporte Detallado por Email'}
                        </button>
                      )}
                      {emailSent && (
                        <div className="glass rounded-xl p-4 border border-green-500/50 text-green-200 text-center mb-6">
                          <CalcIconTextRow icon={<CalcCheckIcon className="text-green-400" solid />}>
                            Reporte enviado exitosamente a {email}
                          </CalcIconTextRow>
                        </div>
                      )}
                      {!b2b && (
                        <div className="glass-modern rounded-xl p-6 border border-cyan-500/30 text-center mb-6">
                          <h3 className="text-xl font-bold text-white mb-2">{config.conversion.inlineTitle}</h3>
                          <p className="text-brand-200/90 mb-4">{config.conversion.inlineBody}</p>
                          <ConversionButtons campaign="post-calc" />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        )}

        {croEnabled && !audience && (
          <p className="text-center text-sm text-brand-300/70 mt-4">
            El cálculo es 100% gratis — selecciona tu perfil arriba para comenzar.
          </p>
        )}

        <div className="mt-8 glass-modern rounded-2xl shadow-2xl p-6 sm:p-10 lg:p-12 text-center">
          <h3 className="activar-serif text-white mb-6 leading-[0.95] tracking-tight">
            <span className="block text-4xl sm:text-5xl lg:text-6xl">{config.landingBridge.titleLead}</span>
            <span className="block italic text-5xl sm:text-6xl lg:text-7xl mt-1">{config.landingBridge.titleAccent}</span>
          </h3>
          <p className="text-brand-200/90 mb-6 max-w-2xl mx-auto">{config.landingBridge.body}</p>
          <LandingBridgeShare
            config={config}
            activarUrl={buildPeaceWizardUrl(config.countryCode, 'footer')}
            calcTool={calcTool}
            size="sm"
          />
          {config.relatedCalculators.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
              {config.relatedCalculators.map((item) => (
                <Link key={item.href} href={item.href} className="text-brand-300 hover:text-white underline">
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <CalculatorSubscriptionBridge
            tool={calcTool}
            placement="footer"
            shareConfig={config}
          />
        </div>

        {config.seoGuide && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-white mb-4">{config.seoGuide.title}</h2>
            <p className="text-brand-200/90 mb-4">{config.seoGuide.intro}</p>
            <div className="space-y-4">
              {config.seoGuide.sections.map((section) => (
                <div key={section.heading} className="glass-modern rounded-xl p-4">
                  <h3 className="font-semibold text-white mb-2">{section.heading}</h3>
                  <p className="text-sm text-brand-200/90">{section.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {result && b2b && croEnabled && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4 bg-slate-900/95 border-t border-white/10 backdrop-blur-md shadow-2xl">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            {emailSent ? (
              <CalcPdfSentMessage>PDF enviado — revisa tu correo</CalcPdfSentMessage>
            ) : (
              <p className="text-sm text-brand-100 text-center sm:text-left">
                <span className="font-semibold text-white">{formatCurrency(result.netSalary)}</span>
                {' · '}
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById('deduction-lead-capture')?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="text-cyan-300 hover:text-white underline"
                >
                  Recibir PDF gratis
                </button>
              </p>
            )}
            {audience === 'jefe' && <ConversionButtons campaign="sticky" size="sm" />}
          </div>
        </div>
      )}

      {result && !b2b && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4 bg-slate-900/95 border-t border-white/10 backdrop-blur-md shadow-2xl">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-brand-100 text-center sm:text-left">
              <span className="font-semibold text-white">¿Gestionas planilla?</span>{' '}
              Automatiza con el mismo motor que acabas de usar.
            </p>
            <ConversionButtons campaign="sticky" size="sm" />
          </div>
        </div>
      )}

      {croEnabled && b2b && (
        <LeadCaptureSoftGate
          open={showSoftGate}
          onClose={dismissSoftGate}
          title={b2b.leadCapture.softGateTitle}
          body={b2b.leadCapture.softGateBody}
        >
          <BenefitLeadCapture
            headline={b2b.leadCapture.headline}
            subheadline=""
            fullName={fullName}
            email={email}
            company={company}
            phone={phone}
            consentNewsletter={consentNewsletter}
            onFullNameChange={setFullName}
            onEmailChange={setEmail}
            onCompanyChange={setCompany}
            onPhoneChange={setPhone}
            onConsentChange={setConsentNewsletter}
            onSubmit={handleSendEmail}
            sending={sendingEmail}
            sent={emailSent}
            showCompanyField={audience === 'jefe'}
            idPrefix="modal-deduction-lead"
          />
        </LeadCaptureSoftGate>
      )}
    </PublicPageShell>
  )
}
