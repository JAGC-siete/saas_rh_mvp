import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { Card, CardContent } from '../ui/card'
import BorderBeam from '../landing/BorderBeam'
import WizardStepProgress from '../funnel/WizardStepProgress'
import type { QuotationQuote, QuotationRequest, QuotationResponse } from '../../lib/ventas/types'
import { buildQuotationPlanSummary } from '../../lib/ventas/quote-display'
import { VENTAS_MAX_AUTO_QUOTE_TERMINALS } from '../../lib/ventas/modality-includes'
import {
  buildQuotationAcquisitionWhatsAppText,
  buildVentasSupportWhatsAppUrl,
} from '../../lib/ventas/bank-details'
import { getVentasModalityDefinition } from '../../lib/ventas/modality-includes'
import { buildModalityComparison } from '../../lib/ventas/modality-comparison'
import { isCountryCode, type CountryCode } from '../../lib/country/supported'
import {
  buildMetaApiTrackingFields,
  createMetaEventId,
  trackQuotationSubmit,
} from '../../lib/analytics/metaPixel'
import type { VentasUtmContext } from '../../lib/ventas-game/ventas-utm-context'
import { COTIZACION_GUIADA_COPY } from '../../lib/ventas-game/cotizacion-guiada-copy'
import {
  computeVentasErrors,
  ventasCompanyErrors,
  ventasDeliveryErrors,
  ventasScopeErrors,
  VENTAS_COUNTRY_LABEL,
  VENTAS_SECTOR_OPTIONS,
  type VentasValidationErrors,
} from '../../lib/ventas-game/ventas-form'
import { hasValidationErrors, omitValidationField } from '../../lib/forms/validation-errors'

type WizardStep = 'intro' | 'scope' | 'company' | 'delivery' | 'success'

type Props = {
  utmContext?: VentasUtmContext
  initialCountryCode?: CountryCode
}

const defaultForm = (country: CountryCode): QuotationRequest => ({
  contact_email: '',
  contact_name: '',
  company_name: '',
  phone: '',
  country_code: country,
  employees_count: 1,
  billing_modality: 'annual',
  terminals_count: 1,
  sector_rubro: '',
  coupon_code: '',
  consent_newsletter: true,
})

const VENTAS_WIZARD_STEPS: [string, string, string] = ['Alcance', 'Empresa', 'Entrega']

function wizardStepIndex(step: WizardStep): number {
  if (step === 'intro') return 0
  if (step === 'scope') return 1
  if (step === 'company') return 2
  if (step === 'delivery') return 3
  return 3
}

export default function CotizacionGuiadaLead({
  utmContext = {},
  initialCountryCode = 'HND',
}: Props) {
  const copy = COTIZACION_GUIADA_COPY
  const [step, setStep] = useState<WizardStep>('intro')
  const [showCoupon, setShowCoupon] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<VentasValidationErrors>({})
  const [formData, setFormData] = useState<QuotationRequest>(() => defaultForm(initialCountryCode))
  const [quote, setQuote] = useState<QuotationQuote | null>(null)

  const headline = utmContext.headline ?? copy.intro.headline
  const subheadline = utmContext.subheadline ?? copy.intro.subheadline
  const wizardStep = wizardStepIndex(step)
  const countryLabel =
    formData.country_code && isCountryCode(formData.country_code)
      ? VENTAS_COUNTRY_LABEL[formData.country_code]
      : ''

  const planSummary = useMemo(() => (quote ? buildQuotationPlanSummary({ quote }) : null), [quote])
  const modalityComparison = useMemo(() => (quote ? buildModalityComparison({ quote }) : null), [quote])

  const whatsappUrl = useMemo(() => {
    if (step !== 'success') return ''
    const msg = buildQuotationAcquisitionWhatsAppText({
      contactName: formData.contact_name,
      companyName: formData.company_name,
      includeBankPrompt: true,
    })
    return buildVentasSupportWhatsAppUrl(msg)
  }, [step, formData.contact_name, formData.company_name])

  const patchForm = (patch: Partial<QuotationRequest>) => {
    setFormData((prev) => ({ ...prev, ...patch }))
    setErrors((prev) => (prev.submit ? omitValidationField(prev, 'submit') : prev))
  }

  const goScope = () => {
    setErrors({})
    setStep('scope')
  }

  const goCompany = () => {
    const e = ventasScopeErrors(formData)
    if (hasValidationErrors(e)) {
      setErrors(e)
      return
    }
    setErrors({})
    setStep('company')
  }

  const goDelivery = () => {
    const e = ventasCompanyErrors(formData)
    if (hasValidationErrors(e)) {
      setErrors(e)
      return
    }
    setErrors({})
    setStep('delivery')
  }

  const handleSubmit = async () => {
    const all = computeVentasErrors(formData)
    if (hasValidationErrors(all)) {
      setErrors(all)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const metaEventId = createMetaEventId('ventas')
      const quotationPayload: QuotationRequest = {
        contact_email: formData.contact_email.trim(),
        contact_name: formData.contact_name?.trim() || '',
        company_name: formData.company_name?.trim() || '',
        phone: formData.phone?.trim() || '',
        country_code: isCountryCode(formData.country_code) ? formData.country_code : 'HND',
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
        body: JSON.stringify({
          ...quotationPayload,
          ...buildMetaApiTrackingFields(metaEventId),
        }),
      })

      const data = (await resp.json()) as QuotationResponse | { error?: string }
      if (!resp.ok) {
        setErrors({ submit: (data as { error?: string })?.error || 'No se pudo completar la solicitud.' })
        return
      }

      const responseQuote = (data as QuotationResponse).quote || null
      setQuote(responseQuote)
      trackQuotationSubmit({
        eventId: metaEventId,
        email: quotationPayload.contact_email,
        phone: quotationPayload.phone || undefined,
        firstName: quotationPayload.contact_name || undefined,
        employeesCount: quotationPayload.employees_count,
        countryCode: quotationPayload.country_code,
        billingModality: quotationPayload.billing_modality,
        quoteValue:
          responseQuote?.billing_modality === 'monthly'
            ? responseQuote.monthly_total
            : responseQuote?.annual_total,
        currency: responseQuote?.currency,
      })
      setStep('success')
    } catch {
      setErrors({ submit: 'No se pudo enviar. Revise su conexión e intente de nuevo.' })
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    'w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all hover:bg-white/10'

  if (step === 'success') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircleIcon className="h-12 w-12 text-green-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">{copy.success.title}</h1>
            <p className="text-lg text-brand-300 mb-6">{copy.success.emailHint(formData.contact_email)}</p>
            {countryLabel && (
              <p className="text-sm text-brand-400">
                Legislación aplicada: <strong className="text-cyan-100/90">{countryLabel}</strong>
              </p>
            )}
          </div>

          {quote && (
            <Card variant="liquid" className="mb-8 text-left">
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-xl font-bold text-white mb-4">Resumen de inversión</h2>
                <div className="space-y-2 text-brand-200 text-sm">
                  <p>
                    <strong>Modalidad:</strong> {getVentasModalityDefinition(quote.billing_modality).label}
                  </p>
                  <p>
                    <strong>Rango tarifario:</strong> {quote.tier.min_employees}–{quote.tier.max_employees}{' '}
                    empleados
                  </p>
                  {planSummary && (
                    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 space-y-2">
                      {planSummary.lines.map((line) => (
                        <p key={line.label}>
                          <strong>{line.label}:</strong> {line.value}
                        </p>
                      ))}
                      <p className="text-base font-semibold text-emerald-300 pt-1">
                        {planSummary.totalLabel}: {planSummary.totalValue}
                      </p>
                    </div>
                  )}
                  {modalityComparison && (
                    <div className="mt-4 rounded-xl border border-slate-400/25 bg-slate-500/10 p-4 space-y-2">
                      <p className="font-semibold text-slate-100">{modalityComparison.title}</p>
                      {modalityComparison.lines.map((line) => (
                        <p key={`alt-${line.label}`}>
                          <strong>{line.label}:</strong> {line.value}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {whatsappUrl && (
            <Card variant="liquid" className="mb-8 border-emerald-400/20 text-left">
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-xl font-bold text-white mb-2">¿Listo para formalizar?</h2>
                <p className="text-sm text-cyan-100/80 mb-6">{copy.success.contractHint}</p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 font-semibold transition-colors"
                >
                  {copy.success.contractCta}
                </a>
              </CardContent>
            </Card>
          )}

          <Link href="/" className="inline-flex items-center text-brand-300 hover:text-white transition-colors">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver al inicio
          </Link>
        </div>
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
              title="Cotización guiada"
              stepLabels={VENTAS_WIZARD_STEPS}
              gradientClass="from-emerald-500 to-cyan-500"
              dotClass="bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] ring-emerald-400/40"
            />

            <AnimatePresence mode="wait">
              {step === 'intro' && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-center"
                >
                  <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 mb-4">
                    <ShieldCheckIcon className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                    {copy.badge}
                  </span>
                  <DocumentTextIcon className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight">{headline}</h1>
                  <p className="text-brand-300 mb-8 max-w-lg mx-auto">{subheadline}</p>
                  <button
                    type="button"
                    onClick={goScope}
                    className="w-full sm:w-auto btn-shiny bg-brand-500 hover:bg-brand-600 text-white px-8 py-4 rounded-xl font-semibold inline-flex items-center justify-center"
                  >
                    <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                    {copy.intro.cta}
                  </button>
                </motion.div>
              )}

              {step === 'scope' && (
                <motion.div key="scope" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                  <h2 className="text-xl font-bold text-white mb-1">{copy.scope.title}</h2>
                  <p className="text-brand-400 text-sm mb-6">{copy.scope.subtitle}</p>

                  <div className="space-y-5">
                    <div>
                      <label htmlFor="ventas-country" className="block text-white font-medium mb-2 text-sm">
                        País de operación *
                      </label>
                      <select
                        id="ventas-country"
                        value={formData.country_code || 'HND'}
                        onChange={(e) => {
                          const v = e.target.value
                          if (isCountryCode(v)) patchForm({ country_code: v })
                        }}
                        className={`${inputClass} ${errors.country_code ? 'border-red-500/50' : ''}`}
                      >
                        <option value="HND" className="bg-slate-800">Honduras</option>
                        <option value="SLV" className="bg-slate-800">El Salvador</option>
                        <option value="GTM" className="bg-slate-800">Guatemala</option>
                      </select>
                      {errors.country_code && <p className="text-red-400 text-xs mt-2">{errors.country_code}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">Modalidad</label>
                        <select
                          value={formData.billing_modality || 'annual'}
                          onChange={(e) => patchForm({ billing_modality: e.target.value as 'annual' | 'monthly' })}
                          className={inputClass}
                        >
                          <option value="annual" className="bg-slate-800">Anual (recomendado)</option>
                          <option value="monthly" className="bg-slate-800">Mensual</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">Terminales</label>
                        <select
                          value={Number(formData.terminals_count) || 1}
                          onChange={(e) => patchForm({ terminals_count: parseInt(e.target.value, 10) || 1 })}
                          className={`${inputClass} ${errors.terminals_count ? 'border-red-500/50' : ''}`}
                        >
                          {Array.from({ length: VENTAS_MAX_AUTO_QUOTE_TERMINALS }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n} className="bg-slate-800">
                              {n === 1 ? '1 terminal' : `${n} terminales`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-2 text-sm">Empleados en planilla *</label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={Number(formData.employees_count)}
                        onChange={(e) => patchForm({ employees_count: parseInt(e.target.value, 10) || 1 })}
                        className={`${inputClass} ${errors.employees_count ? 'border-red-500/50' : ''}`}
                      />
                      {errors.employees_count && (
                        <p className="text-red-400 text-xs mt-2">{errors.employees_count}</p>
                      )}
                      {countryLabel && (
                        <p className="text-xs text-brand-400 mt-2">
                          {copy.scope.tierHint(Number(formData.employees_count), countryLabel)}
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-brand-300 bg-black/20 p-3 rounded-lg border border-white/10">
                      {
                        getVentasModalityDefinition(
                          (formData.billing_modality || 'annual') === 'monthly' ? 'monthly' : 'annual'
                        ).formHint
                      }
                    </p>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button type="button" onClick={() => setStep('intro')} className="text-brand-300 text-sm px-4 py-3">
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={goCompany}
                      className="flex-1 btn-shiny bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold"
                    >
                      Siguiente
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'company' && (
                <motion.div key="company" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                  <h2 className="text-xl font-bold text-white mb-1">{copy.company.title}</h2>
                  <p className="text-brand-400 text-sm mb-6">{copy.company.subtitle}</p>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-white font-medium mb-2 text-sm">Nombre de la empresa *</label>
                      <input
                        type="text"
                        value={formData.company_name || ''}
                        onChange={(e) => patchForm({ company_name: e.target.value })}
                        className={`${inputClass} ${errors.company_name ? 'border-red-500/50' : ''}`}
                        placeholder="Ej. Comercializadora del Norte S.A."
                      />
                      {errors.company_name && <p className="text-red-400 text-xs mt-2">{errors.company_name}</p>}
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-2 text-sm">Rubro (opcional)</label>
                      <select
                        value={formData.sector_rubro || ''}
                        onChange={(e) => patchForm({ sector_rubro: e.target.value })}
                        className={inputClass}
                      >
                        {VENTAS_SECTOR_OPTIONS.map((opt) => (
                          <option key={opt.value || 'empty'} value={opt.value} className="bg-slate-800">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!showCoupon ? (
                      <button
                        type="button"
                        onClick={() => setShowCoupon(true)}
                        className="text-sm text-emerald-300 hover:text-emerald-200"
                      >
                        {copy.company.couponToggle}
                      </button>
                    ) : (
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">Cupón</label>
                        <input
                          type="text"
                          value={formData.coupon_code || ''}
                          onChange={(e) => patchForm({ coupon_code: e.target.value })}
                          className={inputClass}
                          placeholder="Código si aplica"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button type="button" onClick={() => setStep('scope')} className="text-brand-300 text-sm px-4 py-3">
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={goDelivery}
                      className="flex-1 btn-shiny bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold"
                    >
                      Siguiente
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'delivery' && (
                <motion.div key="delivery" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                  <h2 className="text-xl font-bold text-white mb-1">{copy.delivery.title}</h2>
                  <p className="text-brand-400 text-sm mb-6">{copy.delivery.subtitle}</p>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-white font-medium mb-2 text-sm">Correo corporativo *</label>
                      <input
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => patchForm({ contact_email: e.target.value })}
                        className={`${inputClass} ${errors.contact_email ? 'border-red-500/50' : ''}`}
                        placeholder="admin@miempresa.com"
                      />
                      {errors.contact_email && <p className="text-red-400 text-xs mt-2">{errors.contact_email}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">Su nombre (opcional)</label>
                        <input
                          type="text"
                          value={formData.contact_name || ''}
                          onChange={(e) => patchForm({ contact_name: e.target.value })}
                          className={inputClass}
                          placeholder="Nombre y apellido"
                        />
                      </div>
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">Teléfono / WhatsApp</label>
                        <input
                          type="tel"
                          value={formData.phone || ''}
                          onChange={(e) => patchForm({ phone: e.target.value })}
                          className={inputClass}
                          placeholder="+504 9999-9999"
                          inputMode="tel"
                        />
                      </div>
                    </div>
                  </div>

                  {errors.submit && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mt-4">
                      <p className="text-red-400 text-sm text-center">{errors.submit}</p>
                    </div>
                  )}

                  <p className="text-white/45 text-xs text-center mt-4 leading-relaxed">{copy.delivery.finePrint}</p>

                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setStep('company')} className="text-brand-300 text-sm px-4 py-3">
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isLoading || hasValidationErrors(ventasDeliveryErrors(formData))}
                      className="flex-1 btn-shiny bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold inline-flex items-center justify-center disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          {copy.delivery.submitting}
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                          {copy.delivery.submit}
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
