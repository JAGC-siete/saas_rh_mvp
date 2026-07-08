import { useState } from 'react'
import Link from 'next/link'
import PublicPageShell from './PublicPageShell'
import PublicPageHead from '../SEO/PublicPageHead'
import SchemaMarkup from '../SEO/SchemaMarkup'
import { generateFAQPageSchema, generateWebPageSchema } from '../../lib/seo/schema'
import { VIERNES_COPY, VIERNES_PUBLIC_PATH } from '../../lib/marketing/viernes-copy'
import {
  buildMetaApiTrackingFields,
  createMetaEventId,
  trackViernesLeadSubmit,
} from '../../lib/analytics/metaPixel'
import { leadEmailValidationMessage } from '../../lib/marketing/validate-lead-email'
import { hasValidationErrors } from '../../lib/forms/validation-errors'

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

interface FormErrors {
  nombre?: string
  email?: string
  submit?: string
}

function computeErrors(fd: { nombre: string; email: string }): FormErrors {
  const errors: FormErrors = {}
  const nombre = fd.nombre.trim()
  const email = fd.email.trim()

  if (!nombre) errors.nombre = VIERNES_COPY.checklist.errors.nombre
  else if (nombre.length > 120) errors.nombre = 'El nombre es demasiado largo.'

  if (!email) errors.email = VIERNES_COPY.checklist.errors.email
  else {
    const emailError = leadEmailValidationMessage(email)
    if (emailError) errors.email = emailError
  }

  return errors
}

export default function ViernesLanding() {
  const copy = VIERNES_COPY
  const [formData, setFormData] = useState({ nombre: '', email: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [formStatus, setFormStatus] = useState<FormStatus>('idle')

  const webPageSchema = generateWebPageSchema({
    url: VIERNES_PUBLIC_PATH,
    title: copy.seo.title,
    description: copy.seo.description,
  })
  const faqSchema = generateFAQPageSchema(copy.faq.map((f) => ({ question: f.question, answer: f.answer })))

  const handleInputChange = (field: 'nombre' | 'email', value: string) => {
    const next = { ...formData, [field]: value }
    setFormData(next)
    setErrors(computeErrors(next))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const allErrors = computeErrors(formData)
    if (hasValidationErrors(allErrors)) {
      setErrors(allErrors)
      return
    }

    setFormStatus('submitting')
    setErrors({})

    try {
      const metaEventId = createMetaEventId('viernes')
      const payload = {
        nombre: formData.nombre.trim(),
        email: formData.email.trim(),
        ...buildMetaApiTrackingFields(metaEventId),
      }

      const response = await fetch('/api/viernes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setErrors({ submit: data.error || copy.checklist.errors.submit })
        setFormStatus('error')
        return
      }

      trackViernesLeadSubmit({
        eventId: metaEventId,
        email: payload.email,
        firstName: payload.nombre,
      })

      setFormStatus('success')
    } catch {
      setErrors({ submit: copy.checklist.errors.connection })
      setFormStatus('error')
    }
  }

  return (
    <PublicPageShell showTrustBar loginAlwaysVisible mainClassName="flex flex-col" showFooter={false}>
      <PublicPageHead
        title={copy.seo.title}
        description={copy.seo.description}
        canonicalPath={VIERNES_PUBLIC_PATH}
      />
      <SchemaMarkup schema={[webPageSchema, faqSchema]} />

      <div className="viernes-page flex-grow">
        {/* Hero */}
        <section className="viernes-section pt-8 sm:pt-12 text-center">
          <span className="viernes-badge">{copy.hero.badge}</span>
          <h1 className="viernes-serif viernes-hero-title mb-6">
            <span className="block text-4xl sm:text-5xl lg:text-6xl font-normal not-italic">
              {copy.hero.headlineLead}
            </span>
            <span className="block italic mt-1">{copy.hero.headlineAccent}</span>
          </h1>
          <p className="viernes-lead mb-6 max-w-2xl mx-auto">{copy.hero.subheadline}</p>
          <p className="viernes-mantra mb-8 max-w-xl mx-auto text-left">{copy.hero.mantra}</p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
            <Link
              href="/activar?utm_source=viernes&utm_medium=hero&utm_campaign=tocar-cielo"
              className="viernes-btn viernes-btn-primary"
            >
              {copy.hero.ctaPrimary}
            </Link>
            <Link
              href="/calculadora?utm_source=viernes&utm_medium=hero&utm_campaign=validar-calculo"
              className="viernes-btn viernes-btn-ghost text-sm"
            >
              {copy.hero.ctaSecondary}
            </Link>
          </div>
        </section>

        <hr className="viernes-divider" />

        {/* Insight */}
        <section className="viernes-section">
          <h2 className="viernes-serif viernes-section-title">{copy.insight.title}</h2>
          <div className="viernes-card">
            <p className="viernes-insight-lead viernes-serif italic">{copy.insight.lead}</p>
            {copy.insight.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="viernes-lead mb-4 last:mb-0">
                {paragraph}
              </p>
            ))}
            <div className="viernes-comparison">
              {copy.insight.comparison.map((row) => (
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
        </section>

        <hr className="viernes-divider" />

        {/* Checklist lead */}
        <section id="checklist" className="viernes-section">
          <h2 className="viernes-serif viernes-section-title">{copy.checklist.title}</h2>
          <p className="viernes-lead mb-8">{copy.checklist.sub}</p>

          {formStatus === 'success' ? (
            <div className="viernes-card text-center">
              <span className="viernes-success-badge mb-4">✓ {copy.checklist.success.title}</span>
              <p className="viernes-lead mb-6">{copy.checklist.success.body}</p>
              <p className="text-sm text-[var(--v-ink-soft)] mb-6">{copy.checklist.success.emailHint}</p>
              <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
                <Link
                  href="/activar?utm_source=viernes&utm_medium=checklist-success&utm_campaign=tocar-cielo"
                  className="viernes-btn viernes-btn-primary"
                >
                  {copy.checklist.success.ctaActivar}
                </Link>
                <Link
                  href="/calculadora?utm_source=viernes&utm_medium=checklist-success&utm_campaign=calculadora"
                  className="viernes-btn viernes-btn-ghost"
                >
                  {copy.checklist.success.ctaCalculadora}
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="viernes-card space-y-4">
              <div>
                <label htmlFor="viernes-nombre" className="viernes-form-label">
                  {copy.checklist.fields.nombre.label}
                </label>
                <input
                  id="viernes-nombre"
                  name="nombre"
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  placeholder={copy.checklist.fields.nombre.placeholder}
                  disabled={formStatus === 'submitting'}
                  autoComplete="name"
                  className="viernes-form-input"
                />
                {errors.nombre && <p className="viernes-form-error">{errors.nombre}</p>}
              </div>
              <div>
                <label htmlFor="viernes-email" className="viernes-form-label">
                  {copy.checklist.fields.email.label}
                </label>
                <input
                  id="viernes-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder={copy.checklist.fields.email.placeholder}
                  disabled={formStatus === 'submitting'}
                  autoComplete="email"
                  className="viernes-form-input"
                />
                {errors.email && <p className="viernes-form-error">{errors.email}</p>}
              </div>
              {errors.submit && <p className="viernes-form-error">{errors.submit}</p>}
              <button
                type="submit"
                disabled={formStatus === 'submitting'}
                className="viernes-btn viernes-btn-primary w-full sm:w-auto"
              >
                {formStatus === 'submitting' ? copy.checklist.submitting : copy.checklist.submit}
              </button>
              <p className="viernes-form-disclaimer">{copy.checklist.disclaimer}</p>
            </form>
          )}
        </section>

        <hr className="viernes-divider" />

        {/* Proof */}
        <section className="viernes-section">
          <h2 className="viernes-serif viernes-section-title">{copy.proof.title}</h2>
          <div className="viernes-card">
            {copy.proof.items.map((item) => (
              <p key={item} className="viernes-proof-item">
                {item}
              </p>
            ))}
          </div>
        </section>

        <hr className="viernes-divider" />

        {/* FAQ */}
        <section className="viernes-section">
          <h2 className="viernes-serif viernes-section-title">Preguntas frecuentes</h2>
          <div>
            {copy.faq.map((faq) => (
              <details key={faq.question} className="viernes-faq-item group">
                <summary className="viernes-faq-summary">{faq.question}</summary>
                <p className="viernes-faq-answer">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <hr className="viernes-divider" />

        {/* Final CTA */}
        <section className="viernes-section py-16 sm:py-20 text-center">
          <h2 className="viernes-serif viernes-final-title">
            <span className="viernes-final-title-lead">{copy.finalCta.headlineLead}</span>
            <span className="viernes-final-title-accent">{copy.finalCta.headlineAccent}</span>
          </h2>
          <p className="viernes-lead max-w-lg mx-auto mb-8">{copy.finalCta.sub}</p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 mb-4">
            <Link
              href="/activar?utm_source=viernes&utm_medium=cta-final&utm_campaign=tocar-cielo"
              className="viernes-btn viernes-btn-primary"
            >
              {copy.finalCta.primary}
            </Link>
          </div>
          <p className="text-sm text-[var(--v-ink-soft)]">
            <Link
              href="/ventas?utm_source=viernes&utm_medium=cta-final&utm_campaign=cotizacion"
              className="viernes-link"
            >
              {copy.finalCta.secondary}
            </Link>
          </p>
        </section>

        <footer className="viernes-footer">
          <p className="viernes-serif italic mb-2">{copy.footer.tag}</p>
          <p>
            <Link href="/" className="viernes-link">
              {copy.footer.link}
            </Link>
          </p>
        </footer>
      </div>
    </PublicPageShell>
  )
}
