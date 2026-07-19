import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CloudIcon,
} from '@heroicons/react/24/outline'
import { Card, CardContent } from '../ui/card'
import BorderBeam from '../landing/BorderBeam'
import WizardStepProgress from '../funnel/WizardStepProgress'
import { TRIAL_CONFIG } from '../../lib/config/trial'
import {
  activarStep1Errors,
  activarStep2Errors,
  COUNTRY_LABEL,
  computeActivarErrors,
  defaultCallingCodeForPayrollCountry,
  type ActivarFormData,
  type ActivarValidationErrors,
} from '../../lib/activar-game/activar-form'
import { hasValidationErrors, omitValidationField } from '../../lib/forms/validation-errors'
import type { ActivarUtmContext } from '../../lib/activar-game/activar-utm-context'
import { MOTOR_ENCENDIDO_COPY } from '../../lib/activar-game/motor-encendido-copy'
import { isCountryCode, type CountryCode } from '../../lib/country/supported'
import { normalizeSoftPhone } from '../../lib/privacy'
import {
  buildMetaApiTrackingFields,
  createMetaEventId,
  trackActivationTrialSubmit,
} from '../../lib/analytics/metaPixel'
import { trackActivationFormSubmit } from '../../lib/analytics/googleAds'

const WHATSAPP_CALLING_CODES: { code: string; country: string }[] = [
  { code: '+1', country: 'Estados Unidos / Canadá' },
  { code: '+52', country: 'México' },
  { code: '+503', country: 'El Salvador' },
  { code: '+504', country: 'Honduras' },
  { code: '+502', country: 'Guatemala' },
  { code: '+505', country: 'Nicaragua' },
  { code: '+506', country: 'Costa Rica' },
  { code: '+507', country: 'Panamá' },
  { code: '+57', country: 'Colombia' },
  { code: '+51', country: 'Perú' },
  { code: '+56', country: 'Chile' },
  { code: '+54', country: 'Argentina' },
  { code: '+58', country: 'Venezuela' },
  { code: '+34', country: 'España' },
]

type WizardStep = 'intrigue' | 'config' | 'account' | 'confirm' | 'success'

type Props = {
  utmContext?: ActivarUtmContext
  initialCountryCode?: CountryCode
}

const ACTIVAR_WIZARD_STEPS: [string, string, string] = [...MOTOR_ENCENDIDO_COPY.wizardSteps]

function wizardStepIndex(step: WizardStep): number {
  if (step === 'intrigue') return 0
  if (step === 'config') return 1
  if (step === 'account') return 2
  if (step === 'confirm') return 3
  return 3
}

function motorLightsOn(step: WizardStep): number {
  if (step === 'intrigue') return 0
  if (step === 'config') return 1
  if (step === 'account') return 2
  return 3
}

export default function MotorEncendidoLead({ utmContext = {}, initialCountryCode = 'HND' }: Props) {
  const copy = MOTOR_ENCENDIDO_COPY
  const [step, setStep] = useState<WizardStep>('intrigue')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<ActivarValidationErrors>({})
  const [formData, setFormData] = useState<ActivarFormData>({
    empleados: 1,
    empresa: '',
    nombre: '',
    whatsappCountryCallingCode: defaultCallingCodeForPayrollCountry(initialCountryCode),
    whatsappNumber: '',
    contactoEmail: '',
    departamentos: 1,
    aceptaTrial: true,
    countryCode: initialCountryCode,
  })

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      countryCode: initialCountryCode,
      whatsappCountryCallingCode: prev.whatsappNumber.trim()
        ? prev.whatsappCountryCallingCode
        : defaultCallingCodeForPayrollCountry(initialCountryCode),
    }))
  }, [initialCountryCode])

  const headline = utmContext.headline ?? copy.intrigue.headline
  const subheadline = utmContext.subheadline ?? copy.intrigue.subheadline
  const wizardStep = wizardStepIndex(step)
  const lights = motorLightsOn(step)
  const countryLabel = isCountryCode(formData.countryCode) ? COUNTRY_LABEL[formData.countryCode] : ''

  const patchForm = (patch: Partial<ActivarFormData>) => {
    const next = { ...formData, ...patch }
    setFormData(next)
    setErrors((prev) => (prev.submit ? omitValidationField(prev, 'submit') : prev))
  }

  const handleEmpleadosChange = (value: number) => {
    const n = Math.max(TRIAL_CONFIG.MIN_EMPLOYEES, Math.min(TRIAL_CONFIG.MAX_EMPLOYEES, value))
    patchForm({ empleados: n })
  }

  const goConfig = () => {
    setErrors({})
    setStep('config')
  }

  const goAccount = () => {
    const e = activarStep1Errors(formData)
    if (hasValidationErrors(e)) {
      setErrors(e)
      return
    }
    setErrors({})
    setStep('account')
  }

  const goConfirm = () => {
    const e = activarStep2Errors(formData)
    if (hasValidationErrors(e)) {
      setErrors(e)
      return
    }
    setErrors({})
    setStep('confirm')
  }

  const handleSubmit = async () => {
    const allErrors = computeActivarErrors(formData)
    if (hasValidationErrors(allErrors)) {
      setErrors(allErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const metaEventId = createMetaEventId('activar')
      const submitData = {
        empleados: formData.empleados,
        empresa: formData.empresa.trim(),
        nombre: formData.nombre?.trim() || '',
        contactoWhatsApp:
          normalizeSoftPhone(`${formData.whatsappCountryCallingCode} ${formData.whatsappNumber}`) || '',
        contactoEmail: formData.contactoEmail.trim(),
        departamentos: formData.departamentos,
        aceptaTrial: formData.aceptaTrial || false,
        countryCode: formData.countryCode,
        ...buildMetaApiTrackingFields(metaEventId),
      }

      const response = await fetch('/api/activar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      let data: { error?: string }
      try {
        data = await response.json()
      } catch {
        data = { error: 'Error al procesar tu solicitud. Por favor, intenta de nuevo.' }
      }

      if (response.ok) {
        trackActivationFormSubmit(submitData.contactoEmail, submitData.empresa, submitData.empleados)
        trackActivationTrialSubmit({
          eventId: metaEventId,
          email: submitData.contactoEmail,
          phone: submitData.contactoWhatsApp || undefined,
          firstName: submitData.nombre || undefined,
          countryCode: submitData.countryCode,
        })
        setStep('success')
      } else {
        setErrors({ submit: data.error || 'Error al procesar tu solicitud. Por favor, intenta de nuevo.' })
      }
    } catch {
      setErrors({ submit: 'Error de conexión. Verifica tu internet e intenta de nuevo.' })
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    'w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all hover:border-cyan-400/30 hover:bg-white/10'

  if (step === 'success') {
    const displayName = formData.nombre.trim() || 'Equipo'
    return (
      <div className="max-w-2xl mx-auto text-center px-4 py-8">
        <div className="mb-8">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="h-12 w-12 text-green-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {copy.success.title(displayName)}
          </h1>
          <p className="text-lg text-brand-300 mb-6">
            {copy.success.body(countryLabel || 'tu país', formData.empresa, formData.empleados)}
          </p>
          <p className="text-brand-300">{copy.success.emailHint}</p>
        </div>

        <Card variant="liquid" className="mb-8 text-left">
          <CardContent className="p-6 sm:p-8">
            <p className="text-white font-medium mb-2">{copy.success.biometricHint}</p>
            <p className="text-sm text-brand-400 mt-4">
              {formData.contactoEmail} · humanosisu@humanosisu.net
            </p>
          </CardContent>
        </Card>

        <Link href="/" className="inline-flex items-center text-brand-300 hover:text-white transition-colors">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Volver a inicio
        </Link>
      </div>
    )
  }

  return (
    <div className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <BorderBeam className="w-full max-w-3xl">
        <Card variant="liquid" className="w-full shadow-2xl relative overflow-hidden">
          <CardContent className="p-6 sm:p-8 lg:p-10 relative z-10">
            <WizardStepProgress
              step={wizardStep}
              title={copy.progressTitle}
              stepLabels={ACTIVAR_WIZARD_STEPS}
              gradientClass="from-cyan-500 to-brand-500"
            />

            <AnimatePresence mode="wait">
              {step === 'intrigue' && (
                <motion.div
                  key="intrigue"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-center"
                >
                  <span className="inline-block px-3 py-1 mb-6 text-xs font-medium rounded-full bg-brand-500/20 text-brand-200 border border-brand-500/30">
                    {copy.badge}
                  </span>
                  <p className="activar-serif activar-hero-eyebrow text-white mb-3">
                    {copy.intrigue.eyebrow}
                  </p>
                  <h1 className="activar-serif activar-hero-title italic text-white mb-6">
                    {headline}
                  </h1>
                  <p className="activar-hero-body text-brand-200/90 mb-10 max-w-md mx-auto font-sans">
                    {subheadline}
                  </p>

                  <div className="flex justify-center gap-3 mb-10">
                    {copy.intrigue.motorLabels.map((label, i) => (
                      <div key={label} className="flex flex-col items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full border ${
                            i < lights ? 'bg-cyan-400 border-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.6)]' : 'bg-white/10 border-white/20'
                          }`}
                        />
                        <span className="text-[10px] sm:text-xs text-brand-400">{label}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={goConfig}
                    className="w-full sm:w-auto activar-cta-cloud px-8 py-4 rounded-xl font-semibold inline-flex items-center justify-center transition-all"
                  >
                    <CloudIcon className="h-5 w-5 mr-2" />
                    {copy.intrigue.cta}
                  </button>
                </motion.div>
              )}

              {step === 'config' && (
                <motion.div key="config" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                  <h2 className="text-xl font-bold text-white mb-1">{copy.step1.title}</h2>
                  <p className="text-brand-400 text-sm mb-6">{copy.step1.subtitle}</p>

                  <div className="space-y-5">
                    <div>
                      <label htmlFor="activar-country" className="block text-white font-medium mb-2">
                        País de operación *
                      </label>
                      <select
                        id="activar-country"
                        value={formData.countryCode}
                        onChange={(e) => {
                          const v = e.target.value
                          if (!isCountryCode(v)) return
                          const patch: Partial<ActivarFormData> = { countryCode: v }
                          if (!formData.whatsappNumber.trim()) {
                            patch.whatsappCountryCallingCode = defaultCallingCodeForPayrollCountry(v)
                          }
                          patchForm(patch)
                        }}
                        className={`${inputClass} ${errors.countryCode ? 'border-red-500/50' : ''}`}
                      >
                        <option value="HND">Honduras</option>
                        <option value="SLV">El Salvador</option>
                        <option value="GTM">Guatemala</option>
                      </select>
                      {errors.countryCode && <p className="text-red-400 text-sm mt-2">{errors.countryCode}</p>}
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-2 text-center"># empleados de prueba *</label>
                      <div className="flex items-center justify-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleEmpleadosChange(formData.empleados - 1)}
                          disabled={formData.empleados <= TRIAL_CONFIG.MIN_EMPLOYEES}
                          className="w-11 h-11 rounded-full bg-white/10 border border-white/20 text-white text-xl disabled:opacity-30"
                        >
                          −
                        </button>
                        <div className="text-center">
                          <span className="text-4xl font-bold text-white tabular-nums">{formData.empleados}</span>
                          <p className="text-brand-400 text-xs mt-1">{copy.step1.empleadosHint(formData.empleados)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEmpleadosChange(formData.empleados + 1)}
                          disabled={formData.empleados >= TRIAL_CONFIG.MAX_EMPLOYEES}
                          className="w-11 h-11 rounded-full bg-white/10 border border-white/20 text-white text-xl disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                      {errors.empleados && <p className="text-red-400 text-sm mt-2 text-center">{errors.empleados}</p>}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button type="button" onClick={() => setStep('intrigue')} className="text-brand-300 text-sm px-4 py-3">
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={goAccount}
                      className="flex-1 btn-shiny bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold"
                    >
                      Siguiente
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'account' && (
                <motion.div key="account" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                  <h2 className="text-xl font-bold text-white mb-1">{copy.step2.title}</h2>
                  <p className="text-brand-400 text-sm mb-6">{copy.step2.subtitle}</p>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-white font-medium mb-2">Nombre de la empresa *</label>
                      <input
                        type="text"
                        value={formData.empresa}
                        onChange={(e) => patchForm({ empresa: e.target.value })}
                        className={`${inputClass} ${errors.empresa ? 'border-red-500/50' : ''}`}
                        placeholder="Mi Empresa S.A."
                      />
                      {errors.empresa && <p className="text-red-400 text-sm mt-2">{errors.empresa}</p>}
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-2">{copy.step2.emailLabel}</label>
                      <input
                        type="email"
                        value={formData.contactoEmail}
                        onChange={(e) => patchForm({ contactoEmail: e.target.value })}
                        className={`${inputClass} ${errors.contactoEmail ? 'border-red-500/50' : ''}`}
                        placeholder="admin@miempresa.com"
                      />
                      {errors.contactoEmail && <p className="text-red-400 text-sm mt-2">{errors.contactoEmail}</p>}
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-2">Tu nombre (opcional)</label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => patchForm({ nombre: e.target.value })}
                        className={inputClass}
                        placeholder="María González"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button type="button" onClick={() => setStep('config')} className="text-brand-300 text-sm px-4 py-3">
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={goConfirm}
                      className="flex-1 btn-shiny bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold"
                    >
                      Siguiente
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'confirm' && (
                <motion.div key="confirm" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                  <h2 className="text-xl font-bold text-white mb-1">{copy.step3.title}</h2>
                  <p className="text-brand-400 text-sm mb-6">{copy.step3.subtitle}</p>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-white font-medium mb-2">WhatsApp (opcional)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
                        <select
                          value={formData.whatsappCountryCallingCode}
                          onChange={(e) => patchForm({ whatsappCountryCallingCode: e.target.value })}
                          className={inputClass}
                        >
                          {WHATSAPP_CALLING_CODES.map((opt) => (
                            <option key={opt.code} value={opt.code} className="bg-slate-800">
                              {opt.code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={formData.whatsappNumber}
                          onChange={(e) => patchForm({ whatsappNumber: e.target.value })}
                          className={`${inputClass} ${errors.contactoWhatsApp ? 'border-red-500/50' : ''}`}
                          placeholder="9999-9999"
                          inputMode="tel"
                        />
                      </div>
                      {errors.contactoWhatsApp && (
                        <p className="text-red-400 text-sm mt-2">{errors.contactoWhatsApp}</p>
                      )}
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-brand-600/10 rounded-xl border border-brand-500/30">
                      <input
                        type="checkbox"
                        id="acepta-trial"
                        checked={formData.aceptaTrial}
                        onChange={(e) => patchForm({ aceptaTrial: e.target.checked })}
                        className="mt-1 w-5 h-5 rounded cursor-pointer"
                      />
                      <label htmlFor="acepta-trial" className="text-white text-sm leading-relaxed cursor-pointer">
                        {copy.step3.checkbox}
                        <span className="block text-brand-200/70 text-xs mt-2">{copy.step3.checkboxFine}</span>
                      </label>
                    </div>
                  </div>

                  {errors.submit && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mt-4">
                      <p className="text-red-400 text-sm text-center">{errors.submit}</p>
                    </div>
                  )}

                  <div className="flex gap-3 mt-8">
                    <button type="button" onClick={() => setStep('account')} className="text-brand-300 text-sm px-4 py-3">
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="flex-1 btn-shiny bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold inline-flex items-center justify-center disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          {copy.step3.submitting}
                        </>
                      ) : (
                        <>
                          <CloudIcon className="h-5 w-5 mr-2" />
                          {copy.step3.submit}
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </BorderBeam>
    </div>
  )
}
