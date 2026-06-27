import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '../ui/button'
import BorderBeam from '../landing/BorderBeam'
import { CalcCheckIcon } from '../public-calculator/CalculatorUiIcons'
import InfoProgressRail from '../info-game/InfoProgressRail'
import {
  buildMetaApiTrackingFields,
  createMetaEventId,
  trackNewsletterCompleteRegistration,
} from '../../lib/analytics/metaPixel'
import type { CalculatorUtmContext } from '../../lib/suscripcion-game/calculator-utm-context'
import {
  RECIBO_ALERTAS_COPY,
  UNLOCK_PROGRESS,
  UNLOCK_PROGRESS_MAX,
} from '../../lib/suscripcion-game/recibo-alertas-copy'

type PageStatus = 'intrigue' | 'unlocking' | 'revealed'

interface ValidationErrors {
  nombre?: string
  email?: string
  submit?: string
}

type Props = {
  utmContext?: CalculatorUtmContext
  source?: string
}

function computeErrors(fd: { nombre: string; email: string }): ValidationErrors {
  const errors: ValidationErrors = {}
  const nombre = fd.nombre.trim()
  const email = fd.email.trim()

  if (!nombre) errors.nombre = 'Indica tu nombre para activar las alertas.'
  else if (nombre.length > 120) errors.nombre = 'El nombre es demasiado largo.'

  if (!email) errors.email = 'Indica tu correo; ahí te mandamos las alertas.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Correo no válido.'

  return errors
}

function computeUnlockProgress(form: { nombre: string; email: string }): number {
  let pct = 0
  if (form.nombre.trim()) pct += UNLOCK_PROGRESS.nombre
  if (form.email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    pct += UNLOCK_PROGRESS.email
  }
  return Math.min(UNLOCK_PROGRESS_MAX, pct)
}

export default function ReciboAlertasLead({ utmContext = {}, source = 'suscripcion-page' }: Props) {
  const [status, setStatus] = useState<PageStatus>('intrigue')
  const [formData, setFormData] = useState({ nombre: '', email: '' })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  const copy = RECIBO_ALERTAS_COPY
  const progress = useMemo(() => computeUnlockProgress(formData), [formData])
  const headline = utmContext.headline ?? copy.intrigue.headline
  const subheadline = utmContext.subheadline ?? copy.intrigue.subheadline

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    const next = { ...formData, [field]: value }
    setFormData(next)
    setErrors((prev) => {
      const computed = computeErrors(next)
      return prev.submit ? { ...computed, submit: undefined } : computed
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const allErrors = computeErrors(formData)
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const metaEventId = createMetaEventId('subscribe')
      const trimmedEmail = formData.email.trim()
      const response = await fetch('/api/mail-list/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          nombre: formData.nombre.trim(),
          source,
          ...buildMetaApiTrackingFields(metaEventId),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setErrors({ submit: data.error || 'No se pudo activar. Intenta de nuevo.' })
        return
      }

      trackNewsletterCompleteRegistration({
        eventId: metaEventId,
        email: trimmedEmail,
        source,
      })

      setStatus('revealed')
    } catch {
      setErrors({ submit: 'Error de conexión. Por favor intenta de nuevo.' })
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-brand-200/70 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent disabled:opacity-50'

  return (
    <div className="max-w-lg mx-auto">
      {status === 'unlocking' && (
        <InfoProgressRail
          points={progress}
          maxPoints={UNLOCK_PROGRESS_MAX}
          label={copy.unlock.progressLabel}
          compact
        />
      )}

      <AnimatePresence mode="wait">
        {status === 'intrigue' && (
          <motion.div
            key="intrigue"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35 }}
          >
            <div className="text-center mb-4">
              <span className="inline-block px-3 py-1 mb-4 text-xs rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                {copy.badge}
                {utmContext.country ? ` · ${utmContext.country}` : ''}
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
                {headline}
              </h1>
            </div>

            <BorderBeam className="mb-6">
              <div className="glass-modern rounded-2xl border border-cyan-500/25 p-8 sm:p-10 text-center bg-gradient-to-b from-cyan-500/5 to-transparent">
                <motion.div
                  className="text-5xl sm:text-6xl mb-4"
                  aria-hidden
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                >
                  🧾
                </motion.div>
                <p className="text-xs font-semibold tracking-widest text-cyan-300/90 mb-2">
                  {copy.intrigue.receiptLabel}
                </p>
                <p className="text-sm text-brand-200/90 max-w-xs mx-auto">{copy.intrigue.receiptHint}</p>
              </div>
            </BorderBeam>

            <p className="text-base sm:text-lg text-brand-200/90 leading-relaxed text-center mb-8">{subheadline}</p>
            <Button type="button" variant="modern" className="w-full" onClick={() => setStatus('unlocking')}>
              {copy.intrigue.cta}
            </Button>
          </motion.div>
        )}

        {status === 'unlocking' && (
          <motion.div
            key="unlocking"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.45 }}
          >
            <div className="text-center mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{headline}</h1>
            </div>
            <BorderBeam>
              <form
                onSubmit={handleSubmit}
                className="glass-modern rounded-2xl border border-cyan-500/30 p-5 sm:p-6 space-y-4"
              >
                <div>
                  <label htmlFor="subs-nombre" className="block text-xs font-medium text-brand-300 mb-1">
                    {copy.unlock.fields.nombre.label}
                  </label>
                  <input
                    id="subs-nombre"
                    name="nombre"
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    placeholder={copy.unlock.fields.nombre.placeholder}
                    disabled={isLoading}
                    autoComplete="name"
                    className={inputClass}
                    required
                  />
                  {errors.nombre && <p className="mt-1 text-sm text-red-400">{errors.nombre}</p>}
                </div>

                <div>
                  <label htmlFor="subs-email" className="block text-xs font-medium text-brand-300 mb-1">
                    {copy.unlock.fields.email.label}
                  </label>
                  <input
                    id="subs-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder={copy.unlock.fields.email.placeholder}
                    disabled={isLoading}
                    autoComplete="email"
                    className={inputClass}
                    required
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
                </div>

                {errors.submit && (
                  <p className="text-sm text-red-400 text-center font-medium">{errors.submit}</p>
                )}

                <Button type="submit" disabled={isLoading || progress < 100} className="w-full" variant="modern">
                  {isLoading ? copy.unlock.submitting : copy.unlock.submit}
                </Button>

                <p className="text-xs sm:text-sm text-brand-200/60 text-center">{copy.unlock.disclaimer}</p>
              </form>
            </BorderBeam>
          </motion.div>
        )}

        {status === 'revealed' && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-5"
          >
            <div className="glass-modern rounded-2xl border border-cyan-500/30 p-6 sm:p-8 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <CalcCheckIcon className="text-cyan-400 w-6 h-6 shrink-0" solid />
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  {copy.revealed.badge}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">{copy.revealed.title}</h2>
              {copy.revealed.body.map((paragraph) => (
                <p key={paragraph.slice(0, 24)} className="text-sm text-brand-200/90 leading-relaxed mb-3">
                  {paragraph}
                </p>
              ))}
              <ul className="mt-4 space-y-2 text-left max-w-sm mx-auto">
                {copy.revealed.bullets.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-brand-200/90">
                    <span className="text-cyan-400 shrink-0" aria-hidden>
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-modern rounded-2xl border border-white/10 p-5 sm:p-6">
              <h3 className="text-lg font-bold text-white mb-2">{copy.nextStep.title}</h3>
              <p className="text-sm text-brand-200/90 leading-relaxed mb-3">{copy.nextStep.body}</p>
              <p className="text-xs text-brand-300/70 mb-4">{copy.nextStep.emailHint}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/calculadora?utm_source=suscripcion&utm_medium=success&utm_campaign=recibo_alertas"
                  className="inline-flex justify-center py-2.5 px-5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  {copy.nextStep.ctaCalculadora}
                </Link>
                <Link
                  href="/calculadora?utm_source=suscripcion&utm_medium=success&utm_campaign=share_hr"
                  className="inline-flex justify-center py-2.5 px-5 border border-white/20 hover:bg-white/10 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  {copy.nextStep.ctaShare}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
