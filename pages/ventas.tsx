import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { CheckCircleIcon, ArrowLeftIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { Card, CardContent, CardTitle } from '../components/ui/card'
import MainHeader from '../components/MainHeader'
import type { QuotationQuote, QuotationRequest, QuotationResponse } from '../lib/ventas/types'
import { formatMoney } from '../lib/ventas/pricing'

interface ValidationErrors {
  contact_email?: string
  company_name?: string
  employees_count?: string
  terminals_count?: string
  submit?: string
}

function computeVentasErrors(fd: QuotationRequest): ValidationErrors {
  const e: ValidationErrors = {}
  const email = (fd.contact_email || '').trim()
  if (!email) e.contact_email = 'Indique un correo. Ahí enviamos la cotización y el PDF.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.contact_email = 'Correo no válido.'

  const company = (fd.company_name || '').trim()
  if (!company) e.company_name = 'Nombre de empresa obligatorio.'
  else if (company.length < 2) e.company_name = 'Nombre demasiado corto.'
  else if (company.length > 100) e.company_name = 'Máximo 100 caracteres.'

  const emp = Number(fd.employees_count)
  if (!Number.isFinite(emp) || emp < 1 || emp > 200) e.employees_count = 'Indique entre 1 y 200 empleados.'

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
    const msg = encodeURIComponent(
      `Hola. Solicité cotización en humanosisu.net (${formData.company_name?.trim() || 'mi empresa'}, ${Number(formData.employees_count)} empleados). Quiero revisar alcance e implementación.`
    )
    return `https://wa.me/${normalized}?text=${msg}`
  }, [salesWhatsApp, formData.company_name, formData.contact_name, formData.employees_count])

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
        setErrors({ submit: (data as any)?.error || 'Error al procesar tu solicitud. Intenta de nuevo.' })
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
                Cotización enviada
              </h1>
              <p className="text-xl text-brand-300 mb-8">
                Revise <strong>{formData.contact_email}</strong>, incluida la carpeta de spam si no ve el mensaje en minutos.
              </p>
            </div>

            {quote && (
              <Card variant="glass" className="mb-8">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold text-white mb-4">Detalle</h2>
                  <div className="space-y-2 text-brand-200">
                    <p>
                      <strong>Rango:</strong> {quote.tier.min_employees}–{quote.tier.max_employees} empleados
                    </p>
                    {quote.billing_modality === 'monthly' ? (
                      <>
                        <p>
                          <strong>Total mensual (estimado):</strong> {formatMoney(quote.currency, quote.monthly_total)}
                        </p>
                        <p className="text-sm text-cyan-100/70">
                          Software mensual más continuidad de hardware según terminales elegidos.
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          <strong>Total anual (software):</strong> {formatMoney(quote.currency, quote.annual_total)}
                        </p>
                        <p className="text-sm text-cyan-100/70">
                          Modalidad anual: hasta tres terminales cubiertas. Solicitaste {quote.terminals_count}{' '}
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
                  <h2 className="text-2xl font-bold text-white mb-2">¿Necesita afinar alcance?</h2>
                  <p className="text-sm text-cyan-100/80 mb-6">
                    Un asesor puede aclarar asistencia, nómina e implementación según su operación.
                  </p>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 font-semibold transition-colors"
                  >
                    WhatsApp comercial
                  </a>
                  <p className="text-xs text-white/60 text-center mt-3">
                    También puede responder el correo con la cotización adjunta.
                  </p>
                </CardContent>
              </Card>
            )}

            <Link href="/" className="inline-flex items-center text-brand-300 hover:text-white transition-colors">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Volver a inicio
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
        <Card className="w-full max-w-5xl bg-slate-800/40 backdrop-blur-xl border-white/20 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 opacity-50 blur-xl"></div>
          <CardContent className="p-6 sm:p-8 lg:p-12 relative z-10">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
              <div className="text-center lg:text-left">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-[1.05]">
                  Cotización <span className="text-emerald-400">SISU</span>
                </h1>
                <p className="text-lg md:text-xl text-cyan-100/95 mb-6 max-w-2xl leading-relaxed">
                  Asistencia, nómina y reportes para empresas en <strong>Honduras, El Salvador y Guatemala</strong>.
                  Indique plantilla aproximada y modalidad: le enviamos el desglose y el PDF al correo.
                </p>
                <ul className="text-sm text-cyan-200/95 space-y-2 mb-6 max-w-xl">
                  <li className="flex gap-2"><span className="text-emerald-400 shrink-0">·</span> Monto según empleados y opciones que elija (no en el navegador).</li>
                  <li className="flex gap-2"><span className="text-emerald-400 shrink-0">·</span> Sin pago por pedir la cotización.</li>
                  <li className="flex gap-2"><span className="text-emerald-400 shrink-0">·</span> PDF para uso interno o gestión.</li>
                </ul>
                <div className="bg-white/5 border border-white/15 rounded-2xl p-5">
                  <p className="font-medium text-white text-sm">Qué enviamos por correo</p>
                  <ul className="mt-3 space-y-2 text-sm text-cyan-100/85">
                    <li>Cotización con montos aplicables.</li>
                    <li>PDF adjunto con el mismo detalle.</li>
                    <li>Datos de contacto si quiere coordinar implementación.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-t border-white/10 pt-6">
                  <CardTitle className="text-xl md:text-2xl font-bold text-white mb-3">
                    Datos para armar la cotización
                  </CardTitle>
                  <p className="text-cyan-100/80 text-sm leading-relaxed">
                    Complete los campos. La respuesta llega al correo indicado; si hay cupón válido, se aplica al total.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white font-medium mb-2">Modalidad</label>
                      <select
                        name="billing_modality"
                        value={formData.billing_modality || 'annual'}
                        onChange={(e) => handleInputChange('billing_modality', e.target.value)}
                        className="w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all hover:border-cyan-400/30 hover:bg-white/10"
                      >
                        <option value="annual" className="bg-slate-800">Anual</option>
                        <option value="monthly" className="bg-slate-800">Mensual</option>
                      </select>
                      <p className="text-brand-400 text-sm mt-2">
                        <strong>Anual:</strong> hasta tres terminales cubiertas; más de tres, cotización aparte (hardware).
                      </p>
                    </div>
                    <div>
                      <label className="block text-white font-medium mb-2">Terminales</label>
                      <select
                        name="terminals_count"
                        value={Number(formData.terminals_count) || 1}
                        onChange={(e) => handleInputChange('terminals_count', parseInt(e.target.value, 10) || 1)}
                        className={`w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all hover:border-cyan-400/30 hover:bg-white/10 ${
                          errors.terminals_count ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                        }`}
                      >
                        <option value={1} className="bg-slate-800">1 terminal</option>
                        <option value={2} className="bg-slate-800">2 terminales</option>
                        <option value={3} className="bg-slate-800">3 terminales</option>
                        <option value={4} className="bg-slate-800">Más de 3 (cotización especial)</option>
                      </select>
                      {(formData.billing_modality || 'annual') === 'monthly' ? (
                        <p className="text-brand-400 text-sm mt-2">
                          <strong>Mensual:</strong> suma continuidad de hardware por terminal (tabla hasta tres). Más de tres
                          va aparte.
                        </p>
                      ) : (
                        <p className="text-brand-400 text-sm mt-2">
                          Elija 1 a 3 si entran en el paquete anual; si necesita más, seleccione la opción especial o
                          escríbanos.
                        </p>
                      )}
                      {errors.terminals_count && (
                        <p className="text-red-400 text-sm mt-2 font-medium">{errors.terminals_count}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Nombre de la empresa *</label>
                    <input
                      name="company_name"
                      type="text"
                      value={formData.company_name || ''}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      className={`w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all ${
                        errors.company_name ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                      } hover:border-cyan-400/30 hover:bg-white/10`}
                      placeholder="Mi Empresa S.A."
                    />
                    {errors.company_name && <p className="text-red-400 text-sm mt-2 font-medium">{errors.company_name}</p>}
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Tu nombre</label>
                    <input
                      name="contact_name"
                      type="text"
                      value={formData.contact_name || ''}
                      onChange={(e) => handleInputChange('contact_name', e.target.value)}
                      className="w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all hover:border-cyan-400/30 hover:bg-white/10"
                      placeholder="María González"
                    />
                    <p className="text-brand-400 text-sm mt-2">(opcional)</p>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Email *</label>
                    <input
                      name="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => handleInputChange('contact_email', e.target.value)}
                      className={`w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all ${
                        errors.contact_email ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                      } hover:border-cyan-400/30 hover:bg-white/10`}
                      placeholder="admin@miempresa.com"
                      required
                    />
                    {errors.contact_email && <p className="text-red-400 text-sm mt-2 font-medium">{errors.contact_email}</p>}
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Teléfono / WhatsApp</label>
                    <input
                      name="phone"
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all hover:border-brand-500/30 hover:bg-white/10"
                      placeholder="+504 9999-9999"
                      inputMode="tel"
                    />
                    <p className="text-brand-400 text-sm mt-2">(opcional)</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white font-medium mb-2"># empleados *</label>
                      <input
                        name="employees_count"
                        type="number"
                        min={1}
                        max={200}
                        value={Number(formData.employees_count)}
                        onChange={(e) => handleInputChange('employees_count', parseInt(e.target.value, 10) || 1)}
                        className={`w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all ${
                          errors.employees_count ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                        } hover:border-cyan-400/30 hover:bg-white/10`}
                        required
                      />
                      {errors.employees_count && <p className="text-red-400 text-sm mt-2 font-medium">{errors.employees_count}</p>}
                    </div>
                    <div>
                      <label className="block text-white font-medium mb-2">
                        Sector o rubro <span className="text-cyan-300 text-sm">(opcional)</span>
                      </label>
                      <select
                        name="sector_rubro"
                        value={formData.sector_rubro || ''}
                        onChange={(e) => handleInputChange('sector_rubro', e.target.value)}
                        className="w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all hover:border-cyan-400/30 hover:bg-white/10"
                      >
                        <option value="" className="bg-slate-800">Seleccionar...</option>
                        <option value="restaurante" className="bg-slate-800">Restaurante</option>
                        <option value="comida_rapida" className="bg-slate-800">Comida rápida (QSR)</option>
                        <option value="cafeteria_panaderia" className="bg-slate-800">Cafetería / Panadería</option>
                        <option value="bar" className="bg-slate-800">Bar</option>
                        <option value="hotel" className="bg-slate-800">Hotel</option>
                        <option value="retail" className="bg-slate-800">Retail / Tienda</option>
                        <option value="supermercado" className="bg-slate-800">Supermercado</option>
                        <option value="logistica" className="bg-slate-800">Logística / Distribución</option>
                        <option value="manufactura" className="bg-slate-800">Manufactura</option>
                        <option value="salud" className="bg-slate-800">Clínica / Salud</option>
                        <option value="educacion" className="bg-slate-800">Educación</option>
                        <option value="call_center" className="bg-slate-800">Call Center</option>
                        <option value="servicios" className="bg-slate-800">Servicios profesionales</option>
                        <option value="otro" className="bg-slate-800">Otro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Cupón (opcional)</label>
                    <input
                      name="coupon_code"
                      type="text"
                      value={formData.coupon_code || ''}
                      onChange={(e) => handleInputChange('coupon_code', e.target.value)}
                      className="w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all hover:border-cyan-400/30 hover:bg-white/10"
                      placeholder="Código, si cuenta con uno"
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={isLoading || Object.keys(errors).length > 0}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-xl font-semibold inline-flex items-center justify-center transition-all shadow-lg shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed text-lg hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Enviando…
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="h-5 w-5 mr-2" /> Enviar cotización
                      </>
                    )}
                  </button>

                  {errors.submit && (
                    <div className="error-message bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                      <p className="text-red-400 text-sm font-medium text-center">{errors.submit}</p>
                    </div>
                  )}

                  {!errors.submit && (
                    <p className="text-brand-400 text-xs text-center">
                      Al enviar autoriza contacto comercial vinculado a esta solicitud. El importe lo calcula el sistema en
                      servidor, no en el navegador.
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

