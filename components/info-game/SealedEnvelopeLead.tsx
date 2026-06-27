import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '../ui/button'
import BorderBeam from '../landing/BorderBeam'
import { CalcCheckIcon } from '../public-calculator/CalculatorUiIcons'
import InfoProgressRail from './InfoProgressRail'
import {
  buildMetaApiTrackingFields,
  createMetaEventId,
  trackInfoLeadSubmit,
} from '../../lib/analytics/metaPixel'
import {
  SEALED_ENVELOPE_COPY,
  UNLOCK_PROGRESS,
  UNLOCK_PROGRESS_MAX,
} from '../../lib/info-game/sealed-envelope-copy'

type PageStatus = 'intrigue' | 'unlocking' | 'revealed'

interface ValidationErrors {
  nombre?: string
  email?: string
  phone?: string
  submit?: string
}

function computeErrors(fd: { nombre: string; email: string }): ValidationErrors {
  const errors: ValidationErrors = {}
  const nombre = fd.nombre.trim()
  const email = fd.email.trim()

  if (!nombre) errors.nombre = 'Indica tu nombre para desbloquear el secreto.'
  else if (nombre.length > 120) errors.nombre = 'El nombre es demasiado largo.'

  if (!email) errors.email = 'Indica tu correo; ahí te enviamos el Secreto y la Misión 2.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Correo no válido.'

  return errors
}

function computeUnlockProgress(form: { nombre: string; email: string; phone: string; empresa: string }): number {
  let pct = 0
  if (form.nombre.trim()) pct += UNLOCK_PROGRESS.nombre
  if (form.email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) pct += UNLOCK_PROGRESS.email
  if (form.phone.trim()) pct += UNLOCK_PROGRESS.phone
  if (form.empresa.trim()) pct += UNLOCK_PROGRESS.empresa
  return Math.min(UNLOCK_PROGRESS_MAX, pct)
}

export default function SealedEnvelopeLead() {
  const [status, setStatus] = useState<PageStatus>('intrigue')
  const [formData, setFormData] = useState({ nombre: '', email: '', phone: '', empresa: '' })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  const copy = SEALED_ENVELOPE_COPY
  const progress = useMemo(() => computeUnlockProgress(formData), [formData])

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
        setErrors({ submit: data.error || 'No se pudo desbloquear. Intenta de nuevo.' })
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
      setErrors({ submit: 'Error de conexión. Por favor intenta de nuevo.' })
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-brand-200/70 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent disabled:opacity-50'

  return (
    <div className="max-w-lg mx-auto">
      {/* Estado 0 — Intriga (hero) */}
      <div className="text-center mb-8">
        <span className="inline-block px-3 py-1 mb-4 text-xs rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25">
          {copy.badge}
        </span>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
          {copy.intrigue.headline}
        </h1>
        <p className="text-base sm:text-lg text-brand-200/90 leading-relaxed">{copy.intrigue.subheadline}</p>
      </div>

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
            <BorderBeam className="mb-6">
              <div className="glass-modern rounded-2xl border border-amber-500/25 p-8 sm:p-10 text-center bg-gradient-to-b from-amber-500/5 to-transparent">
                <div className="text-5xl sm:text-6xl mb-4" aria-hidden>
                  ✉️
                </div>
                <p className="text-xs font-semibold tracking-widest text-amber-300/90 mb-2">
                  {copy.intrigue.envelopeLabel}
                </p>
                <p className="text-sm text-brand-200/90 max-w-xs mx-auto">{copy.intrigue.envelopeHint}</p>
              </div>
            </BorderBeam>
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
            exit={{ opacity: 0, scale: 1.05, rotateX: 8 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <BorderBeam>
              <form
                onSubmit={handleSubmit}
                className="glass-modern rounded-2xl border border-cyan-500/30 p-5 sm:p-6 space-y-4"
              >
                <div className="text-center pb-2">
                  <motion.div
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="text-4xl mb-2"
                    aria-hidden
                  >
                    🔓
                  </motion.div>
                  <p className="text-xs text-cyan-300/90 uppercase tracking-wide">{copy.intrigue.envelopeLabel}</p>
                </div>

                <div>
                  <label htmlFor="info-nombre" className="block text-xs font-medium text-brand-300 mb-1">
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
                    className={inputClass}
                    required
                  />
                  {errors.nombre && <p className="mt-1 text-sm text-red-400">{errors.nombre}</p>}
                </div>

                <div>
                  <label htmlFor="info-email" className="block text-xs font-medium text-brand-300 mb-1">
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
                    className={inputClass}
                    required
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="info-phone" className="block text-xs font-medium text-brand-300 mb-1">
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
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="info-empresa" className="block text-xs font-medium text-brand-300 mb-1">
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
                    className={inputClass}
                  />
                </div>

                {errors.submit && (
                  <p className="text-sm text-red-400 text-center font-medium">{errors.submit}</p>
                )}

                <Button type="submit" disabled={isLoading || progress < 80} className="w-full" variant="modern">
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
            initial={{ opacity: 0, scale: 0.88, rotateX: -12 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            {/* Estado 2 — Revelación (documento filtrado) */}
            <div className="relative overflow-hidden rounded-sm border border-amber-900/50 shadow-2xl shadow-black/50">
              {/* Marca de agua */}
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
                aria-hidden
              >
                <span className="select-none font-mono text-4xl sm:text-5xl font-bold uppercase tracking-[0.35em] text-amber-950 opacity-[0.07] -rotate-12 whitespace-nowrap">
                  Confidencial
                </span>
              </div>

              {/* Cabecera tipo dossier */}
              <div className="relative border-b border-amber-900/25 bg-gradient-to-r from-amber-950/90 via-stone-900/95 to-amber-950/90 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden />
                  <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] text-amber-200/90">
                    {copy.revealed.docStamp}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-amber-300/60 tracking-wider">{copy.revealed.docRef}</span>
              </div>

              {/* Cuerpo — papel filtrado */}
              <div className="relative bg-gradient-to-br from-stone-100 via-amber-50/95 to-stone-200/90 px-5 sm:px-8 py-6 sm:py-8 text-stone-900">
                <p className="font-mono text-[10px] uppercase tracking-widest text-amber-900/70 mb-4 border-b border-amber-900/15 pb-3">
                  {copy.revealed.docClassification}
                </p>

                <div className="flex items-center justify-center gap-2 mb-5">
                  <CalcCheckIcon className="text-amber-800 w-5 h-5 shrink-0" solid />
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-900">
                    {copy.revealed.badge}
                  </span>
                </div>

                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 text-center mb-5 tracking-tight border-b-2 border-double border-amber-900/25 pb-4">
                  {copy.revealed.title}
                </h2>

                {copy.revealed.body.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 24)}
                    className="font-serif text-sm sm:text-base text-stone-800 leading-relaxed mb-3 first-letter:text-2xl first-letter:font-bold first-letter:text-amber-900 first-letter:mr-0.5 first-letter:float-left"
                  >
                    {paragraph}
                  </p>
                ))}

                <ul className="mt-5 space-y-2.5 border-t border-dashed border-amber-900/20 pt-4">
                  {copy.revealed.bullets.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm font-mono text-stone-700 leading-snug">
                      <span className="text-amber-800 shrink-0 font-bold">▸</span>
                      {item}
                    </li>
                  ))}
                </ul>

                <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.25em] text-amber-900/45 text-center">
                  — Fin del extracto · No distribuir —
                </p>
              </div>
            </div>

            {/* Estado 3 — Misión 2 */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="glass-modern rounded-2xl border border-purple-500/30 p-5 sm:p-6"
            >
              <h3 className="text-lg font-bold text-white mb-2">{copy.mission2.title}</h3>
              <p className="text-sm text-brand-200/90 leading-relaxed mb-3">{copy.mission2.body}</p>
              <p className="text-xs text-brand-300/70 mb-4">{copy.mission2.emailHint}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/activar?utm_source=info&utm_medium=unlock&utm_campaign=sealed_envelope"
                  className="inline-flex justify-center py-2.5 px-5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  {copy.mission2.ctaActivar}
                </Link>
                <Link
                  href="/calculadora?utm_source=info&utm_medium=unlock&utm_campaign=sealed_envelope"
                  className="inline-flex justify-center py-2.5 px-5 border border-white/20 hover:bg-white/10 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  {copy.mission2.ctaCalculadora}
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
