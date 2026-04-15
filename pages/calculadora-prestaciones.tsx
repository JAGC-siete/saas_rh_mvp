import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import MainHeader from '../components/MainHeader'
import DemoFooter from '../components/DemoFooter'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import { generateWebPageSchema } from '../lib/seo/schema'
import { generateTitle } from '../lib/seo/title'
import { generateDescription } from '../lib/seo/description'
import type { MotivoSalida } from '../lib/payroll/cesantias'

const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })

type LiquidacionResponse = import('../lib/payroll/cesantias').LiquidacionResult

type ZodValidationError = {
  _errors?: string[]
  [key: string]: ZodValidationError | string[] | undefined
}

type PublicMotivoSalida =
  | 'RENUNCIA_VOLUNTARIA'
  | 'DESPIDO_INJUSTIFICADO'
  | 'DESPIDO_JUSTIFICADO'
  | 'FIN_CONTRATO'
  | 'MUTUO_ACUERDO'

const STORAGE_KEY = 'public_prestaciones_calculator_v1'

const MOTIVO_OPTIONS: { value: PublicMotivoSalida; label: string; help: string }[] = [
  {
    value: 'RENUNCIA_VOLUNTARIA',
    label: 'Renuncia voluntaria',
    help: 'Útil si vas a salir por decisión propia.',
  },
  {
    value: 'DESPIDO_INJUSTIFICADO',
    label: 'Despido injustificado',
    help: 'Suele generar cesantía y puede incluir pago de preaviso.',
  },
  {
    value: 'DESPIDO_JUSTIFICADO',
    label: 'Despido justificado',
    help: 'Puede afectar cesantía/preaviso según el caso.',
  },
  {
    value: 'FIN_CONTRATO',
    label: 'Fin de contrato',
    help: 'Estimación orientativa; puede variar según condiciones del contrato.',
  },
  {
    value: 'MUTUO_ACUERDO',
    label: 'Mutuo acuerdo',
    help: 'Estimación orientativa; depende de lo pactado entre partes.',
  },
]

function mapMotivoToInternal(motivo: PublicMotivoSalida): MotivoSalida {
  if (motivo === 'DESPIDO_INJUSTIFICADO') return 'DESPIDO_INJUSTIFICADO'
  if (motivo === 'DESPIDO_JUSTIFICADO') return 'DESPIDO_JUSTIFICADO'
  if (motivo === 'RENUNCIA_VOLUNTARIA') return 'RENUNCIA'
  if (motivo === 'FIN_CONTRATO') return 'DESPIDO_JUSTIFICADO'
  return 'DESPIDO_JUSTIFICADO'
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function Tooltip({
  title,
  content,
  children,
}: {
  title: string
  content: string
  children: React.ReactNode
}) {
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {isOpen && (
        <div
          id={`${tooltipId}-content`}
          role="tooltip"
          className="absolute z-50 w-72 p-3 mt-2 text-sm text-white glass rounded-xl shadow-xl border border-white/20 backdrop-blur-sm left-0 md:left-auto md:right-0"
          aria-live="polite"
        >
          <div className="font-semibold mb-1 text-cyan-300">{title}</div>
          <div className="text-brand-200/90">{content}</div>
          <div
            className="absolute -top-2 left-4 md:left-auto md:right-4 w-4 h-4 bg-white/10 border-l border-t border-white/20 backdrop-blur-sm transform rotate-45"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  )
}

export default function CalculadoraPrestacionesPage() {
  const [salarioBaseMensual, setSalarioBaseMensual] = useState('')
  const [fechaIngreso, setFechaIngreso] = useState('')
  const [fechaEgreso, setFechaEgreso] = useState('')
  const [motivoSalidaPublico, setMotivoSalidaPublico] = useState<PublicMotivoSalida>('RENUNCIA_VOLUNTARIA')
  const [preavisoGozado, setPreavisoGozado] = useState(false)
  const [incluirRAP, setIncluirRAP] = useState(false)
  const [montoRapAcumulado, setMontoRapAcumulado] = useState('')

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LiquidacionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const motivoSalida = useMemo(() => mapMotivoToInternal(motivoSalidaPublico), [motivoSalidaPublico])
  const showPreavisoToggle = useMemo(
    () => motivoSalidaPublico === 'DESPIDO_INJUSTIFICADO',
    [motivoSalidaPublico]
  )

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as any
      if (typeof parsed?.salarioBaseMensual === 'string') setSalarioBaseMensual(parsed.salarioBaseMensual)
      if (typeof parsed?.fechaIngreso === 'string') setFechaIngreso(parsed.fechaIngreso)
      if (typeof parsed?.fechaEgreso === 'string') setFechaEgreso(parsed.fechaEgreso)
      if (typeof parsed?.motivoSalidaPublico === 'string') setMotivoSalidaPublico(parsed.motivoSalidaPublico)
      if (typeof parsed?.preavisoGozado === 'boolean') setPreavisoGozado(parsed.preavisoGozado)
      if (typeof parsed?.incluirRAP === 'boolean') setIncluirRAP(parsed.incluirRAP)
      if (typeof parsed?.montoRapAcumulado === 'string') setMontoRapAcumulado(parsed.montoRapAcumulado)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          salarioBaseMensual,
          fechaIngreso,
          fechaEgreso,
          motivoSalidaPublico,
          preavisoGozado,
          incluirRAP,
          montoRapAcumulado,
        })
      )
    } catch {
      // ignore
    }
  }, [salarioBaseMensual, fechaIngreso, fechaEgreso, motivoSalidaPublico, preavisoGozado, incluirRAP, montoRapAcumulado])

  const validateClient = () => {
    const nextErrors: Record<string, string> = {}
    const salarioNum = parseFloat(salarioBaseMensual.replace(/[^\d.]/g, ''))
    if (!Number.isFinite(salarioNum) || salarioNum <= 0) {
      nextErrors.salarioBaseMensual = 'Ingresa un salario mensual válido (mayor que 0).'
    }
    if (!isValidDateString(fechaIngreso)) {
      nextErrors.fechaIngreso = 'Ingresa una fecha de ingreso válida.'
    }
    if (!isValidDateString(fechaEgreso)) {
      nextErrors.fechaEgreso = 'Ingresa una fecha de egreso válida.'
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!validateClient()) {
      setError('Revisa los datos del formulario.')
      return
    }

    const salarioNum = parseFloat(salarioBaseMensual.replace(/[^\d.]/g, ''))
    const rapNum = incluirRAP ? parseFloat(montoRapAcumulado.replace(/[^\d.]/g, '')) : 0

    setLoading(true)
    try {
      const response = await fetch('/api/public/calculate-prestaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datosManuales: {
            salarioBaseMensual: salarioNum,
            fechaIngreso,
            fechaEgreso,
          },
          parametrosCalculo: {
            motivoSalida,
            montoRapAcumulado: Number.isFinite(rapNum) ? rapNum : 0,
            preavisoGozado: showPreavisoToggle ? preavisoGozado : false,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message: string = data?.error || data?.message || 'No se pudo calcular las prestaciones'
        setError(message)

        const validation = data?.validation as ZodValidationError | undefined
        if (validation) {
          const newFieldErrors: Record<string, string> = {}
          const setIfExists = (path: string, node?: ZodValidationError) => {
            if (node?._errors && node._errors.length > 0) {
              newFieldErrors[path] = node._errors[0]
            }
          }
          setIfExists('salarioBaseMensual', (validation as any).datosManuales?.salarioBaseMensual)
          setIfExists('fechaIngreso', (validation as any).datosManuales?.fechaIngreso)
          setIfExists('fechaEgreso', (validation as any).datosManuales?.fechaEgreso)
          setIfExists('motivoSalida', (validation as any).parametrosCalculo?.motivoSalida)
          setIfExists('montoRapAcumulado', (validation as any).parametrosCalculo?.montoRapAcumulado)
          if ((validation as any).datosManuales?._errors?.length) {
            newFieldErrors.fechaEgreso = (validation as any).datosManuales._errors[0]
          }
          setFieldErrors((prev) => ({ ...prev, ...newFieldErrors }))
        }
        return
      }

      const data: LiquidacionResponse = await response.json()
      setResult(data)
    } catch {
      setError('Error de red al calcular prestaciones')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSalarioBaseMensual('')
    setFechaIngreso('')
    setFechaEgreso('')
    setMotivoSalidaPublico('RENUNCIA_VOLUNTARIA')
    setPreavisoGozado(false)
    setIncluirRAP(false)
    setMontoRapAcumulado('')
    setError(null)
    setFieldErrors({})
    setResult(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  const pageTitle = generateTitle({
    primaryKeyword: 'Calculadora de prestaciones Honduras',
    secondaryKeywords: 'Cesantía, preaviso, vacaciones, 13vo, 14vo',
  })
  const pageDescription = generateDescription({
    valueProposition: 'Calcula tu liquidación laboral en Honduras: cesantía, preaviso, vacaciones y proporcionales de 13vo y 14vo',
    cta: 'Calcula gratis',
    additionalBenefit: 'resultado claro y desglose por concepto',
  })
  const webPageSchema = generateWebPageSchema({
    url: '/calculadora-prestaciones',
    title: pageTitle,
    description: pageDescription,
  })

  const breakdown = useMemo(() => {
    if (!result) return []
    return [
      {
        key: 'preaviso',
        label: 'Preaviso',
        amount: result.rubros.preaviso,
        help: 'Estimación del pago por preaviso según antigüedad y motivo de salida.',
      },
      {
        key: 'cesantiaBruta',
        label: 'Cesantía (bruta)',
        amount: result.rubros.cesantiaBruta,
        help: 'Estimación por antigüedad. En algunos casos puede ser 0 según el motivo de salida.',
      },
      {
        key: 'rapAplicado',
        label: 'RAP aplicado',
        amount: result.rubros.rapAplicado,
        help: 'Si incluyes RAP, se descuenta hasta el monto de la cesantía calculada.',
      },
      {
        key: 'cesantiaNeta',
        label: 'Cesantía (neta)',
        amount: result.rubros.cesantiaNeta,
        help: 'Cesantía bruta menos RAP aplicado (si corresponde).',
      },
      {
        key: 'vacaciones',
        label: 'Vacaciones proporcionales',
        amount: result.rubros.vacaciones,
        help: 'Pago estimado por vacaciones proporcionales según años de servicio.',
      },
      {
        key: 'aguinaldo',
        label: '13vo mes proporcional',
        amount: result.rubros.aguinaldo,
        help: 'Proporcional del 13vo según días del año (cálculo 360 días).',
      },
      {
        key: 'decimoCuarto',
        label: '14vo mes proporcional',
        amount: result.rubros.decimoCuarto,
        help: 'Proporcional del 14vo según período julio–junio (cálculo 360 días).',
      },
    ]
  }, [result])

  return (
    <div className="min-h-screen bg-app pt-16 sm:pt-20 md:pt-24 relative">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content="calculadora prestaciones Honduras, calculadora cesantía Honduras, finiquito Honduras, preaviso vacaciones aguinaldo 14vo"
        />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content="https://humanosisu.net/calculadora-prestaciones" />
        <link rel="canonical" href="https://humanosisu.net/calculadora-prestaciones" />
      </Head>
      <SchemaMarkup schema={webPageSchema} />

      <MainHeader enableScrollEffect={true} fixed={true} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-6 animate-fade-up-subtle">
            <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
              Liquidación por finiquito
            </span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
              Honduras · Año comercial 360
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
              Desglose por concepto
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            <span className="text-white block">Calculadora de prestaciones laborales</span>
            <span className="text-brand-300 block sm:inline mt-2 sm:mt-1">Honduras</span>
          </h1>
          <p className="text-lg sm:text-xl text-brand-200/90 max-w-2xl mx-auto">
            Calcula una estimación de tu liquidación: cesantía, preaviso, vacaciones y proporcionales de 13vo y 14vo.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-strong rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-cyan-500/20 to-blue-500/20 opacity-50 blur-xl pointer-events-none" />
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div>
                <label htmlFor="salarioBaseMensual" className="block text-sm font-medium text-white mb-2">
                  Salario base mensual
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-brand-300 sm:text-sm">Lps.</span>
                  </div>
                  <input
                    id="salarioBaseMensual"
                    type="text"
                    value={salarioBaseMensual}
                    onChange={(e) => {
                      setSalarioBaseMensual(e.target.value)
                      if (fieldErrors.salarioBaseMensual) {
                        setFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next.salarioBaseMensual
                          return next
                        })
                      }
                    }}
                    placeholder="0.00"
                    className={`block w-full pl-16 pr-3 py-3.5 border rounded-xl bg-white/5 backdrop-blur-sm text-white placeholder-brand-200/70 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-green-400/50 transition-all hover:border-green-400/30 hover:bg-white/10 ${
                      fieldErrors.salarioBaseMensual ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                    }`}
                    required
                  />
                </div>
                {fieldErrors.salarioBaseMensual && (
                  <p className="mt-1 text-sm text-red-400">{fieldErrors.salarioBaseMensual}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fechaIngreso" className="block text-sm font-medium text-white mb-2">
                    Fecha de ingreso
                  </label>
                  <input
                    id="fechaIngreso"
                    type="date"
                    value={fechaIngreso}
                    onChange={(e) => {
                      setFechaIngreso(e.target.value)
                      if (fieldErrors.fechaIngreso) {
                        setFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next.fechaIngreso
                          return next
                        })
                      }
                    }}
                    className={`block w-full px-3 py-3.5 border rounded-xl bg-white/5 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-green-400/50 transition-all hover:border-green-400/30 hover:bg-white/10 ${
                      fieldErrors.fechaIngreso ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                    }`}
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
                    onChange={(e) => {
                      setFechaEgreso(e.target.value)
                      if (fieldErrors.fechaEgreso) {
                        setFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next.fechaEgreso
                          return next
                        })
                      }
                    }}
                    className={`block w-full px-3 py-3.5 border rounded-xl bg-white/5 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-green-400/50 transition-all hover:border-green-400/30 hover:bg-white/10 ${
                      fieldErrors.fechaEgreso ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                    }`}
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
                  className="block w-full px-3 py-3.5 border rounded-xl bg-white/5 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-green-400/50 transition-all hover:border-green-400/30 hover:bg-white/10 border-white/20"
                >
                  {MOTIVO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-800">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-brand-300/80">
                  {MOTIVO_OPTIONS.find((x) => x.value === motivoSalidaPublico)?.help}{' '}
                  <span className="text-brand-200/70">Esto puede cambiar cesantía y/o preaviso.</span>
                </p>
                {fieldErrors.motivoSalida && <p className="mt-1 text-sm text-red-400">{fieldErrors.motivoSalida}</p>}
              </div>

              {showPreavisoToggle && (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-white font-medium">¿Ya laboraste el preaviso?</div>
                  <label className="inline-flex items-center gap-2 text-sm text-brand-200/90">
                    <input
                      type="checkbox"
                      checked={preavisoGozado}
                      onChange={(e) => setPreavisoGozado(e.target.checked)}
                      className="h-4 w-4 rounded border-white/30 bg-slate-900"
                    />
                    Sí
                  </label>
                </div>
              )}

              <div className="glass rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-white font-medium">RAP (opcional)</div>
                    <p className="text-sm text-brand-200/80 mt-1">
                      Si deseas, puedes incluir el monto acumulado para compensar la cesantía cuando aplique.
                    </p>
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
                  <div className="mt-4">
                    <label htmlFor="montoRapAcumulado" className="block text-sm font-medium text-white mb-2">
                      Monto acumulado RAP / Reserva laboral
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-brand-300 sm:text-sm">Lps.</span>
                      </div>
                      <input
                        id="montoRapAcumulado"
                        type="text"
                        value={montoRapAcumulado}
                        onChange={(e) => {
                          setMontoRapAcumulado(e.target.value)
                          if (fieldErrors.montoRapAcumulado) {
                            setFieldErrors((prev) => {
                              const next = { ...prev }
                              delete next.montoRapAcumulado
                              return next
                            })
                          }
                        }}
                        placeholder="0.00"
                        className={`block w-full pl-16 pr-3 py-3.5 border rounded-xl bg-white/5 backdrop-blur-sm text-white placeholder-brand-200/70 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-green-400/50 transition-all hover:border-green-400/30 hover:bg-white/10 ${
                          fieldErrors.montoRapAcumulado ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                        }`}
                      />
                    </div>
                    {fieldErrors.montoRapAcumulado && (
                      <p className="mt-1 text-sm text-red-400">{fieldErrors.montoRapAcumulado}</p>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-200 backdrop-blur-sm">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-400 shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
                >
                  {loading ? 'Calculando...' : 'Calcular prestaciones'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto py-3.5 px-6 border border-white/20 text-brand-100 hover:bg-white/10 rounded-xl transition-all"
                >
                  Limpiar
                </button>
              </div>
            </form>
          </div>

          <div className="glass-strong rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-purple-500/15 opacity-50 blur-xl pointer-events-none" />
            <div className="relative z-10">
              {!result && (
                <div className="text-sm text-brand-200/80">
                  Completa el formulario para ver el desglose. Si eres empresa, también puedes{' '}
                  <Link href="/activar" className="text-cyan-300 hover:text-cyan-200 underline decoration-white/20">
                    automatizar nómina
                  </Link>{' '}
                  y evitar cálculos manuales.
                </div>
              )}

              {result && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/15 rounded-xl p-5 border border-green-500/30 shadow-lg shadow-green-500/10">
                    <div className="text-sm text-green-200/90 font-medium mb-1">Total estimado a recibir</div>
                    <div className="text-3xl font-bold text-green-300">{formatCurrency(result.rubros.totalPagar)}</div>
                    <div className="text-xs text-green-200/70 mt-2">
                      Estimación basada en normativa laboral de Honduras (año comercial 360 días).
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-white mb-3">Desglose por concepto</h2>
                    <div className="space-y-3">
                      {breakdown.map((row) => (
                        <div key={row.key} className="glass rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-white font-medium flex items-center gap-2">
                                {row.label}
                                <Tooltip title={row.label} content={row.help}>
                                  <span className="text-xs text-brand-300">(info)</span>
                                </Tooltip>
                              </div>
                              <div className="text-xs text-brand-200/70 mt-1">
                                {row.key === 'rapAplicado' && !incluirRAP ? 'No incluido en el cálculo.' : ''}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-lg font-bold text-white">{formatCurrency(row.amount)}</div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="glass rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-semibold">Total</span>
                          <span className="text-xl font-bold text-white">{formatCurrency(result.rubros.totalPagar)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                    <div className="text-sm text-brand-200/90">
                      <div className="text-white font-semibold mb-2">Detalles de cálculo</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-brand-300/80">Salario base mensual:</span>{' '}
                          <span className="text-white">{formatCurrency(result.bases.salarioBaseMensual)}</span>
                        </div>
                        <div>
                          <span className="text-brand-300/80">Salario promedio mensual:</span>{' '}
                          <span className="text-white">{formatCurrency(result.bases.salarioPromedioMensual)}</span>
                        </div>
                        <div>
                          <span className="text-brand-300/80">Antigüedad (360):</span>{' '}
                          <span className="text-white">
                            {result.tiempos.anos}a {result.tiempos.meses}m {result.tiempos.dias}d
                          </span>
                        </div>
                        <div>
                          <span className="text-brand-300/80">Motivo (interno):</span>{' '}
                          <span className="text-white">{result.metadata.motivoSalida}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-brand-200/80">
                    Esta es una estimación basada en la Ley Laboral de Honduras. No sustituye asesoría legal.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/calculadora"
            className="text-sm text-brand-200/90 hover:text-white underline decoration-white/20 hover:decoration-white/40 transition-colors"
          >
            Ver todas las calculadoras →
          </Link>
        </div>
      </main>

      <CloudBackground />
      <DemoFooter />
    </div>
  )
}

