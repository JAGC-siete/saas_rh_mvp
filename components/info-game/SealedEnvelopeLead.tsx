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

type WizardKey = 'nombre' | 'email' | 'phone' | 'empresa'

interface ValidationErrors {
  nombre?: string
  email?: string
  submit?: string
}

const copy = SEALED_ENVELOPE_COPY

const WIZARD_ORDER: WizardKey[] = ['nombre', 'email', 'phone', 'empresa']

const FIELD_META: Record<WizardKey, { type: string; autoComplete: string; inputMode?: 'tel' }> = {
  nombre: { type: 'text', autoComplete: 'name' },
  email: { type: 'email', autoComplete: 'email' },
  phone: { type: 'tel', autoComplete: 'tel', inputMode: 'tel' },
  empresa: { type: 'text', autoComplete: 'organization' },
}

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

function validateStep(key: WizardKey, fd: { nombre: string; email: string }): string | undefined {
  if (key === 'nombre') {
    const nombre = fd.nombre.trim()
    if (!nombre) return copy.unlock.errors.nombre
    if (nombre.length > 120) return 'El nombre es demasiado largo.'
  }
  if (key === 'email') {
    const email = fd.email.trim()
    if (!email) return copy.unlock.errors.email
    return leadEmailValidationMessage(email) ?? undefined
  }
  return undefined
}

export default function SealedEnvelopeLead() {
  const [status, setStatus] = useState<PageStatus>('intrigue')
  const [stepIndex, setStepIndex] = useState(0)
  const [formData, setFormData] = useState({ nombre: '', email: '', phone: '', empresa: '' })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  const totalSteps = WIZARD_ORDER.length
  const currentKey = WIZARD_ORDER[stepIndex]
  const isLastStep = stepIndex === totalSteps - 1
  const pct = Math.round(((stepIndex + 1) / totalSteps) * 100)

  const startUnlock = () => {
    setStepIndex(0)
    setErrors({})
    setStatus('unlocking')
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      if (!prev[field as keyof ValidationErrors] && !prev.submit) return prev
      const next = { ...prev }
      delete next[field as keyof ValidationErrors]
      delete next.submit
      return next
    })
  }

  const goBack = () => {
    setErrors({})
    if (stepIndex === 0) {
      setStatus('intrigue')
      return
    }
    setStepIndex((i) => i - 1)
  }

  const goNext = () => {
    const stepError = validateStep(currentKey, formData)
    if (stepError) {
      setErrors({ [currentKey]: stepError } as ValidationErrors)
      return
    }
    setErrors({})
    if (!isLastStep) {
      setStepIndex((i) => i + 1)
      return
    }
    void submitLead()
  }

  const handleStepSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    goNext()
  }

  const submitLead = async () => {
    const allErrors = computeErrors(formData)
    if (hasValidationErrors(allErrors)) {
      setErrors(allErrors)
      const firstBadStep = WIZARD_ORDER.findIndex((key) => allErrors[key as keyof ValidationErrors])
      if (firstBadStep >= 0) setStepIndex(firstBadStep)
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
          <h1 className="viernes-serif mb-6 max-w-4xl mx-auto">
            <span className="block text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-normal not-italic leading-tight text-white">
              {copy.intrigue.headlineLead}
            </span>
          </h1>
          <p className="viernes-lead mb-6 max-w-2xl mx-auto">{copy.intrigue.subheadline}</p>
          <p className="viernes-mantra mb-8 max-w-xl mx-auto text-left">{copy.intrigue.headlineAccent}</p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={startUnlock}
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
          <div className="max-w-lg mx-auto mb-6">
            <div className="glass-modern rounded-xl border border-white/15 px-4 py-3 shadow-lg backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-brand-200/90 tracking-wide">
                  {copy.unlock.progressLabel}
                </span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {pct}% · Paso {stepIndex + 1} de {totalSteps}
                </span>
              </div>

              <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#38bdf8,#3b82f6)' }}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${copy.unlock.progressLabel}: ${pct}%`}
                />
              </div>

              <div className="grid grid-cols-4 gap-1">
                {copy.unlock.stepLabels.map((label, i) => {
                  const done = i < stepIndex
                  const active = i === stepIndex
                  return (
                    <div key={label} className="text-center min-w-0">
                      <div
                        className={`mx-auto mb-1 h-2 w-2 rounded-full transition-colors ${
                          done || active ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]' : 'bg-white/20'
                        } ${active ? 'ring-2 ring-sky-400/40 scale-125' : ''}`}
                      />
                      <p
                        className={`text-[10px] sm:text-xs truncate px-0.5 ${
                          active
                            ? 'text-white font-medium'
                            : done
                              ? 'text-brand-200/80'
                              : 'text-brand-400/60'
                        }`}
                      >
                        {label}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <form onSubmit={handleStepSubmit} className="viernes-card max-w-lg mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentKey}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="viernes-serif viernes-section-title text-center mb-6">
                  {copy.unlock.fields[currentKey].question}
                </h2>

                <label htmlFor={`info-${currentKey}`} className="viernes-form-label">
                  {copy.unlock.fields[currentKey].label}
                </label>
                <input
                  id={`info-${currentKey}`}
                  name={currentKey}
                  type={FIELD_META[currentKey].type}
                  inputMode={FIELD_META[currentKey].inputMode}
                  value={formData[currentKey]}
                  onChange={(e) => handleInputChange(currentKey, e.target.value)}
                  placeholder={copy.unlock.fields[currentKey].placeholder}
                  disabled={isLoading}
                  autoComplete={FIELD_META[currentKey].autoComplete}
                  className="viernes-form-input"
                  autoFocus
                />
                {errors[currentKey as keyof ValidationErrors] && (
                  <p className="viernes-form-error">{errors[currentKey as keyof ValidationErrors]}</p>
                )}
              </motion.div>
            </AnimatePresence>

            {errors.submit && <p className="viernes-form-error text-center mt-4">{errors.submit}</p>}

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={goBack}
                disabled={isLoading}
                className="viernes-btn viernes-btn-ghost"
              >
                {copy.unlock.back}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="viernes-btn viernes-btn-primary flex-1"
              >
                {isLoading
                  ? copy.unlock.submitting
                  : isLastStep
                    ? copy.unlock.submit
                    : copy.unlock.next}
              </button>
            </div>
            <p className="viernes-form-disclaimer text-center mt-4">{copy.unlock.disclaimer}</p>
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
