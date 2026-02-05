import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import MainHeader from '../components/MainHeader'
import DemoFooter from '../components/DemoFooter'
import dynamic from 'next/dynamic'
import { validateFormInputs, getAvailableYears } from '../lib/deduction-validator/client-validation'
import { getPageTitle } from '../lib/seo/title'
import { getPageDescription } from '../lib/seo/description'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import { generateWebPageSchema } from '../lib/seo/schema'

const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })

interface DeductionResult {
  grossSalary: number
  monthlyGrossSalary: number
  ihss: number
  ihssPercentage: number
  rap: number
  rapPercentage: number
  isr: number
  isrPercentage: number
  totalDeductions: number
  netSalary: number
  year: number
  paymentModality: 'quincenal' | 'mensual'
  constants: {
    minimumWage: number
    ihssCeiling: number
  }
}

interface TooltipProps {
  title: string
  content: string
  children: React.ReactNode
}

function Tooltip({ title, content, children }: TooltipProps) {
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
        <svg 
          className="w-4 h-4 ml-1" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
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
          <div className="absolute -top-2 left-4 md:left-auto md:right-4 w-4 h-4 bg-white/10 border-l border-t border-white/20 backdrop-blur-sm transform rotate-45" aria-hidden="true"></div>
        </div>
      )}
    </div>
  )
}

export default function CalculadoraDeduccionesPage() {
  const [salary, setSalary] = useState<string>('')
  const [paymentModality, setPaymentModality] = useState<'quincenal' | 'mensual'>('mensual')
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState<number>(currentYear)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [email, setEmail] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [result, setResult] = useState<DeductionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})
  const [emailSent, setEmailSent] = useState(false)

  // Generar años disponibles dinámicamente
  useEffect(() => {
    setAvailableYears(getAvailableYears(currentYear))
  }, [currentYear])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setEmailSent(false)
    setValidationErrors({})

    // Validación del lado del cliente antes de enviar
    const validation = validateFormInputs({
      salary,
      paymentModality,
      year,
      email
    })

    if (!validation.valid) {
      const errorsMap: { [key: string]: string } = {}
      validation.errors.forEach(err => {
        errorsMap[err.field] = err.message
      })
      setValidationErrors(errorsMap)
      
      // Mostrar primer error como error general
      if (validation.errors.length > 0) {
        setError(validation.errors[0].message)
      }
      return
    }

    const salaryNum = parseFloat(salary.replace(/[^\d.]/g, ''))
    setLoading(true)

    try {
      const response = await fetch('/api/public/calculate-deductions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          salary: salaryNum,
          paymentModality,
          year
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al calcular deducciones')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Error al calcular deducciones. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!email || !result) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un email válido')
      return
    }

    setSendingEmail(true)
    setError(null)

    try {
      const response = await fetch('/api/public/send-deduction-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          ...result,
          salary: parseFloat(salary.replace(/[^\d.]/g, ''))
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar el reporte por email')
      }

      setEmailSent(true)
    } catch (err: any) {
      setError(err.message || 'Error al enviar el reporte por email. Por favor intenta de nuevo.')
    } finally {
      setSendingEmail(false)
    }
  }

  const pageTitle = getPageTitle('calculator')
  const pageDescription = getPageDescription('calculator')
  const webPageSchema = generateWebPageSchema({
    url: '/calculadora-deducciones',
    title: pageTitle,
    description: pageDescription
  })

  return (
    <div className="min-h-screen bg-app pt-16 sm:pt-20 md:pt-24 relative">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content="calculadora IHSS RAP ISR Honduras, deducciones nómina, sin cálculos manuales, planilla Honduras, INFOP" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content="https://humano-sisu.com/calculadora-deducciones" />
        <link rel="canonical" href="https://humano-sisu.com/calculadora-deducciones" />
      </Head>
      <SchemaMarkup schema={webPageSchema} />

      <MainHeader enableScrollEffect={true} fixed={true} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-6 animate-fade-up-subtle">
            <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
              IHSS, RAP e ISR según ley
            </span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
              100% hondureño · Leyes vigentes
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
              Sin cálculos manuales
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            <span className="text-white block sm:inline">Deja de calcular IHSS, RAP e ISR a mano</span>
            <span className="text-brand-300 block sm:inline mt-2 sm:mt-1">Calculadora de deducciones Honduras</span>
          </h1>
          <p className="text-lg sm:text-xl text-brand-200/90 max-w-2xl mx-auto">
            Olvida las hojas de cálculo. Valida tus deducciones de ley (IHSS, RAP, INFOP) según normativa vigente. Herramienta gratuita y precisa.
          </p>
        </div>

        {/* Form Section */}
        <div className="glass-strong rounded-2xl shadow-2xl p-6 sm:p-8 mb-8 relative overflow-hidden">
          {/* Glowing border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 opacity-50 blur-xl pointer-events-none"></div>
          <form onSubmit={handleCalculate} className="space-y-6 relative z-10">
            {/* Salary Input */}
            <div>
              <label htmlFor="salary" className="block text-sm font-medium text-white mb-2">
                Salario {paymentModality === 'quincenal' ? 'Quincenal' : 'Mensual'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-brand-300 sm:text-sm">Lps.</span>
                </div>
                <input
                  type="text"
                  id="salary"
                  value={salary}
                  onChange={(e) => {
                    setSalary(e.target.value)
                    // Limpiar error de validación cuando el usuario escribe
                    if (validationErrors.salary) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.salary
                        return newErrors
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
              {validationErrors.salary && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.salary}</p>
              )}
              {!validationErrors.salary && (
                <p className="mt-1 text-sm text-brand-300/70">
                  Ingresa tu salario {paymentModality === 'quincenal' ? 'quincenal' : 'mensual'} antes de deducciones
                </p>
              )}
            </div>

            {/* Payment Modality */}
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                Modalidad de Pago
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentModality('quincenal')}
                  className={`py-3.5 px-4 rounded-xl border-2 transition-all font-medium ${
                    paymentModality === 'quincenal'
                      ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-lg shadow-cyan-500/20'
                      : 'border-white/20 bg-white/5 backdrop-blur-sm text-brand-200 hover:border-cyan-400/50 hover:bg-white/10'
                  }`}
                >
                  Quincenal
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentModality('mensual')}
                  className={`py-3.5 px-4 rounded-xl border-2 transition-all font-medium ${
                    paymentModality === 'mensual'
                      ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-lg shadow-cyan-500/20'
                      : 'border-white/20 bg-white/5 backdrop-blur-sm text-brand-200 hover:border-cyan-400/50 hover:bg-white/10'
                  }`}
                >
                  Mensual
                </button>
              </div>
            </div>

            {/* Year Selector */}
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-white mb-2">
                Año (opcional)
              </label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className={`block w-full px-3 py-3.5 border rounded-xl bg-white/5 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all hover:border-cyan-400/30 hover:bg-white/10 ${
                  validationErrors.year ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                }`}
              >
                {availableYears.length > 0 ? (
                  availableYears.map((y) => (
                    <option key={y} value={y} className="bg-slate-800">
                      {y}
                    </option>
                  ))
                ) : (
                  <option value={currentYear} className="bg-slate-800">
                    {currentYear}
                  </option>
                )}
              </select>
              {validationErrors.year && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.year}</p>
              )}
              {!validationErrors.year && (
                <p className="mt-1 text-sm text-brand-300/70">
                  Selecciona el año para validar deducciones de años anteriores
                </p>
              )}
            </div>

            {/* Email Input (Optional) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email (opcional)
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  // Limpiar error de validación cuando el usuario escribe
                  if (validationErrors.email) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev }
                      delete newErrors.email
                      return newErrors
                    })
                  }
                }}
                placeholder="tu@email.com"
                className={`block w-full px-3 py-3.5 border rounded-xl bg-white/5 backdrop-blur-sm text-white placeholder-brand-200/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all hover:border-cyan-400/30 hover:bg-white/10 ${
                  validationErrors.email ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                }`}
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.email}</p>
              )}
              {!validationErrors.email && (
                <p className="mt-1 text-sm text-brand-300/70">
                  Si proporcionas tu email, te enviaremos un reporte detallado en PDF
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-200 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Calculate Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Calculando...
                </span>
              ) : (
                'Calcular Deducciones'
              )}
            </button>
          </form>
        </div>

        {/* Results Section */}
        {result && (
          <div className="glass-strong rounded-2xl shadow-2xl p-6 sm:p-8 mb-8 relative overflow-hidden">
            {/* Glowing border effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-cyan-500/20 to-blue-500/20 opacity-50 blur-xl pointer-events-none"></div>
            <div className="relative z-10">
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Resultados del Cálculo</h2>
              <p className="text-brand-300/80 text-sm">
                Año: {result.year} | Modalidad: {result.paymentModality === 'quincenal' ? 'Quincenal' : 'Mensual'}
              </p>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Gross Salary */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:border-cyan-400/30 transition-all">
                <div className="text-sm text-brand-300/80 mb-2 font-medium">Salario Bruto</div>
                <div className="text-3xl font-bold text-white mb-2">{formatCurrency(result.grossSalary)}</div>
                {result.paymentModality === 'quincenal' && (
                  <div className="text-xs text-brand-400/70 mt-2 pt-2 border-t border-white/10">
                    Mensual equivalente: {formatCurrency(result.monthlyGrossSalary)}
                  </div>
                )}
              </div>

              {/* Net Salary */}
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-5 border border-green-500/30 hover:border-green-500/50 transition-all shadow-lg shadow-green-500/10">
                <div className="text-sm text-green-300 mb-2 font-medium">Salario Neto</div>
                <div className="text-3xl font-bold text-green-400 mb-2">{formatCurrency(result.netSalary)}</div>
                <div className="text-xs text-green-400/70 mt-2 pt-2 border-t border-green-500/20">
                  Después de todas las deducciones
                </div>
              </div>
            </div>

            {/* Deductions Breakdown */}
            <div className="space-y-3 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Desglose de Deducciones</h3>
              
              {/* IHSS */}
              <div className="glass rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">IHSS</span>
                    <Tooltip title="IHSS" content="Instituto Hondureño de Seguridad Social. Se calcula como el 5% del salario hasta el tope máximo establecido por ley.">
                      <span className="text-brand-300">(Instituto Hondureño de Seguridad Social)</span>
                    </Tooltip>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{formatCurrency(result.ihss)}</div>
                    <div className="text-sm text-brand-300">{result.ihssPercentage.toFixed(2)}%</div>
                  </div>
                </div>
              </div>

              {/* RAP */}
              <div className="glass rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">RAP</span>
                    <Tooltip title="RAP" content="Régimen de Ahorro para Pensiones. Se calcula como el 1.5% sobre el exceso del salario sobre el salario mínimo.">
                      <span className="text-brand-300">(Régimen de Ahorro para Pensiones)</span>
                    </Tooltip>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{formatCurrency(result.rap)}</div>
                    <div className="text-sm text-brand-300">{result.rapPercentage.toFixed(2)}%</div>
                  </div>
                </div>
              </div>

              {/* ISR */}
              <div className="glass rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">ISR</span>
                    <Tooltip title="ISR" content="Impuesto sobre la Renta. Se calcula mediante una tabla progresiva según los rangos de ingresos establecidos por la ley.">
                      <span className="text-brand-300">(Impuesto sobre la Renta)</span>
                    </Tooltip>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{formatCurrency(result.isr)}</div>
                    <div className="text-sm text-brand-300">{result.isrPercentage.toFixed(2)}%</div>
                  </div>
                </div>
              </div>

              {/* Total Deductions */}
              <div className="glass rounded-xl p-4 border border-red-500/30 backdrop-blur-sm bg-gradient-to-br from-red-500/10 to-orange-500/5">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold">Total de Deducciones</span>
                  <div className="text-xl font-bold text-red-400">{formatCurrency(result.totalDeductions)}</div>
                </div>
              </div>
            </div>

            {/* Trust Indicator */}
            <div className="glass rounded-xl p-4 border border-blue-500/30 backdrop-blur-sm bg-gradient-to-r from-blue-500/10 to-cyan-500/5 mb-6">
              <p className="text-sm text-blue-300 text-center font-medium">
                ✓ Cálculos basados en leyes vigentes de Honduras
              </p>
              <p className="text-xs text-blue-400/70 text-center mt-1">
                Salario mínimo: {formatCurrency(result.constants.minimumWage)} | 
                Tope IHSS: {formatCurrency(result.constants.ihssCeiling)}
              </p>
            </div>

            {/* Email Section */}
            {email && !emailSent && (
              <div className="mb-6">
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  {sendingEmail ? 'Enviando reporte por email...' : 'Enviar Reporte Detallado por Email'}
                </button>
              </div>
            )}

            {emailSent && (
              <div className="glass rounded-xl p-4 border border-green-500/50 backdrop-blur-sm bg-gradient-to-r from-green-500/20 to-emerald-500/10 mb-6 text-green-200 text-center">
                ✓ Reporte enviado exitosamente a {email}
              </div>
            )}

            {/* Conversion CTA - alineado con mensajes ganadores Google Ads */}
            <div className="glass-strong rounded-xl p-6 border border-cyan-500/30 backdrop-blur-sm bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 text-center relative overflow-hidden">
              {/* Glowing border effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 opacity-50 blur-xl pointer-events-none"></div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white mb-2">
                  Control de asistencia y nómina en un solo lugar: Sin cálculos manuales, sin errores.
                </h3>
                <p className="text-brand-200/90 mb-4">
                  Integra tus biométricos con nuestro software 100% hondureño. Del cálculo al comprobante en segundos. Automatiza IHSS, RAP e ISR.
                </p>
                <Link
                  href="/activar"
                  className="inline-block py-3 px-8 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Activar gratis hoy — Sin tarjeta de crédito
                </Link>
              </div>
            </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="relative glass-strong rounded-2xl shadow-2xl p-6 sm:p-8 text-center overflow-hidden">
          {/* Glowing border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 opacity-50 blur-xl pointer-events-none"></div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-white mb-4">¿Automatizamos tu nómina?</h3>
            <p className="text-brand-200/90 mb-6">
              Olvida las hojas de cálculo. Software de RH 100% hondureño que integra biométrico, nómina y deducciones de ley (IHSS, RAP, INFOP). Activación inmediata, soporte en tu país.
            </p>
            <Link
              href="/activar"
              className="inline-block py-2.5 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Activar gratis hoy — Sin tarjeta
            </Link>
          </div>
        </div>
      </main>

      <CloudBackground />
      <DemoFooter />
    </div>
  )
}

