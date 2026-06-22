import Head from 'next/head'
import { useState } from 'react'
import PublicPageShell from '../components/landing/PublicPageShell'
import { Button } from '../components/ui/button'
import {
  buildMetaApiTrackingFields,
  createMetaEventId,
  trackInfoLeadSubmit,
} from '../lib/analytics/metaPixel'

interface ValidationErrors {
  nombre?: string
  email?: string
  phone?: string
  submit?: string
}

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
      <Head>
        <title>Más información | Humano SISU</title>
        <link rel="icon" href="/logo-humano-sisu.png" />
        <meta
          name="description"
          content="Solicita más información sobre Humano SISU: software de recursos humanos, nómina y asistencia para PyMEs en Centroamérica."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://humanosisu.net/info" />
      </Head>

      <section id="info-lead" className="py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 px-2">
            Hay un pequeño truco para que el trabajo más aburrido y pesado se haga prácticamente solo.
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-brand-200/90 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Organizar los pagos y horarios no tiene por qué ser la peor parte de tu semana. Anota tu correo aquí y te lo enviamos en una nota rápida.
          </p>

          <div className="max-w-md mx-auto text-left">
            {isSuccess ? (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 text-center">
                <p className="text-green-400 font-medium">✓ {successMessage}</p>
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

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                  variant="modern"
                >
                  {isLoading ? 'Enviando...' : 'Quiero más información'}
                </Button>

                <p className="text-xs sm:text-sm text-brand-200/60 text-center">
                  Sin compromiso. No activamos trial ni cotización automática.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
