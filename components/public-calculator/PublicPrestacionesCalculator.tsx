import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import PublicPageShell from '../landing/PublicPageShell'
import SchemaMarkup from '../SEO/SchemaMarkup'
import TrackedWhatsAppLink from '../TrackedWhatsAppLink'
import type { MotivoSalida, LiquidacionResult } from '../../lib/payroll/cesantias'
import type { PublicPrestacionesConfig } from '../../lib/public-calculator/prestaciones-config'
import {
  appendPrestacionesUtmParams,
  buildPrestacionesDemoWhatsAppUrl,
} from '../../lib/public-calculator/utm'
import {
  trackCalcActivarClick,
  trackCalcComplete,
  trackCalcLeadSubmit,
  type CalculatorAudience,
} from '../../lib/analytics/calculator-events'
import {
  generateBreadcrumbListSchema,
  generateFAQPageSchema,
  generateWebPageSchema,
} from '../../lib/seo/schema'
import RoleSelector from './RoleSelector'
import CalculatingState from './CalculatingState'
import BenefitLeadCapture from './BenefitLeadCapture'
import LeadCaptureSoftGate, { useLeadSoftGateTriggers } from './LeadCaptureSoftGate'
import PrestacionesResultHero from './PrestacionesResultHero'
import PrestacionesTrojanShare from './PrestacionesTrojanShare'
import { CalcPdfSentMessage, CalcTrustLine } from './CalculatorUiIcons'
import CalculatorSubscriptionBridge from './CalculatorSubscriptionBridge'

const FORM_STORAGE_KEY = 'public_prestaciones_calculator_v1'
const TOOL = 'prestaciones_hnd' as const

type PublicMotivoSalida =
  | 'RENUNCIA_VOLUNTARIA'
  | 'DESPIDO_INJUSTIFICADO'
  | 'DESPIDO_JUSTIFICADO'
  | 'CAUSA_AJENA_TRABAJADOR'
  | 'FALLECIMIENTO'
  | 'PENSION_JUBILACION_EQUIVALENTE'
  | 'FIN_CONTRATO'
  | 'MUTUO_ACUERDO'

const MOTIVO_OPTIONS: { value: PublicMotivoSalida; label: string; help: string }[] = [
  { value: 'RENUNCIA_VOLUNTARIA', label: 'Renuncia voluntaria', help: 'Útil si vas a salir por decisión propia.' },
  {
    value: 'DESPIDO_INJUSTIFICADO',
    label: 'Despido injustificado',
    help: 'Suele generar cesantía y puede incluir pago de preaviso.',
  },
  {
    value: 'CAUSA_AJENA_TRABAJADOR',
    label: 'Causa ajena a tu voluntad',
    help: 'Puede generar cesantía y preaviso según el caso (orientativo).',
  },
  { value: 'DESPIDO_JUSTIFICADO', label: 'Despido justificado', help: 'Puede afectar cesantía/preaviso según el caso.' },
  {
    value: 'FALLECIMIENTO',
    label: 'Fallecimiento del trabajador',
    help: 'Cálculo orientativo; puede aplicar un porcentaje según condiciones.',
  },
  {
    value: 'PENSION_JUBILACION_EQUIVALENTE',
    label: 'Jubilación / pensión equivalente',
    help: 'En general excluye el auxilio de cesantía (orientativo).',
  },
  { value: 'FIN_CONTRATO', label: 'Fin de contrato', help: 'Estimación orientativa; puede variar según condiciones del contrato.' },
  { value: 'MUTUO_ACUERDO', label: 'Mutuo acuerdo', help: 'Estimación orientativa; depende de lo pactado entre partes.' },
]

function mapMotivoToInternal(motivo: PublicMotivoSalida): MotivoSalida {
  if (motivo === 'DESPIDO_INJUSTIFICADO') return 'DESPIDO_INJUSTIFICADO'
  if (motivo === 'DESPIDO_JUSTIFICADO') return 'DESPIDO_JUSTIFICADO'
  if (motivo === 'RENUNCIA_VOLUNTARIA') return 'RENUNCIA'
  if (motivo === 'CAUSA_AJENA_TRABAJADOR') return 'CAUSA_AJENA_TRABAJADOR'
  if (motivo === 'FALLECIMIENTO') return 'FALLECIMIENTO'
  if (motivo === 'PENSION_JUBILACION_EQUIVALENTE') return 'PENSION_JUBILACION_EQUIVALENTE'
  if (motivo === 'FIN_CONTRATO') return 'FIN_CONTRATO'
  return 'MUTUO_ACUERDO'
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export default function PublicPrestacionesCalculator({ config }: { config: PublicPrestacionesConfig }) {
  const [audience, setAudience] = useState<CalculatorAudience | null>(null)
  const [salarioBaseMensual, setSalarioBaseMensual] = useState('')
  const [salaryInputMode, setSalaryInputMode] = useState<'BASE' | 'PROMEDIO' | 'ULTIMOS_6'>('BASE')
  const [salarioPromedioMensual, setSalarioPromedioMensual] = useState('')
  const [salariosUltimos6MesesRaw, setSalariosUltimos6MesesRaw] = useState('')
  const [fechaIngreso, setFechaIngreso] = useState('')
  const [fechaEgreso, setFechaEgreso] = useState('')
  const [motivoSalidaPublico, setMotivoSalidaPublico] = useState<PublicMotivoSalida>('RENUNCIA_VOLUNTARIA')
  const [preavisoGozado, setPreavisoGozado] = useState(false)
  const [retiroVoluntario15, setRetiroVoluntario15] = useState(false)
  const [fallecimientoNatural, setFallecimientoNatural] = useState(false)
  const [incluirRAP, setIncluirRAP] = useState(false)
  const [montoRapAcumulado, setMontoRapAcumulado] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [consentNewsletter, setConsentNewsletter] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [pendingResult, setPendingResult] = useState<LiquidacionResult | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [result, setResult] = useState<LiquidacionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [emailSent, setEmailSent] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)

  const audienceStorageKey = `${config.contactStorageKey}_audience`
  const motivoSalida = useMemo(() => mapMotivoToInternal(motivoSalidaPublico), [motivoSalidaPublico])
  const showPreavisoToggle =
    motivoSalidaPublico === 'DESPIDO_INJUSTIFICADO' || motivoSalidaPublico === 'CAUSA_AJENA_TRABAJADOR'
  const showRetiroVoluntarioToggle = motivoSalidaPublico === 'RENUNCIA_VOLUNTARIA'
  const showFallecimientoNaturalToggle = motivoSalidaPublico === 'FALLECIMIENTO'

  const activarUrl = (campaign: 'post-calc' | 'footer' | 'sticky') =>
    appendPrestacionesUtmParams(config.conversion.inlineHref, campaign)
  const demoUrl = (campaign: string) => buildPrestacionesDemoWhatsAppUrl(`calc_${TOOL}_${campaign}`)

  const { showSoftGate, dismissSoftGate } = useLeadSoftGateTriggers(Boolean(result) && !emailSent, 5000)

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
      const raw = localStorage.getItem(FORM_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, unknown>
      if (typeof parsed.salarioBaseMensual === 'string') setSalarioBaseMensual(parsed.salarioBaseMensual)
      if (parsed.salaryInputMode === 'BASE' || parsed.salaryInputMode === 'PROMEDIO' || parsed.salaryInputMode === 'ULTIMOS_6') {
        setSalaryInputMode(parsed.salaryInputMode)
      }
      if (typeof parsed.salarioPromedioMensual === 'string') setSalarioPromedioMensual(parsed.salarioPromedioMensual)
      if (typeof parsed.salariosUltimos6MesesRaw === 'string') setSalariosUltimos6MesesRaw(parsed.salariosUltimos6MesesRaw)
      if (typeof parsed.fechaIngreso === 'string') setFechaIngreso(parsed.fechaIngreso)
      if (typeof parsed.fechaEgreso === 'string') setFechaEgreso(parsed.fechaEgreso)
      if (typeof parsed.motivoSalidaPublico === 'string') setMotivoSalidaPublico(parsed.motivoSalidaPublico as PublicMotivoSalida)
      if (typeof parsed.preavisoGozado === 'boolean') setPreavisoGozado(parsed.preavisoGozado)
      if (typeof parsed.retiroVoluntario15 === 'boolean') setRetiroVoluntario15(parsed.retiroVoluntario15)
      if (typeof parsed.fallecimientoNatural === 'boolean') setFallecimientoNatural(parsed.fallecimientoNatural)
      if (typeof parsed.incluirRAP === 'boolean') setIncluirRAP(parsed.incluirRAP)
      if (typeof parsed.montoRapAcumulado === 'string') setMontoRapAcumulado(parsed.montoRapAcumulado)
    } catch {
      /* ignore */
    }
  }, [])

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

  useEffect(() => {
    try {
      localStorage.setItem(
        FORM_STORAGE_KEY,
        JSON.stringify({
          salarioBaseMensual,
          salaryInputMode,
          salarioPromedioMensual,
          salariosUltimos6MesesRaw,
          fechaIngreso,
          fechaEgreso,
          motivoSalidaPublico,
          preavisoGozado,
          retiroVoluntario15,
          fallecimientoNatural,
          incluirRAP,
          montoRapAcumulado,
        })
      )
    } catch {
      /* ignore */
    }
  }, [
    salarioBaseMensual,
    salaryInputMode,
    salarioPromedioMensual,
    salariosUltimos6MesesRaw,
    fechaIngreso,
    fechaEgreso,
    motivoSalidaPublico,
    preavisoGozado,
    retiroVoluntario15,
    fallecimientoNatural,
    incluirRAP,
    montoRapAcumulado,
  ])

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
      localStorage.setItem(config.contactStorageKey, JSON.stringify({ fullName, email, company, phone }))
    } catch {
      /* ignore */
    }
  }, [config.contactStorageKey, fullName, email, company, phone])

  const validateClient = () => {
    const nextErrors: Record<string, string> = {}
    const salarioBaseNum = parseFloat(salarioBaseMensual.replace(/[^\d.]/g, ''))
    if (salaryInputMode === 'BASE') {
      if (!Number.isFinite(salarioBaseNum) || salarioBaseNum <= 0) {
        nextErrors.salarioBaseMensual = 'Ingresa un salario base mensual válido (mayor que 0).'
      }
    }
    if (salaryInputMode === 'PROMEDIO') {
      const avgNum = parseFloat(salarioPromedioMensual.replace(/[^\d.]/g, ''))
      if (!Number.isFinite(avgNum) || avgNum <= 0) {
        nextErrors.salarioPromedioMensual = 'Ingresa un salario promedio mensual válido (mayor que 0).'
      }
    } else if (salaryInputMode === 'ULTIMOS_6') {
      const nums = salariosUltimos6MesesRaw
        .split(/[,\n]/g)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n >= 0)
      if (nums.length === 0) {
        nextErrors.salariosUltimos6MesesRaw = 'Ingresa al menos 1 salario (hasta 6).'
      }
    }
    if (!isValidDateString(fechaIngreso)) nextErrors.fechaIngreso = 'Ingresa una fecha de ingreso válida.'
    if (!isValidDateString(fechaEgreso)) nextErrors.fechaEgreso = 'Ingresa una fecha de egreso válida.'
    if (isValidDateString(fechaIngreso) && isValidDateString(fechaEgreso)) {
      const start = new Date(fechaIngreso)
      const end = new Date(fechaEgreso)
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
        nextErrors.fechaEgreso = 'La fecha de egreso no puede ser anterior a la fecha de ingreso.'
      }
    }
    if (incluirRAP) {
      const rapNum = parseFloat(montoRapAcumulado.replace(/[^\d.]/g, ''))
      if (!Number.isFinite(rapNum) || rapNum < 0) {
        nextErrors.montoRapAcumulado = 'Ingresa un monto RAP válido (0 o mayor).'
      }
    }
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const finalizeResult = useCallback(
    (data: LiquidacionResult) => {
      setResult(data)
      setVerifying(false)
      setPendingResult(null)
      trackCalcComplete({
        tool: TOOL,
        value: data.rubros.totalPagar,
        audience,
      })
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    },
    [audience]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setEmailSent(false)

    if (!audience) {
      setError('Selecciona si calculas para ti o para tu empresa.')
      return
    }
    if (!validateClient()) {
      setError('Revisa los datos del formulario.')
      return
    }

    const avgNum = parseFloat(salarioPromedioMensual.replace(/[^\d.]/g, ''))
    const rapNum = incluirRAP ? parseFloat(montoRapAcumulado.replace(/[^\d.]/g, '')) : 0
    const salariosUltimos6 = salariosUltimos6MesesRaw
      .split(/[,\n]/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n >= 0)
      .slice(0, 6)
    const baseFromMode =
      salaryInputMode === 'BASE'
        ? parseFloat(salarioBaseMensual.replace(/[^\d.]/g, ''))
        : salaryInputMode === 'PROMEDIO'
          ? avgNum
          : salariosUltimos6.length > 0
            ? salariosUltimos6.reduce((a, b) => a + b, 0) / salariosUltimos6.length
            : NaN

    setLoading(true)
    try {
      const response = await fetch('/api/public/calculate-prestaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datosManuales: {
            salarioBaseMensual: Number.isFinite(baseFromMode) ? baseFromMode : 0,
            ...(salaryInputMode === 'PROMEDIO'
              ? { salarioPromedioMensual: Number.isFinite(avgNum) ? avgNum : undefined }
              : salaryInputMode === 'ULTIMOS_6'
                ? { salariosUltimos6Meses: salariosUltimos6 }
                : {}),
            fechaIngreso,
            fechaEgreso,
          },
          parametrosCalculo: {
            motivoSalida,
            montoRapAcumulado: Number.isFinite(rapNum) ? rapNum : 0,
            preavisoGozado: showPreavisoToggle ? preavisoGozado : false,
            condiciones: {
              retiroVoluntario: showRetiroVoluntarioToggle ? retiroVoluntario15 : false,
              fallecimientoNatural: showFallecimientoNaturalToggle ? fallecimientoNatural : false,
            },
          },
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.error || data?.message || 'No se pudo calcular las prestaciones')
        return
      }
      const data: LiquidacionResult = await response.json()
      setPendingResult(data)
      setVerifying(true)
    } catch {
      setError('Error de red al calcular prestaciones')
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
      const response = await fetch('/api/public/send-prestaciones-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName,
          company,
          phone,
          consentNewsletter: true,
          audience: audience ?? undefined,
          datosManuales: {
            salarioBaseMensual: result.bases.salarioBaseMensual,
            salarioPromedioMensual: result.bases.salarioPromedioMensual,
            fechaIngreso,
            fechaEgreso,
            antiguedadTexto: `${result.tiempos.anos}a ${result.tiempos.meses}m ${result.tiempos.dias}d`,
          },
          parametros: {
            motivoSalida: result.metadata.motivoSalida,
            preavisoGozado: result.metadata.preavisoGozado,
          },
          rubros: result.rubros,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Error al enviar el PDF.')
        return
      }
      setEmailSent(true)
      dismissSoftGate()
      trackCalcLeadSubmit({
        tool: TOOL,
        audience,
        hasPhone: Boolean(phone.trim()),
        hasCompany: Boolean(company.trim()),
      })
    } catch {
      setError('Error al enviar el correo.')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleReset = () => {
    setSalarioBaseMensual('')
    setSalaryInputMode('BASE')
    setSalarioPromedioMensual('')
    setSalariosUltimos6MesesRaw('')
    setFechaIngreso('')
    setFechaEgreso('')
    setMotivoSalidaPublico('RENUNCIA_VOLUNTARIA')
    setPreavisoGozado(false)
    setRetiroVoluntario15(false)
    setFallecimientoNatural(false)
    setIncluirRAP(false)
    setMontoRapAcumulado('')
    setError(null)
    setFieldErrors({})
    setResult(null)
    setEmailSent(false)
    try {
      localStorage.removeItem(FORM_STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }

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
          onClick={() => trackCalcActivarClick(TOOL, campaign)}
          className={`inline-flex justify-center ${pad} bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-all text-center`}
        >
          {config.conversion.inlineButton}
        </Link>
        <TrackedWhatsAppLink
          href={demoUrl(campaign)}
          target="_blank"
          rel="noopener noreferrer"
          trackingContext={`calc_${TOOL}_demo_${campaign}`}
          className={`inline-flex justify-center ${pad} bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all text-center`}
        >
          {config.conversion.demoButton}
        </TrackedWhatsAppLink>
      </div>
    )
  }

  const inputClass = (hasError: boolean) =>
    `block w-full px-3 py-3.5 border rounded-xl bg-white/5 backdrop-blur-sm text-white placeholder-brand-200/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all ${
      hasError ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
    }`

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
            Total finiquito:{' '}
            <span className="font-bold text-green-400">{formatCurrency(result.rubros.totalPagar)}</span>
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
        </div>

        <RoleSelector
          audience={audience}
          onSelect={handleAudienceSelect}
          employeeTitle={config.funnel.audience.employeeTitle}
          employeeBody={config.funnel.audience.employeeBody}
          companyTitle={config.funnel.audience.companyTitle}
          companyBody={config.funnel.audience.companyBody}
          tool={TOOL}
        />

        {audience && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-modern rounded-2xl shadow-2xl p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">¿Cómo quieres ingresar tus ingresos?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(
                      [
                        ['BASE', 'Salario base mensual', 'Un solo monto.'],
                        ['PROMEDIO', 'Salario promedio', 'Si ya lo tienes calculado.'],
                        ['ULTIMOS_6', 'Últimos 6 meses', 'El sistema hará el promedio.'],
                      ] as const
                    ).map(([mode, title, sub]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSalaryInputMode(mode)}
                        className={`py-3 px-3 rounded-xl border text-left text-sm ${
                          salaryInputMode === mode
                            ? 'border-cyan-400/60 bg-cyan-400/10 text-white'
                            : 'border-white/20 bg-white/5 text-brand-100 hover:bg-white/10'
                        }`}
                      >
                        <div className="font-semibold">{title}</div>
                        <div className="text-xs text-brand-200/80 mt-1">{sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {salaryInputMode === 'BASE' && (
                  <div>
                    <label htmlFor="salarioBaseMensual" className="block text-sm font-medium text-white mb-2">
                      Salario base mensual
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-300 text-sm">Lps.</span>
                      <input
                        id="salarioBaseMensual"
                        type="text"
                        value={salarioBaseMensual}
                        onChange={(e) => setSalarioBaseMensual(e.target.value)}
                        placeholder="0.00"
                        className={`${inputClass(Boolean(fieldErrors.salarioBaseMensual))} pl-16`}
                        required
                      />
                    </div>
                    {fieldErrors.salarioBaseMensual && (
                      <p className="mt-1 text-sm text-red-400">{fieldErrors.salarioBaseMensual}</p>
                    )}
                  </div>
                )}

                {salaryInputMode === 'PROMEDIO' && (
                  <div>
                    <label htmlFor="salarioPromedioMensual" className="block text-sm font-medium text-white mb-2">
                      Salario promedio mensual
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-300 text-sm">Lps.</span>
                      <input
                        id="salarioPromedioMensual"
                        type="text"
                        value={salarioPromedioMensual}
                        onChange={(e) => setSalarioPromedioMensual(e.target.value)}
                        placeholder="0.00"
                        className={`${inputClass(Boolean(fieldErrors.salarioPromedioMensual))} pl-16`}
                        required
                      />
                    </div>
                    {fieldErrors.salarioPromedioMensual && (
                      <p className="mt-1 text-sm text-red-400">{fieldErrors.salarioPromedioMensual}</p>
                    )}
                  </div>
                )}

                {salaryInputMode === 'ULTIMOS_6' && (
                  <div>
                    <label htmlFor="salariosUltimos6" className="block text-sm font-medium text-white mb-2">
                      Ingresos últimos 6 meses
                    </label>
                    <textarea
                      id="salariosUltimos6"
                      value={salariosUltimos6MesesRaw}
                      onChange={(e) => setSalariosUltimos6MesesRaw(e.target.value)}
                      placeholder="Ej: 23000, 24000, 23500"
                      rows={3}
                      className={inputClass(Boolean(fieldErrors.salariosUltimos6MesesRaw))}
                      required
                    />
                    {fieldErrors.salariosUltimos6MesesRaw && (
                      <p className="mt-1 text-sm text-red-400">{fieldErrors.salariosUltimos6MesesRaw}</p>
                    )}
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
                      className={inputClass(Boolean(fieldErrors.fechaIngreso))}
                      required
                    />
                    {fieldErrors.fechaIngreso && <p className="mt-1 text-sm text-red-400">{fieldErrors.fechaIngreso}</p>}
                  </div>
                  <div>
                    <label htmlFor="fechaEgreso" className="block text-sm font-medium text-white mb-2">
                      Fecha de egreso
                    </label>
                    <input
                      id="fechaEgreso"
                      type="date"
                      value={fechaEgreso}
                      onChange={(e) => setFechaEgreso(e.target.value)}
                      className={inputClass(Boolean(fieldErrors.fechaEgreso))}
                      required
                    />
                    {fieldErrors.fechaEgreso && <p className="mt-1 text-sm text-red-400">{fieldErrors.fechaEgreso}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="motivoSalida" className="block text-sm font-medium text-white mb-2">
                    Motivo de salida
                  </label>
                  <select
                    id="motivoSalida"
                    value={motivoSalidaPublico}
                    onChange={(e) => setMotivoSalidaPublico(e.target.value as PublicMotivoSalida)}
                    className={`${inputClass(false)} border-white/20`}
                  >
                    {MOTIVO_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-slate-800">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-brand-300/80">
                    {MOTIVO_OPTIONS.find((x) => x.value === motivoSalidaPublico)?.help}
                  </p>
                </div>

                {showPreavisoToggle && (
                  <label className="flex items-center justify-between gap-3 text-sm text-white">
                    <span>¿Ya laboraste el preaviso?</span>
                    <input
                      type="checkbox"
                      checked={preavisoGozado}
                      onChange={(e) => setPreavisoGozado(e.target.checked)}
                      className="h-4 w-4 rounded border-white/30 bg-slate-900"
                    />
                  </label>
                )}
                {showRetiroVoluntarioToggle && (
                  <label className="flex items-center justify-between gap-3 text-sm text-white">
                    <span>¿Retiro voluntario con 15+ años?</span>
                    <input
                      type="checkbox"
                      checked={retiroVoluntario15}
                      onChange={(e) => setRetiroVoluntario15(e.target.checked)}
                      className="h-4 w-4 rounded border-white/30 bg-slate-900"
                    />
                  </label>
                )}
                {showFallecimientoNaturalToggle && (
                  <label className="flex items-center justify-between gap-3 text-sm text-white">
                    <span>¿Fallecimiento natural?</span>
                    <input
                      type="checkbox"
                      checked={fallecimientoNatural}
                      onChange={(e) => setFallecimientoNatural(e.target.checked)}
                      className="h-4 w-4 rounded border-white/30 bg-slate-900"
                    />
                  </label>
                )}

                <div className="glass rounded-xl p-4 border border-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-white font-medium text-sm">RAP (opcional)</div>
                      <p className="text-xs text-brand-200/80 mt-1">Compensa cesantía cuando aplique.</p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-brand-200/90">
                      <input
                        type="checkbox"
                        checked={incluirRAP}
                        onChange={(e) => setIncluirRAP(e.target.checked)}
                        className="h-4 w-4 rounded border-white/30 bg-slate-900"
                      />
                      Incluir
                    </label>
                  </div>
                  {incluirRAP && (
                    <div className="mt-3 relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-300 text-sm">Lps.</span>
                      <input
                        type="text"
                        value={montoRapAcumulado}
                        onChange={(e) => setMontoRapAcumulado(e.target.value)}
                        placeholder="0.00"
                        className={`${inputClass(Boolean(fieldErrors.montoRapAcumulado))} pl-16`}
                      />
                      {fieldErrors.montoRapAcumulado && (
                        <p className="mt-1 text-sm text-red-400">{fieldErrors.montoRapAcumulado}</p>
                      )}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-200 text-sm">{error}</div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={loading || verifying}
                    className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl disabled:opacity-50"
                  >
                    {loading ? 'Calculando...' : 'Calcular prestaciones'}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full sm:w-auto py-3.5 px-6 border border-white/20 text-brand-100 hover:bg-white/10 rounded-xl"
                  >
                    Limpiar
                  </button>
                </div>
              </form>
            </div>

            <div ref={resultRef} className="glass-modern rounded-2xl shadow-2xl p-6 sm:p-8 scroll-mt-28">
              {verifying && pendingResult ? (
                <CalculatingState
                  steps={config.funnel.verificationSteps}
                  onComplete={() => finalizeResult(pendingResult)}
                />
              ) : result ? (
                <div className="space-y-6">
                  <PrestacionesResultHero
                    result={result}
                    incluirRAP={incluirRAP}
                    disclaimer={config.trust.disclaimer}
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
                    containerId="prestaciones-lead-capture"
                  />

                  {audience === 'empleado' ? (
                    <PrestacionesTrojanShare
                      trojanHorse={config.funnel.trojanHorse}
                      totalFormatted={formatCurrency(result.rubros.totalPagar)}
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
                  <p>Completa el formulario para ver tu liquidación estimada.</p>
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
            tool={TOOL}
            placement="footer"
          />
        </div>

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
              <Link key={link.href} href={link.href} className="text-brand-300 hover:text-white underline text-sm">
                {link.label}
              </Link>
            ))}
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
                <span className="font-semibold text-white">{formatCurrency(result.rubros.totalPagar)}</span>
                {' · '}
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById('prestaciones-lead-capture')?.scrollIntoView({ behavior: 'smooth' })
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
          onSubmit={handleSendEmail}
          sending={sendingEmail}
          sent={emailSent}
          showCompanyField={audience === 'empresa'}
          idPrefix="modal-prest"
        />
      </LeadCaptureSoftGate>
    </PublicPageShell>
  )
}
