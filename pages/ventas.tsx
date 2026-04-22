import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  CheckCircleIcon,
  ArrowLeftIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon,
  ClockIcon,
  DocumentTextIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardTitle } from '../components/ui/card'
import MainHeader from '../components/MainHeader'
import type { QuotationQuote, QuotationRequest, QuotationResponse } from '../lib/ventas/types'
import { formatMoney } from '../lib/ventas/pricing'
import type { CountryCode } from '../lib/country/supported'
import { isCountryCode } from '../lib/country/supported'

const COUNTRY_LABEL: Record<CountryCode, string> = {
  HND: 'Honduras',
  SLV: 'El Salvador',
  GTM: 'Guatemala',
}

interface ValidationErrors {
  contact_email?: string
  company_name?: string
  employees_count?: string
  terminals_count?: string
  country_code?: string
  submit?: string
}

function computeVentasErrors(fd: QuotationRequest): ValidationErrors {
  const e: ValidationErrors = {}
  const email = (fd.contact_email || '').trim()
  if (!email) e.contact_email = 'Indique un correo; ahí le enviamos la respuesta.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.contact_email = 'Correo no válido.'

  const company = (fd.company_name || '').trim()
  if (!company) e.company_name = 'Nombre de empresa obligatorio.'
  else if (company.length < 2) e.company_name = 'Nombre demasiado corto.'
  else if (company.length > 100) e.company_name = 'Máximo 100 caracteres.'

  const emp = Number(fd.employees_count)
  if (!Number.isFinite(emp) || emp < 1 || emp > 200) e.employees_count = 'Indique entre 1 y 200 empleados.'

  const cc = fd.country_code
  if (!cc || !isCountryCode(cc)) {
    e.country_code = 'Seleccione el país donde opera la empresa (Honduras, El Salvador o Guatemala).'
  }

  const t = Number(fd.terminals_count)
  if (!Number.isFinite(t) || t < 1) e.terminals_count = 'Indique cuántos terminales necesita.'
  else if (t > 3) {
    e.terminals_count =
      'Más de tres terminales va cotización aparte (tarifa de hardware). Escríbanos o elija hasta 3.'
  }

  return e
}

export default function VentasPage() {
  const CloudBackground = useMemo(
    () => dynamic(() => import('../components/CloudBackground'), { ssr: false }),
    []
  )

  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [quote, setQuote] = useState<QuotationQuote | null>(null)

  const [formData, setFormData] = useState<QuotationRequest>({
    contact_email: '',
    contact_name: '',
    company_name: '',
    phone: '',
    country_code: 'HND',
    employees_count: 1,
    billing_modality: 'annual',
    terminals_count: 1,
    sector_rubro: '',
    coupon_code: '',
    consent_newsletter: true,
  })

  const salesWhatsApp = (process.env.NEXT_PUBLIC_SALES_WHATSAPP || '').trim()
  const whatsappUrl = useMemo(() => {
    if (!salesWhatsApp) return ''
    const normalized = salesWhatsApp.replace(/[^\d]/g, '')
    if (!normalized) return ''
    const pais = formData.country_code && isCountryCode(formData.country_code)
      ? COUNTRY_LABEL[formData.country_code]
      : ''
    const msg = encodeURIComponent(
      `Hola. Solicité cotización en humanosisu.net — ${formData.company_name?.trim() || 'mi empresa'}, ${Number(formData.employees_count)} empleados${pais ? `, ${pais}` : ''}. Quiero revisar alcance e implementación.`
    )
    return `https://wa.me/${normalized}?text=${msg}`
  }, [salesWhatsApp, formData.company_name, formData.employees_count, formData.country_code])

  useEffect(() => {
    setErrors(computeVentasErrors(formData))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInputChange = (field: keyof QuotationRequest, value: string | boolean | number) => {
    const fd = { ...formData, [field]: value } as QuotationRequest
    setFormData(fd)
    setErrors((prev) => {
      const next = computeVentasErrors(fd)
      return prev.submit ? { ...next, submit: undefined } : next
    })
  }

  const handleSubmit = async () => {
    const all = computeVentasErrors(formData)
    if (Object.keys(all).length > 0) {
      setErrors(all)
      const first = Object.keys(all)[0]
      const el = document.querySelector(`[name="${first}"]`) as HTMLElement | null
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.focus()
      }
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const payload: QuotationRequest = {
        contact_email: formData.contact_email.trim(),
        contact_name: formData.contact_name?.trim() || '',
        company_name: formData.company_name?.trim() || '',
        phone: formData.phone?.trim() || '',
        country_code: isCountryCode(formData.country_code) ? formData.country_code : 'HND',
        employees_count: Number(formData.employees_count),
        billing_modality: formData.billing_modality || 'annual',
        terminals_count: Number(formData.terminals_count) || 1,
        sector_rubro: formData.sector_rubro?.trim() || '',
        coupon_code: formData.coupon_code?.trim() || '',
        consent_newsletter: formData.consent_newsletter === true,
      }

      const resp = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = (await resp.json()) as QuotationResponse | { error?: string }
      if (!resp.ok) {
        setErrors({ submit: (data as any)?.error || 'No se pudo completar la solicitud. Intente de nuevo.' })
        return
      }

      setQuote((data as QuotationResponse).quote || null)
      setIsSuccess(true)
    } catch (e) {
      setErrors({ submit: 'No se pudo enviar. Revise su conexión e intente de nuevo.' })
    } finally {
      setIsLoading(false)
    }
  }

  const countryNameSuccess =
    formData.country_code && isCountryCode(formData.country_code)
      ? COUNTRY_LABEL[formData.country_code]
      : ''

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-app relative">
        <CloudBackground />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="max-w-2xl mx-auto text-center pt-20">
            <div className="mb-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircleIcon className="h-12 w-12 text-green-400" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">
                ¡Propuesta en camino!
              </h1>
              <p className="text-xl text-brand-300 mb-8">
                Revise la bandeja de <strong>{formData.contact_email}</strong> (incluyendo spam). Hemos enviado el detalle de su cotización en PDF.
              </p>
              {countryNameSuccess && (
                <p className="text-sm text-brand-400 -mt-4 mb-8">
                  Legislación aplicada: <strong className="text-cyan-100/90">{countryNameSuccess}</strong>
                </p>
              )}
            </div>

            {quote && (
              <Card variant="glass" className="mb-8">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold text-white mb-4">Resumen de Inversión</h2>
                  <div className="space-y-2 text-brand-200 text-left">
                    <p>
                      <strong>Rango tarifario:</strong> {quote.tier.min_employees}–{quote.tier.max_employees} empleados
                    </p>
                    {quote.billing_modality === 'monthly' ? (
                      <>
                        <p>
                          <strong>Total mensual estimado:</strong> {formatMoney(quote.currency, quote.monthly_total)}
                        </p>
                        <p className="text-sm text-cyan-100/70">
                          Incluye software mensual y continuidad de hardware según terminales indicadas.
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          <strong>Total anual (software):</strong> {formatMoney(quote.currency, quote.annual_total)}
                        </p>
                        <p className="text-sm text-cyan-100/70">
                          Modalidad anual: hasta tres terminales cubiertas en esta propuesta. Declaradas:{' '}
                          <strong>{quote.terminals_count}</strong>{' '}
                          {quote.terminals_count === 1 ? 'terminal' : 'terminales'}.
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {whatsappUrl && (
              <Card variant="glass" className="mb-8 border-emerald-400/20">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold text-white mb-2">¿Listo para dejar el trabajo manual?</h2>
                  <p className="text-sm text-cyan-100/80 mb-6">
                    Hablemos sobre cómo implementar la biometría y parametrizar la nómina según las particularidades de su operación.
                  </p>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 font-semibold transition-colors"
                  >
                    Hablar con un asesor por WhatsApp
                  </a>
                  <p className="text-xs text-white/60 text-center mt-3">
                    También puede responder directamente al correo donde llegó la propuesta.
                  </p>
                </CardContent>
              </Card>
            )}

            <Link href="/" className="inline-flex items-center text-brand-300 hover:text-white transition-colors">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <MainHeader enableScrollEffect={false} fixed={true} />
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8 pt-24 relative z-10">
        <Card className="w-full max-w-7xl bg-slate-800/40 backdrop-blur-xl border-white/20 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 opacity-50 blur-xl"></div>
          <CardContent className="p-6 sm:p-8 lg:p-12 relative z-10">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-start">
              <div className="lg:col-span-6 text-center lg:text-left">
                <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300 mb-6">
                  <ShieldCheckIcon className="h-4 w-4 mr-2 shrink-0" aria-hidden />
                  Normativa Local: Honduras · El Salvador · Guatemala
                </div>

                <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
                  El fin del <span className="text-emerald-400">trabajo manual</span> empieza aquí
                </h1>

                <p className="text-lg text-cyan-100/90 mb-8 leading-relaxed">
                  Obtén un presupuesto exacto para tu empresa. Automatiza asistencia, deducciones y expedientes sin tener que contratar personal adicional solo para "pasar datos".
                </p>

                <div className="space-y-6 text-left mb-8">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <ClockIcon className="h-5 w-5 text-emerald-400" aria-hidden />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Detén la fuga silenciosa</h3>
                      <p className="text-sm text-cyan-100/70 leading-relaxed">
                        Biometría inteligente para un registro exacto. Evidencia la puntualidad de tu equipo y acaba con el robo de tiempo sin revisión manual.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <ChartBarIcon className="h-5 w-5 text-emerald-400" aria-hidden />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Nómina "Cero Errores"</h3>
                      <p className="text-sm text-cyan-100/70 leading-relaxed">
                        Dile adiós al infierno de Excel. Cálculos y deducciones (IHSS, RAP, ISR) 100% automatizados según las leyes de tu país.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <DocumentTextIcon className="h-5 w-5 text-emerald-400" aria-hidden />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Autogestión de expedientes</h3>
                      <p className="text-sm text-cyan-100/70 leading-relaxed">
                        Reemplaza el papeleo con constancias inmediatas, envío automático de vouchers y trazabilidad completa en la nube.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-emerald-500/80 bg-white/5 p-5 rounded-r-xl">
                  <p className="text-sm text-cyan-100/85 leading-relaxed">
                    Al seleccionar tu país de operación, parametrizamos la cotización basándonos en tu jurisdicción laboral local.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-6 bg-slate-900/50 rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl">
                <div className="mb-8">
                  <CardTitle className="text-2xl font-bold text-white mb-2">
                    Configura tu ecosistema
                  </CardTitle>
                  <p className="text-cyan-100/80 text-sm leading-relaxed">
                    Nuestra plataforma calculará la inversión exacta y enviará un PDF listo para revisión gerencial.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label htmlFor="ventas-country" className="block text-white font-medium mb-2 text-sm">
                      País de operación *
                    </label>
                    <select
                      id="ventas-country"
                      name="country_code"
                      value={formData.country_code || 'HND'}
                      onChange={(e) => handleInputChange('country_code', e.target.value as CountryCode)}
                      className={`w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all hover:bg-white/10 ${
                        errors.country_code ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                      }`}
                    >
                      <option value="HND" className="bg-slate-800">Honduras</option>
                      <option value="SLV" className="bg-slate-800">El Salvador</option>
                      <option value="GTM" className="bg-slate-800">Guatemala</option>
                    </select>
                    {errors.country_code && (
                      <p className="text-red-400 text-xs mt-2">{errors.country_code}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white font-medium mb-2 text-sm">Modalidad de pago</label>
                      <select
                        name="billing_modality"
                        value={formData.billing_modality || 'annual'}
                        onChange={(e) => handleInputChange('billing_modality', e.target.value)}
                        className="w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all hover:bg-white/10"
                      >
                        <option value="annual" className="bg-slate-800">Anual (Recomendado)</option>
                        <option value="monthly" className="bg-slate-800">Mensual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-white font-medium mb-2 text-sm">Terminales necesarias</label>
                      <select
                        name="terminals_count"
                        value={Number(formData.terminals_count) || 1}
                        onChange={(e) => handleInputChange('terminals_count', parseInt(e.target.value, 10) || 1)}
                        className={`w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all hover:bg-white/10 ${
                          errors.terminals_count ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                        }`}
                      >
                        <option value={1} className="bg-slate-800">1 terminal</option>
                        <option value={2} className="bg-slate-800">2 terminales</option>
                        <option value={3} className="bg-slate-800">3 terminales</option>
                        <option value={4} className="bg-slate-800">Más de 3 (cotización especial)</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-xs text-brand-300 bg-black/20 p-3 rounded-lg border border-white/10 leading-relaxed">
                    {(formData.billing_modality || 'annual') === 'monthly' ? (
                      <p>
                        <strong>Plan Mensual:</strong> Suma continuidad de hardware por terminal (hasta tres). Más de tres requiere ajuste especial.
                      </p>
                    ) : (
                      <p>
                        <strong>Plan Anual:</strong> Incluye hasta 3 terminales biométricas cubiertas en la propuesta inicial.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2 text-sm">Nombre de la empresa *</label>
                    <input
                      name="company_name"
                      type="text"
                      value={formData.company_name || ''}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      className={`w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all ${
                        errors.company_name ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                      } hover:bg-white/10`}
                      placeholder="Ej. Comercializadora del Norte S.A."
                    />
                    {errors.company_name && <p className="text-red-400 text-xs mt-2">{errors.company_name}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white font-medium mb-2 text-sm">
                        Su nombre <span className="text-white/40 font-normal text-xs">(opcional)</span>
                      </label>
                      <input
                        name="contact_name"
                        type="text"
                        value={formData.contact_name || ''}
                        onChange={(e) => handleInputChange('contact_name', e.target.value)}
                        className="w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all hover:bg-white/10"
                        placeholder="Nombre y apellido"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-medium mb-2 text-sm">
                        Teléfono / WhatsApp <span className="text-white/40 font-normal text-xs">(opcional)</span>
                      </label>
                      <input
                        name="phone"
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all hover:bg-white/10"
                        placeholder="+504 9999-9999"
                        inputMode="tel"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2 text-sm">Correo corporativo *</label>
                    <input
                      name="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => handleInputChange('contact_email', e.target.value)}
                      className={`w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all ${
                        errors.contact_email ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                      } hover:bg-white/10`}
                      placeholder="admin@miempresa.com"
                      required
                    />
                    {errors.contact_email && <p className="text-red-400 text-xs mt-2">{errors.contact_email}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white font-medium mb-2 text-sm">Empleados en planilla *</label>
                      <input
                        name="employees_count"
                        type="number"
                        min={1}
                        max={200}
                        value={Number(formData.employees_count)}
                        onChange={(e) => handleInputChange('employees_count', parseInt(e.target.value, 10) || 1)}
                        className={`w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all ${
                          errors.employees_count ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                        } hover:bg-white/10`}
                        required
                      />
                      {errors.employees_count && <p className="text-red-400 text-xs mt-2">{errors.employees_count}</p>}
                    </div>
                    <div>
                      <label className="block text-white font-medium mb-2 text-sm">
                        Rubro <span className="text-white/40 font-normal text-xs">(opcional)</span>
                      </label>
                      <select
                        name="sector_rubro"
                        value={formData.sector_rubro || ''}
                        onChange={(e) => handleInputChange('sector_rubro', e.target.value)}
                        className="w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all hover:bg-white/10"
                      >
                        <option value="" className="bg-slate-800">Seleccionar…</option>
                        <option value="restaurante" className="bg-slate-800">Restaurante</option>
                        <option value="comida_rapida" className="bg-slate-800">Comida rápida</option>
                        <option value="cafeteria_panaderia" className="bg-slate-800">Cafetería / Panadería</option>
                        <option value="bar" className="bg-slate-800">Bar</option>
                        <option value="hotel" className="bg-slate-800">Hotel</option>
                        <option value="retail" className="bg-slate-800">Retail</option>
                        <option value="supermercado" className="bg-slate-800">Supermercado</option>
                        <option value="logistica" className="bg-slate-800">Logística</option>
                        <option value="manufactura" className="bg-slate-800">Manufactura</option>
                        <option value="salud" className="bg-slate-800">Salud</option>
                        <option value="educacion" className="bg-slate-800">Educación</option>
                        <option value="call_center" className="bg-slate-800">Call center</option>
                        <option value="servicios" className="bg-slate-800">Servicios profesionales</option>
                        <option value="otro" className="bg-slate-800">Otro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2 text-sm">Cupón (opcional)</label>
                    <input
                      name="coupon_code"
                      type="text"
                      value={formData.coupon_code || ''}
                      onChange={(e) => handleInputChange('coupon_code', e.target.value)}
                      className="w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all hover:bg-white/10"
                      placeholder="Código si aplica"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading || Object.keys(errors).length > 0}
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold inline-flex items-center justify-center transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Calculando cotización…
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="h-5 w-5 mr-2" aria-hidden />
                        Recibir propuesta en PDF
                      </>
                    )}
                  </button>

                  {errors.submit && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                      <p className="text-red-400 text-sm font-medium text-center">{errors.submit}</p>
                    </div>
                  )}

                  {!errors.submit && (
                    <p className="text-white/45 text-xs text-center leading-relaxed mt-4">
                      Al enviar, autorizas recibir la propuesta automatizada en tu correo. Todo el cálculo de deducciones y precios se ejecuta según el país seleccionado.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
