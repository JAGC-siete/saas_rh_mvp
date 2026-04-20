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
  submit?: string
}

function computeVentasErrors(fd: QuotationRequest): ValidationErrors {
  const e: ValidationErrors = {}
  const email = (fd.contact_email || '').trim()
  if (!email) e.contact_email = '✉️ Este campo es obligatorio. Enviaremos la cotización a este correo.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.contact_email = '✉️ El formato del email no es válido.'

  const company = (fd.company_name || '').trim()
  if (!company) e.company_name = '🏢 Este campo es obligatorio. Ingresa el nombre de tu empresa.'
  else if (company.length < 2) e.company_name = '🏢 El nombre de la empresa debe tener al menos 2 caracteres.'
  else if (company.length > 100) e.company_name = '🏢 El nombre de la empresa no puede tener más de 100 caracteres.'

  const emp = Number(fd.employees_count)
  if (!Number.isFinite(emp) || emp < 1 || emp > 200) e.employees_count = '👥 El número de empleados debe estar entre 1 y 200.'

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

  const salesWhatsApp = (process.env.NEXT_PUBLIC_SALES_WHATSAPP || '').trim()
  const whatsappUrl = useMemo(() => {
    if (!salesWhatsApp) return ''
    const normalized = salesWhatsApp.replace(/[^\d]/g, '')
    if (!normalized) return ''
    const msg = encodeURIComponent(
      `Hola, soy ${formData.contact_name?.trim() || 'un prospecto'} de ${formData.company_name?.trim() || 'mi empresa'}. ` +
      `Solicité mi cotización en SISU. ¿Me ayudas a confirmar el plan ideal para ${Number(formData.employees_count)} empleados?`
    )
    return `https://wa.me/${normalized}?text=${msg}`
  }, [salesWhatsApp, formData.company_name, formData.contact_name, formData.employees_count])

  const [formData, setFormData] = useState<QuotationRequest>({
    contact_email: '',
    contact_name: '',
    company_name: '',
    phone: '',
    employees_count: 1,
    terminals_count: 0,
    tipo_establecimiento: '',
    coupon_code: '',
    consent_newsletter: true,
  })

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
        tipo_establecimiento: formData.tipo_establecimiento?.trim() || '',
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
      setErrors({ submit: '❌ Error de conexión. Por favor, verifica tu internet e intenta de nuevo.' })
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
                Cotización enviada a su correo
              </h1>
              <p className="text-xl text-brand-300 mb-8">
                Enviamos la cotización a <strong>{formData.contact_email}</strong>. Si no la ves en unos minutos, revisa spam.
              </p>
            </div>

            {quote && (
              <Card variant="glass" className="mb-8">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold text-white mb-4">Resumen</h2>
                  <div className="space-y-2 text-brand-200">
                    <p>
                      <strong>Rango:</strong> {quote.tier.min_employees}–{quote.tier.max_employees} empleados
                    </p>
                    <p>
                      <strong>Subtotal:</strong> {formatMoney(quote.currency, quote.subtotal)}
                    </p>
                    <p>
                      <strong>Descuento:</strong>{' '}
                      {quote.coupon_applied ? `-${formatMoney(quote.currency, quote.discount_amount)}` : formatMoney(quote.currency, 0)}
                    </p>
                    <p className="text-white text-lg">
                      <strong>Total:</strong> {formatMoney(quote.currency, quote.total)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {whatsappUrl && (
              <Card variant="glass" className="mb-8 border-emerald-400/20">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold text-white mb-2">Siguiente paso recomendado</h2>
                  <p className="text-sm text-cyan-100/80 mb-6">
                    Si quieres avanzar más rápido, te ayudamos a confirmar el flujo de asistencia y nómina y a aterrizar un plan de implementación.
                  </p>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 font-semibold transition-colors"
                  >
                    Escribir por WhatsApp (15 min)
                  </a>
                  <p className="text-xs text-white/60 text-center mt-3">
                    También puedes responder al correo con tus dudas; el PDF ya está listo para compartir internamente.
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
                  Reduce costos laborales y errores de planilla
                  <br />
                  en tu restaurante con <span className="text-emerald-400">SISU</span>
                </h1>
                <p className="text-xl md:text-2xl text-cyan-100/95 mb-8 max-w-2xl">
                  Cotización personalizada + PDF profesional en <strong>menos de 1 minuto</strong>.
                  <br />
                  Incluye implementación guiada y un plan de mejoras operativas en 90 días.
                </p>
                <div className="flex flex-wrap gap-6 text-sm text-cyan-200 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">🔒</span> Cálculo seguro en servidor
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">🛡️</span> Sin tarjeta • Sin compromiso
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">📄</span> PDF listo para presentar internamente
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">🇭🇳🇸🇻🇬🇹</span> Soporte regional (HN / SV / GT)
                  </div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-2xl p-5">
                  <p className="font-semibold text-emerald-300">Lo que recibes al solicitar tu cotización</p>
                  <ul className="mt-3 space-y-2 text-sm text-cyan-100/90">
                    <li>• Cotización exacta según tu tamaño real (1–200 empleados)</li>
                    <li>• PDF profesional listo para presentar internamente</li>
                    <li>• Recomendación de implementación según tu flujo (asistencia → nómina → reportes)</li>
                    <li>• Seguimiento por WhatsApp si prefieres avanzar más rápido</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-t border-white/10 pt-6">
                  <CardTitle className="text-xl md:text-2xl font-bold text-white mb-3">
                    Información mínima necesaria
                  </CardTitle>
                  <p className="text-cyan-100/80 text-sm leading-relaxed">
                    Te lo enviamos por email al instante. Si prefieres, te contactamos directo por WhatsApp.
                  </p>
                </div>

                <div className="space-y-5">
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
                        Tipo de establecimiento <span className="text-cyan-300 text-sm">(opcional)</span>
                      </label>
                      <select
                        name="tipo_establecimiento"
                        value={formData.tipo_establecimiento || ''}
                        onChange={(e) => handleInputChange('tipo_establecimiento', e.target.value)}
                        className="w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all hover:border-cyan-400/30 hover:bg-white/10"
                      >
                        <option value="" className="bg-slate-800">Seleccionar...</option>
                        <option value="restaurante" className="bg-slate-800">Restaurante tradicional</option>
                        <option value="cafeteria" className="bg-slate-800">Cafetería / Bakery</option>
                        <option value="qsr" className="bg-slate-800">QSR / Comida rápida</option>
                        <option value="bar" className="bg-slate-800">Bar / Lounge</option>
                        <option value="otro" className="bg-slate-800">Otro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Cupón de Descuento</label>
                    <input
                      name="coupon_code"
                      type="text"
                      value={formData.coupon_code || ''}
                      onChange={(e) => handleInputChange('coupon_code', e.target.value)}
                      className="w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all hover:border-cyan-400/30 hover:bg-white/10"
                      placeholder="Ej: gastro2026"
                    />
                    <p className="text-brand-400 text-sm mt-2">(opcional)</p>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={isLoading || Object.keys(errors).length > 0}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-xl font-semibold inline-flex items-center justify-center transition-all shadow-lg shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed text-lg hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Enviando cotización...
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="h-5 w-5 mr-2" /> Recibir mi cotización + PDF
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
                      Al enviar aceptas que te contactemos con la información de tu cotización. No se calcula el precio en tu navegador.
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

