import Link from 'next/link'
import { useEffect, useState } from 'react'
import PublicPageShell from '../components/landing/PublicPageShell'
import PublicPageHead from '../components/SEO/PublicPageHead'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import { Button } from '../components/ui/button'
import { CalcCheckIcon, CalcIconTextRow } from '../components/public-calculator/CalculatorUiIcons'
import { CALCULATOR_HUB_LINKS } from '../lib/public-calculator/hub-links'
import {
  buildMetaApiTrackingFields,
  createMetaEventId,
  trackInfoLeadSubmit,
} from '../lib/analytics/metaPixel'
import { initGoogleAdsTracking } from '../lib/analytics/googleAds'
import { generateBreadcrumbListSchema, generateFAQPageSchema, generateWebPageSchema } from '../lib/seo/schema'
import { getPageDescription } from '../lib/seo/description'
import { getPageTitle } from '../lib/seo/title'

interface ValidationErrors {
  nombre?: string
  email?: string
  phone?: string
  submit?: string
}

const FAQS = [
  {
    question: '¿Qué es Humano SISU?',
    answer:
      'Software de recursos humanos para PyMEs en Honduras, El Salvador y Guatemala: control de asistencia biométrico, nómina con deducciones de ley (IHSS, RAP, ISR, ISSS, AFP, IGSS) y comprobantes digitales.',
  },
  {
    question: '¿Qué recibo al dejar mi correo aquí?',
    answer:
      'Una nota con el enfoque práctico para automatizar pagos y horarios, más enlaces a calculadoras gratuitas y opciones para probar el software o solicitar cotización.',
  },
  {
    question: '¿Esto activa un trial o me cobra algo?',
    answer:
      'No. Este formulario solo solicita información. No activamos trial ni generamos cotización automática hasta que tú lo pidas en /activar o /ventas.',
  },
  {
    question: '¿Puedo validar mi sueldo antes de contratar?',
    answer:
      'Sí. Usa nuestras calculadoras gratuitas de deducciones, aguinaldo, catorceavo y prestaciones — con el mismo motor legal que el software.',
  },
]

function computeInfoErrors(fd: { nombre: string; email: string; phone: string }): ValidationErrors {
  const errors: ValidationErrors = {}
  const nombre = fd.nombre.trim()
  const email = fd.email.trim()

  if (!nombre) {
    errors.nombre = 'Indica tu nombre para poder contactarte.'
  } else if (nombre.length > 120) {
    errors.nombre = 'El nombre es demasiado largo.'
  }

  if (!email) {
    errors.email = 'Indica tu correo; ahí te enviamos la información.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Correo no válido.'
  }

  return errors
}

export default function InfoPage() {
  const [formData, setFormData] = useState({ nombre: '', email: '', phone: '' })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const pageTitle = getPageTitle('info')
  const pageDescription = getPageDescription('info')

  const webPageSchema = generateWebPageSchema({
    url: '/info',
    title: pageTitle,
    description: pageDescription,
    inLanguage: 'es',
  })
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Inicio', url: '/' },
    { name: 'Más información', url: '/info' },
  ])
  const faqSchema = generateFAQPageSchema(FAQS)

  useEffect(() => {
    initGoogleAdsTracking()
  }, [])

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    const next = { ...formData, [field]: value }
    setFormData(next)
    setErrors((prev) => {
      const computed = computeInfoErrors(next)
      return prev.submit ? { ...computed, submit: undefined } : computed
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const allErrors = computeInfoErrors(formData)
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      const first = Object.keys(allErrors)[0]
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
      const metaEventId = createMetaEventId('info')
      const payload = {
        nombre: formData.nombre.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        ...buildMetaApiTrackingFields(metaEventId),
      }

      const response = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setErrors({ submit: data.error || 'No se pudo enviar tu solicitud. Intenta de nuevo.' })
        return
      }

      trackInfoLeadSubmit({
        eventId: metaEventId,
        email: payload.email,
        phone: payload.phone,
        firstName: payload.nombre,
      })

      setIsSuccess(true)
      setSuccessMessage(data.data?.message || 'Gracias. Pronto nos pondremos en contacto.')
      setFormData({ nombre: '', email: '', phone: '' })
    } catch {
      setErrors({ submit: 'Error de conexión. Por favor intenta de nuevo.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PublicPageShell showSpotlight loginAlwaysVisible>
      <PublicPageHead title={pageTitle} description={pageDescription} canonicalPath="/info" />
      <SchemaMarkup schema={[webPageSchema, breadcrumbSchema, faqSchema]} />

      <section id="info-lead" className="py-10 sm:py-14 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-8 sm:mb-10">
            <span className="inline-block px-3 py-1 mb-4 text-xs rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
              Nómina · Asistencia · Centroamérica
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              Automatiza lo aburrido de la planilla sin perder el control legal
            </h1>
            <p className="text-base sm:text-lg text-brand-200/90 max-w-2xl mx-auto leading-relaxed">
              Pagos, horarios y deducciones no tienen que comerse tu semana. Deja tu correo y te enviamos una nota
              práctica sobre cómo PyMEs en Honduras, El Salvador y Guatemala usan Humano SISU.
            </p>
          </div>

          <div className="max-w-md mx-auto text-left mb-10">
            {isSuccess ? (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 text-center">
                <CalcIconTextRow
                  icon={<CalcCheckIcon className="text-green-400" solid />}
                  className="text-green-400 font-medium justify-center"
                >
                  {successMessage}
                </CalcIconTextRow>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="info-nombre" className="sr-only">
                    Nombre
                  </label>
                  <input
                    id="info-nombre"
                    name="nombre"
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    placeholder="Tu nombre"
                    disabled={isLoading}
                    autoComplete="name"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-brand-200/70 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent disabled:opacity-50"
                    required
                  />
                  {errors.nombre && <p className="mt-1 text-sm text-red-400">{errors.nombre}</p>}
                </div>

                <div>
                  <label htmlFor="info-email" className="sr-only">
                    Correo electrónico
                  </label>
                  <input
                    id="info-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Tu correo electrónico"
                    disabled={isLoading}
                    autoComplete="email"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-brand-200/70 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent disabled:opacity-50"
                    required
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="info-phone" className="sr-only">
                    Teléfono (opcional)
                  </label>
                  <input
                    id="info-phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Teléfono / WhatsApp (opcional)"
                    disabled={isLoading}
                    autoComplete="tel"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-brand-200/70 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent disabled:opacity-50"
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
                </div>

                {errors.submit && (
                  <p className="text-sm text-red-400 text-center font-medium">{errors.submit}</p>
                )}

                <Button type="submit" disabled={isLoading} className="w-full" variant="modern">
                  {isLoading ? 'Enviando...' : 'Quiero más información'}
                </Button>

                <p className="text-xs sm:text-sm text-brand-200/60 text-center">
                  Sin compromiso. No activamos trial ni cotización automática.
                </p>
              </form>
            )}
          </div>

          <div className="glass-modern rounded-2xl p-5 sm:p-6 border border-white/10 mb-8">
            <h2 className="text-lg font-semibold text-white mb-2">¿Ya validaste tu sueldo con nuestras calculadoras?</h2>
            <p className="text-sm text-brand-200/90 mb-4">
              Prueba gratis el motor legal antes de automatizar toda la planilla.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <Link
                href="/calculadora?utm_source=info&utm_medium=cta&utm_campaign=calculators"
                className="inline-flex justify-center py-2.5 px-4 text-sm text-brand-300 hover:text-white underline"
              >
                Ver calculadoras laborales
              </Link>
              <Link
                href="/activar?utm_source=info&utm_medium=cta&utm_campaign=trial"
                className="inline-flex justify-center py-2.5 px-5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm"
              >
                Probar software gratis
              </Link>
              <Link
                href="/ventas?utm_source=info&utm_medium=cta&utm_campaign=pricing"
                className="inline-flex justify-center py-2.5 px-5 border border-white/20 hover:bg-white/10 text-white font-semibold rounded-xl text-sm"
              >
                Cotización y precios
              </Link>
              <Link
                href="/suscripcion?utm_source=info&utm_medium=cta&utm_campaign=newsletter"
                className="inline-flex justify-center py-2.5 px-4 text-sm text-brand-300 hover:text-white underline"
              >
                Newsletter RRHH
              </Link>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-3">Calculadoras gratuitas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...CALCULATOR_HUB_LINKS.deductions, ...CALCULATOR_HUB_LINKS.benefits].map((item) => (
                <Link
                  key={item.href}
                  href={`${item.href}?utm_source=info&utm_medium=internal&utm_campaign=calc-link`}
                  className="glass rounded-xl p-4 border border-white/10 hover:border-cyan-400/40 transition-all text-sm"
                >
                  <div className="font-medium text-white">{item.title}</div>
                  <div className="text-xs text-brand-300/70 mt-1">{item.country}</div>
                </Link>
              ))}
              <Link
                href={`${CALCULATOR_HUB_LINKS.prestaciones.href}?utm_source=info&utm_medium=internal&utm_campaign=calc-link`}
                className="glass rounded-xl p-4 border border-white/10 hover:border-cyan-400/40 transition-all text-sm sm:col-span-2"
              >
                <div className="font-medium text-white">{CALCULATOR_HUB_LINKS.prestaciones.title}</div>
                <div className="text-xs text-brand-300/70 mt-1">{CALCULATOR_HUB_LINKS.prestaciones.subtitle}</div>
              </Link>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Preguntas frecuentes</h2>
            <div className="space-y-3">
              {FAQS.map((faq) => (
                <div key={faq.question} className="glass rounded-xl p-4 border border-white/10">
                  <h3 className="font-medium text-white text-sm mb-2">{faq.question}</h3>
                  <p className="text-sm text-brand-200/90 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
