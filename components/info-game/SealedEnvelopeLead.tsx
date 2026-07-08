import Link from 'next/link'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  buildMetaApiTrackingFields,
  createMetaEventId,
  trackInfoLeadSubmit,
} from '../../lib/analytics/metaPixel'
import { SEALED_ENVELOPE_COPY } from '../../lib/info-game/sealed-envelope-copy'
import { leadEmailValidationMessage } from '../../lib/marketing/validate-lead-email'
import { hasValidationErrors } from '../../lib/forms/validation-errors'

type PageStatus = 'intrigue' | 'unlocking' | 'revealed'

interface ValidationErrors {
  nombre?: string
  email?: string
  submit?: string
}

const copy = SEALED_ENVELOPE_COPY

function computeErrors(fd: { nombre: string; email: string }): ValidationErrors {
  const errors: ValidationErrors = {}
  const nombre = fd.nombre.trim()
  const email = fd.email.trim()

  if (!nombre) errors.nombre = copy.unlock.errors.nombre
  else if (nombre.length > 120) errors.nombre = 'El nombre es demasiado largo.'

  if (!email) errors.email = copy.unlock.errors.email
  else {
    const emailError = leadEmailValidationMessage(email)
    if (emailError) errors.email = emailError
  }

  return errors
}

export default function SealedEnvelopeLead() {
  const [status, setStatus] = useState<PageStatus>('intrigue')
  const [formData, setFormData] = useState({ nombre: '', email: '', phone: '', empresa: '' })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    const next = { ...formData, [field]: value }
    setFormData(next)
    setErrors(computeErrors({ nombre: next.nombre, email: next.email }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const allErrors = computeErrors(formData)
    if (hasValidationErrors(allErrors)) {
      setErrors(allErrors)
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
        empresa: formData.empresa.trim() || undefined,
        ...buildMetaApiTrackingFields(metaEventId),
      }

      const response = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setErrors({ submit: data.error || copy.unlock.errors.submit })
        return
      }

      trackInfoLeadSubmit({
        eventId: metaEventId,
        email: payload.email,
        phone: payload.phone,
        firstName: payload.nombre,
      })

      setStatus('revealed')
    } catch {
      setErrors({ submit: copy.unlock.errors.connection })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {status === 'intrigue' && (
        <motion.section
          key="intrigue"
          className="viernes-section pt-8 sm:pt-12 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
        >
          <span className="viernes-badge">{copy.badge}</span>
          <p className="viernes-serif viernes-hero-eyebrow max-w-3xl mx-auto">{copy.intrigue.eyebrow}</p>
          <h1 className="viernes-serif viernes-hero-title mb-6">
            <span className="block text-4xl sm:text-5xl lg:text-6xl font-normal not-italic">
              {copy.intrigue.headlineLead}
            </span>
            <span className="block italic mt-1">{copy.intrigue.headlineAccent}</span>
          </h1>
          <p className="viernes-lead mb-6 max-w-2xl mx-auto">{copy.intrigue.subheadline}</p>
          <p className="viernes-mantra mb-8 max-w-xl mx-auto text-left">{copy.intrigue.mantra}</p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setStatus('unlocking')}
              className="viernes-btn viernes-btn-primary"
            >
              {copy.intrigue.cta}
            </button>
            <Link
              href="/calculadora?utm_source=info&utm_medium=hero&utm_campaign=validar-calculo"
              className="viernes-btn viernes-btn-ghost text-sm"
            >
              {copy.intrigue.ctaSecondary}
            </Link>
          </div>
        </motion.section>
      )}

      {status === 'unlocking' && (
        <motion.section
          key="unlocking"
          className="viernes-section pt-8 sm:pt-12"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
        >
          <h2 className="viernes-serif viernes-section-title text-center">{copy.unlock.title}</h2>
          <p className="viernes-lead mb-8 text-center max-w-xl mx-auto">{copy.unlock.sub}</p>

          <form onSubmit={handleSubmit} className="viernes-card space-y-4 max-w-lg mx-auto">
            <div>
              <label htmlFor="info-nombre" className="viernes-form-label">
                {copy.unlock.fields.nombre.label}
              </label>
              <input
                id="info-nombre"
                name="nombre"
                type="text"
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                placeholder={copy.unlock.fields.nombre.placeholder}
                disabled={isLoading}
                autoComplete="name"
                className="viernes-form-input"
                required
              />
              {errors.nombre && <p className="viernes-form-error">{errors.nombre}</p>}
            </div>

            <div>
              <label htmlFor="info-email" className="viernes-form-label">
                {copy.unlock.fields.email.label}
              </label>
              <input
                id="info-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder={copy.unlock.fields.email.placeholder}
                disabled={isLoading}
                autoComplete="email"
                className="viernes-form-input"
                required
              />
              {errors.email && <p className="viernes-form-error">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="info-phone" className="viernes-form-label">
                {copy.unlock.fields.phone.label}
              </label>
              <input
                id="info-phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder={copy.unlock.fields.phone.placeholder}
                disabled={isLoading}
                autoComplete="tel"
                className="viernes-form-input"
              />
            </div>

            <div>
              <label htmlFor="info-empresa" className="viernes-form-label">
                {copy.unlock.fields.empresa.label}
              </label>
              <input
                id="info-empresa"
                name="empresa"
                type="text"
                value={formData.empresa}
                onChange={(e) => handleInputChange('empresa', e.target.value)}
                placeholder={copy.unlock.fields.empresa.placeholder}
                disabled={isLoading}
                autoComplete="organization"
                className="viernes-form-input"
              />
            </div>

            {errors.submit && <p className="viernes-form-error text-center">{errors.submit}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="viernes-btn viernes-btn-primary w-full"
            >
              {isLoading ? copy.unlock.submitting : copy.unlock.submit}
            </button>
            <p className="viernes-form-disclaimer text-center">{copy.unlock.disclaimer}</p>
          </form>
        </motion.section>
      )}

      {status === 'revealed' && (
        <motion.section
          key="revealed"
          className="viernes-section pt-8 sm:pt-12"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-center mb-6">
            <span className="viernes-success-badge">{copy.revealed.badge}</span>
          </div>

          <div className="viernes-card">
            <h2 className="viernes-serif viernes-section-title text-center mb-4">{copy.revealed.title}</h2>
            <p className="viernes-insight-lead viernes-serif italic text-center">{copy.revealed.lead}</p>
            {copy.revealed.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="viernes-lead mb-4 last:mb-0">
                {paragraph}
              </p>
            ))}
            <div className="viernes-comparison">
              {copy.revealed.comparison.map((row) => (
                <div key={row.before} className="viernes-comparison-row">
                  <span className="viernes-comparison-before">{row.before}</span>
                  <span className="viernes-comparison-arrow" aria-hidden="true">
                    →
                  </span>
                  <span className="viernes-comparison-after">{row.after}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="viernes-card mt-6">
            <h3 className="viernes-serif text-2xl font-bold text-white mb-3">{copy.nextStep.title}</h3>
            <p className="viernes-lead mb-3">{copy.nextStep.body}</p>
            <p className="viernes-form-disclaimer mb-6">{copy.nextStep.emailHint}</p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <Link
                href="/activar?utm_source=info&utm_medium=unlock&utm_campaign=sealed_envelope"
                className="viernes-btn viernes-btn-primary"
              >
                {copy.nextStep.ctaActivar}
              </Link>
              <Link
                href="/calculadora?utm_source=info&utm_medium=unlock&utm_campaign=sealed_envelope"
                className="viernes-btn viernes-btn-ghost"
              >
                {copy.nextStep.ctaCalculadora}
              </Link>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
