import { useCallback, useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import PublicPageShell from '../landing/PublicPageShell'
import SchemaMarkup from '../SEO/SchemaMarkup'
import TrackedWhatsAppLink from '../TrackedWhatsAppLink'
import type { PublicBenefitCalculatorConfig } from '../../lib/public-calculator/benefit-config'
import {
  appendBenefitUtmParams,
  buildBenefitDemoWhatsAppUrl,
} from '../../lib/public-calculator/utm'
import {
  trackCalcActivarClick,
  trackCalcComplete,
  trackCalcLeadSubmit,
  type CalculatorAudience,
} from '../../lib/analytics/calculator-events'
import {
  buildMetaApiTrackingFields,
  createMetaEventId,
} from '../../lib/analytics/metaPixel'
import {
  generateBreadcrumbListSchema,
  generateFAQPageSchema,
  generateWebPageSchema,
} from '../../lib/seo/schema'
import type { BenefitCalculationResult } from '../../lib/payroll/thirteenth-fourteenth/calculate'
import RoleSelector from './RoleSelector'
import CalculatingState from './CalculatingState'
import BenefitResultHero from './BenefitResultHero'
import BenefitLeadCapture from './BenefitLeadCapture'
import BenefitTrojanShare from './BenefitTrojanShare'
import LeadCaptureSoftGate, { useLeadSoftGateTriggers } from './LeadCaptureSoftGate'
import { CalcPdfSentMessage, CalcTrustLine } from './CalculatorUiIcons'
import CalculatorSubscriptionBridge from './CalculatorSubscriptionBridge'
import { PUBLIC_CALCULATOR_CONFIGS } from '../../lib/public-calculator/config'

function benefitToolKey(tipo: PublicBenefitCalculatorConfig['tipo']): 'aguinaldo_hnd' | 'catorceavo_hnd' {
  return tipo === '13AVO' ? 'aguinaldo_hnd' : 'catorceavo_hnd'
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatHNL(value: number): string {
  return `L. ${value.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PublicBenefitCalculator({ config }: { config: PublicBenefitCalculatorConfig }) {
  const [audience, setAudience] = useState<CalculatorAudience | null>(null)
  const [salarioBase, setSalarioBase] = useState('')
  const [salarioPromedio, setSalarioPromedio] = useState('')
  const [fechaIngreso, setFechaIngreso] = useState('')
  const [fechaCalculo, setFechaCalculo] = useState(todayISO())
  const [modoCalculo, setModoCalculo] = useState<'proporcional' | 'anual'>('proporcional')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [consentNewsletter, setConsentNewsletter] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [pendingResult, setPendingResult] = useState<BenefitCalculationResult | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [result, setResult] = useState<BenefitCalculationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)

  const tool = benefitToolKey(config.tipo)
  const audienceStorageKey = `${config.contactStorageKey}_audience`
  const activarUrl = (campaign: 'post-calc' | 'footer' | 'sticky') =>
    appendBenefitUtmParams(config.conversion.inlineHref, config.tipo, campaign)
  const demoUrl = (campaign: string) =>
    buildBenefitDemoWhatsAppUrl(config.tipo, `calc_${tool}_${campaign}`)

  const { showSoftGate, dismissSoftGate } = useLeadSoftGateTriggers(
    Boolean(result) && !emailSent,
    5000
  )

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(audienceStorageKey)
      if (stored === 'empleado' || stored === 'empresa') setAudience(stored)
    } catch {
      /* ignore */
    }
  }, [audienceStorageKey])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(config.contactStorageKey)
      if (!raw) return
      const saved = JSON.parse(raw) as Record<string, string>
      if (saved.fullName) setFullName(saved.fullName)
      if (saved.email) setEmail(saved.email)
      if (saved.company) setCompany(saved.company)
      if (saved.phone) setPhone(saved.phone)
    } catch {
      /* ignore */
    }
  }, [config.contactStorageKey])

  const handleAudienceSelect = (role: CalculatorAudience) => {
    setAudience(role)
    try {
      sessionStorage.setItem(audienceStorageKey, role)
    } catch {
      /* ignore */
    }
  }

  const persistContact = useCallback(() => {
    try {
      localStorage.setItem(
        config.contactStorageKey,
        JSON.stringify({ fullName, email, company, phone })
      )
    } catch {
      /* ignore */
    }
  }, [config.contactStorageKey, fullName, email, company, phone])

  const finalizeResult = useCallback(
    (data: BenefitCalculationResult) => {
      setResult(data)
      setVerifying(false)
      setPendingResult(null)
      trackCalcComplete({
        tool,
        value: data.monto,
        modo: data.modoCalculo,
        audience,
      })
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    },
    [tool, audience]
  )

  const webPageSchema = generateWebPageSchema({
    url: config.path,
    title: config.seo.title,
    description: config.seo.description,
    inLanguage: config.seo.inLanguage,
  })
  const faqSchema = generateFAQPageSchema(config.faqs)
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Inicio', url: '/' },
    { name: 'Calculadoras', url: '/calculadora' },
    { name: config.breadcrumbLabel, url: config.path },
  ])

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setEmailSent(false)

    if (!audience) {
      setError('Selecciona si calculas para ti o para tu empresa.')
      return
    }

    const base = parseFloat(salarioBase.replace(/,/g, ''))
    if (!Number.isFinite(base) || base <= 0) {
      setError('Ingresa un salario base válido.')
      return
    }
    if (!fechaIngreso) {
      setError('Ingresa tu fecha de ingreso.')
      return
    }

    const promedio =
      modoCalculo === 'anual' && salarioPromedio.trim()
        ? parseFloat(salarioPromedio.replace(/,/g, ''))
        : undefined

    if (modoCalculo === 'anual' && (!promedio || promedio <= 0)) {
      setError('En modo anual ingresa el salario promedio ordinario del período.')
      return
    }

    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/public/calculate-benefit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: config.tipo,
          salarioBaseMensual: base,
          salarioPromedioMensual: promedio,
          fechaIngreso,
          fechaCalculo,
          modoCalculo,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al calcular.')
        return
      }
      setPendingResult(data)
      setVerifying(true)
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!result || !email.trim() || !fullName.trim() || !consentNewsletter) {
      setError('Completa nombre, email y acepta el newsletter para recibir el PDF.')
      return
    }
    persistContact()
    setSendingEmail(true)
    setError(null)
    try {
      const metaEventId = createMetaEventId('calc')
      const res = await fetch('/api/public/send-benefit-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...result,
          email,
          fullName,
          company,
          phone,
          consentNewsletter: true,
          fechaIngreso,
          label: config.label,
          audience: audience ?? undefined,
          ...buildMetaApiTrackingFields(metaEventId),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al enviar el PDF.')
        return
      }
      setEmailSent(true)
      dismissSoftGate()
      trackCalcLeadSubmit({
        tool,
        eventId: metaEventId,
        email: email.trim(),
        audience,
        hasPhone: Boolean(phone.trim()),
        hasCompany: Boolean(company.trim()),
        phone: phone.trim() || undefined,
        firstName: fullName.trim() || undefined,
      })
    } catch {
      setError('Error al enviar el correo.')
    } finally {
      setSendingEmail(false)
    }
  }

  const ConversionButtons = ({
    campaign,
    size = 'md',
  }: {
    campaign: 'post-calc' | 'footer' | 'sticky'
    size?: 'md' | 'sm'
  }) => {
    const pad = size === 'sm' ? 'py-2.5 px-5 text-sm' : 'py-3 px-6'
    return (
      <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
        <Link
          href={activarUrl(campaign)}
          onClick={() => trackCalcActivarClick(tool, campaign)}
          className={`inline-flex justify-center ${pad} bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-all text-center`}
        >
          {config.conversion.inlineButton}
        </Link>
        <TrackedWhatsAppLink
          href={demoUrl(campaign)}
          target="_blank"
          rel="noopener noreferrer"
          trackingContext={`calc_${tool}_demo_${campaign}`}
          className={`inline-flex justify-center ${pad} bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all text-center`}
        >
          {config.conversion.demoButton}
        </TrackedWhatsAppLink>
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
        <link rel="canonical" href={config.canonicalUrl} />
      </Head>
      <SchemaMarkup schema={[webPageSchema, faqSchema, breadcrumbSchema]} />

      {result && (
        <div className="sticky top-0 z-30 bg-slate-900/95 border-b border-green-500/30 backdrop-blur-md py-2 px-4 sm:hidden">
          <p className="text-center text-sm text-brand-200">
            Tu {config.labelShort}:{' '}
            <span className="font-bold text-green-400">{formatHNL(result.monto)}</span>
          </p>
        </div>
      )}

      <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10 ${result ? 'pb-28 sm:pb-24' : ''}`}>
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {config.hero.badges.map((badge) => (
              <span
                key={badge}
                className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30"
              >
                {badge}
              </span>
            ))}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            <span className="block">{config.hero.headlineLead}</span>
            <span className="text-brand-300 block mt-2">{config.hero.headlineAccent}</span>
          </h1>
          <p className="text-lg text-brand-200/90 max-w-2xl mx-auto">{config.hero.subheadline}</p>
          <p className="text-sm text-brand-300/80 mt-3">
            Período: {config.periodDescription} · Pago antes del {config.paymentDeadline}
          </p>
        </div>

        <RoleSelector
          audience={audience}
          onSelect={handleAudienceSelect}
          employeeTitle={config.funnel.audience.employeeTitle}
          employeeBody={config.funnel.audience.employeeBody}
          companyTitle={config.funnel.audience.companyTitle}
          companyBody={config.funnel.audience.companyBody}
          tool={tool}
        />

        {audience && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-modern rounded-2xl p-6 sm:p-8">
              <form onSubmit={handleCalculate} className="space-y-5">
                <div>
                  <label htmlFor="salarioBase" className="block text-sm font-medium text-white mb-2">
                    Salario base mensual (L.)
                  </label>
                  <input
                    id="salarioBase"
                    type="text"
                    value={salarioBase}
                    onChange={(e) => setSalarioBase(e.target.value)}
                    placeholder="Ej: 25000"
                    className="block w-full px-3 py-3 border rounded-xl bg-white/5 text-white border-white/20"
                    required
                  />
                </div>

                {modoCalculo === 'anual' && (
                  <div>
                    <label htmlFor="salarioPromedio" className="block text-sm font-medium text-white mb-2">
                      Salario promedio ordinario del período (L.)
                    </label>
                    <input
                      id="salarioPromedio"
                      type="text"
                      value={salarioPromedio}
                      onChange={(e) => setSalarioPromedio(e.target.value)}
                      placeholder="Incluye comisiones recurrentes"
                      className="block w-full px-3 py-3 border rounded-xl bg-white/5 text-white border-white/20"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fechaIngreso" className="block text-sm font-medium text-white mb-2">
                      Fecha de ingreso
                    </label>
                    <input
                      id="fechaIngreso"
                      type="date"
                      value={fechaIngreso}
                      onChange={(e) => setFechaIngreso(e.target.value)}
                      className="block w-full px-3 py-3 border rounded-xl bg-white/5 text-white border-white/20"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="fechaCalculo" className="block text-sm font-medium text-white mb-2">
                      Fecha de cálculo
                    </label>
                    <input
                      id="fechaCalculo"
                      type="date"
                      value={fechaCalculo}
                      onChange={(e) => setFechaCalculo(e.target.value)}
                      className="block w-full px-3 py-3 border rounded-xl bg-white/5 text-white border-white/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Modo de cálculo</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['proporcional', 'anual'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setModoCalculo(mode)}
                        className={`py-3 px-3 rounded-xl border-2 text-sm font-medium ${
                          modoCalculo === mode
                            ? 'border-brand-500/70 bg-brand-600 text-white'
                            : 'border-white/20 bg-white/5 text-brand-200'
                        }`}
                      >
                        {mode === 'proporcional' ? 'Proporcional / finiquito' : 'Pago anual (promedio)'}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-200 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || verifying}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {loading ? 'Calculando...' : `Calcular ${config.labelShort}`}
                </button>
              </form>
            </div>

            <div ref={resultRef} className="glass-modern rounded-2xl p-6 sm:p-8 scroll-mt-28">
              {verifying && pendingResult ? (
                <CalculatingState
                  steps={config.funnel.verificationSteps}
                  onComplete={() => finalizeResult(pendingResult)}
                />
              ) : result ? (
                <div className="space-y-6">
                  <BenefitResultHero
                    result={result}
                    labelShort={config.labelShort}
                    noDeductionsLine={config.trust.noDeductionsLine}
                  />

                  <BenefitLeadCapture
                    headline={config.funnel.leadCapture.headline}
                    subheadline={config.funnel.leadCapture.subheadline}
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
                    showCompanyField={audience === 'empresa'}
                  />

                  {audience === 'empleado' ? (
                    <BenefitTrojanShare
                      tipo={config.tipo}
                      labelShort={config.labelShort}
                      path={config.path}
                      montoFormatted={formatHNL(result.monto)}
                    />
                  ) : (
                    <div className="glass-modern rounded-xl p-5 border border-cyan-500/30 text-center">
                      <h3 className="text-lg font-bold text-white mb-2">{config.conversion.inlineTitle}</h3>
                      <p className="text-sm text-brand-200/90 mb-4">{config.conversion.inlineBody}</p>
                      <ConversionButtons campaign="post-calc" size="sm" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-brand-300/70 py-12">
                  <p>Completa el formulario y calcula tu {config.labelShort.toLowerCase()}.</p>
                  <CalcTrustLine className="text-xs mt-4 text-brand-300/80">{config.trust.line}</CalcTrustLine>
                </div>
              )}
            </div>
          </div>
        )}

        {!audience && (
          <p className="text-center text-sm text-brand-300/70 mt-4">
            El cálculo es 100% gratis — selecciona tu perfil arriba para comenzar.
          </p>
        )}

        <section className="mt-12 glass-modern rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white mb-4">{config.conversion.footerTitle}</h2>
          <p className="text-brand-200/90 mb-4">{config.conversion.footerBody}</p>
          <ConversionButtons campaign="footer" />
        </section>

        <div className="mt-8">
          <CalculatorSubscriptionBridge
            tool={tool}
            placement="footer"
            shareConfig={PUBLIC_CALCULATOR_CONFIGS.HND}
          />
        </div>

        <section className="mt-8 text-center opacity-50">
          <p className="text-xs text-brand-300/80 uppercase tracking-wider mb-3">
            Empresas en Centroamérica confían en Humano SISU
          </p>
          <p className="text-sm text-brand-200/70 max-w-xl mx-auto">
            Más equipos de RRHH dejan Excel cada mes. Únete a la era SISU.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-white mb-4">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {config.faqs.map((faq) => (
              <div key={faq.question} className="glass-modern rounded-xl p-4">
                <h3 className="font-semibold text-white mb-2">{faq.question}</h3>
                <p className="text-sm text-brand-200/90">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white mb-3">Calculadoras relacionadas</h2>
          <div className="flex flex-wrap gap-3">
            {config.relatedCalculators.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-brand-300 hover:text-white underline text-sm"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/calculadora" className="text-brand-300 hover:text-white underline text-sm">
              Ver todas las calculadoras
            </Link>
          </div>
        </section>
      </div>

      {result && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4 bg-slate-900/95 border-t border-white/10 backdrop-blur-md shadow-2xl">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            {emailSent ? (
              <CalcPdfSentMessage>PDF enviado — revisa tu correo</CalcPdfSentMessage>
            ) : (
              <p className="text-sm text-brand-100 text-center sm:text-left">
                <span className="font-semibold text-white">{formatHNL(result.monto)}</span>
                {' · '}
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById('benefit-lead-capture')?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="text-cyan-300 hover:text-white underline"
                >
                  Recibir PDF gratis
                </button>
              </p>
            )}
            {audience === 'empresa' && <ConversionButtons campaign="sticky" size="sm" />}
          </div>
        </div>
      )}

      <LeadCaptureSoftGate
        open={showSoftGate}
        onClose={dismissSoftGate}
        title={config.funnel.leadCapture.softGateTitle}
        body={config.funnel.leadCapture.softGateBody}
      >
        <BenefitLeadCapture
          headline={config.funnel.leadCapture.headline}
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
          onSubmit={() => {
            handleSendEmail()
          }}
          sending={sendingEmail}
          sent={emailSent}
          showCompanyField={audience === 'empresa'}
          idPrefix="modal-lead"
        />
      </LeadCaptureSoftGate>
    </PublicPageShell>
  )
}
