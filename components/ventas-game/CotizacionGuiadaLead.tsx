import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  DocumentTextIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { Card, CardContent } from '../ui/card'
import BorderBeam from '../landing/BorderBeam'
import WizardStepProgress from '../funnel/WizardStepProgress'
import type { QuotationRequest, QuotationResponse } from '../../lib/ventas/types'
import {
  buildQuotationAcquisitionWhatsAppText,
  buildVentasSupportWhatsAppUrl,
} from '../../lib/ventas/bank-details'
import {
  mergeVentasBusinessRules,
  type VentasBusinessRules,
} from '../../lib/ventas/business-rules'
import {
  computeLadderQuote,
  FALLBACK_LADDER_PLANS,
  findLadderPlan,
  isLadderPlanKey,
  LADDER_PLAN_KEYS,
  LADDER_PLAN_MODULES,
  ladderPlanPrices,
  ladderTerminalUnitPrice,
  parseLadderPlanKey,
  parseLadderPlans,
  type LadderPlanKey,
  type LadderPlanPrice,
} from '../../lib/ventas/ladder'
import { buildLadderPlanSummary } from '../../lib/ventas/ladder-display'
import { formatMoney } from '../../lib/ventas/pricing'
import { isCountryCode, currencyForCountryCode, type CountryCode } from '../../lib/country/supported'
import {
  buildMetaApiTrackingFields,
  createMetaEventId,
  trackQuotationSubmit,
} from '../../lib/analytics/metaPixel'
import { maskEmailForHint, writeThankYouContext } from '../../lib/analytics/thank-you-context'
import type { VentasUtmContext } from '../../lib/ventas-game/ventas-utm-context'
import { COTIZACION_GUIADA_COPY } from '../../lib/ventas-game/cotizacion-guiada-copy'
import {
  ventasCompanyErrors,
  ventasDeliveryErrors,
  VENTAS_COUNTRY_LABEL,
  VENTAS_PHONE_PLACEHOLDER,
  VENTAS_SECTOR_OPTIONS,
} from '../../lib/ventas-game/ventas-form'
import {
  ladderAllErrors,
  ladderFormNeedsCustomQuote,
  ladderScopeErrors,
  ladderTerminalOptionLabel,
  type LadderValidationErrors,
} from '../../lib/ventas-game/ladder-form'
import { hasValidationErrors, omitValidationField } from '../../lib/forms/validation-errors'

type WizardStep = 'intro' | 'scope' | 'company' | 'delivery'

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
  plan_key: 'basic',
  employees_count: Number.NaN,
  billing_modality: 'annual',
  terminals_count: 1,
  sector_rubro: '',
  consent_newsletter: true,
})

const VENTAS_WIZARD_STEPS: [string, string, string] = ['Plan', 'Empresa', 'Entrega']

type ErrorField = Exclude<keyof LadderValidationErrors, 'submit'>

/** Order matters: focusFirstError picks the first field with an error in this order. */
const FIELD_IDS: Record<ErrorField, string> = {
  country_code: 'ventas-country',
  plan_key: 'ventas-plan',
  billing_modality: 'ventas-modality',
  employees_count: 'ventas-employees',
  terminals_count: 'ventas-terminals',
  company_name: 'ventas-company',
  contact_email: 'ventas-email',
}

const FIELD_STEP: Record<ErrorField, WizardStep> = {
  country_code: 'scope',
  plan_key: 'scope',
  billing_modality: 'scope',
  employees_count: 'scope',
  terminals_count: 'scope',
  company_name: 'company',
  contact_email: 'delivery',
}

function firstErrorField(errors: LadderValidationErrors): ErrorField | null {
  const fields = Object.keys(FIELD_IDS) as ErrorField[]
  return fields.find((f) => Boolean(errors[f])) ?? null
}

function focusFirstError(errors: LadderValidationErrors) {
  const field = firstErrorField(errors)
  if (!field) return
  // AnimatePresence mode="wait" mounts a new step only after the exit animation,
  // so retry for a few frames until the field exists.
  let attempts = 30
  const tryFocus = () => {
    const el = document.getElementById(FIELD_IDS[field])
    if (el) el.focus()
    else if (--attempts > 0) requestAnimationFrame(tryFocus)
  }
  requestAnimationFrame(tryFocus)
}

function fieldA11y(field: ErrorField, errors: LadderValidationErrors) {
  const id = FIELD_IDS[field]
  return {
    id,
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `${id}-error` : undefined,
  }
}

function FieldError({ field, errors }: { field: ErrorField; errors: LadderValidationErrors }) {
  if (!errors[field]) return null
  return (
    <p id={`${FIELD_IDS[field]}-error`} className="text-red-400 text-xs mt-2">
      {errors[field]}
    </p>
  )
}

function ChoiceCard({
  checked,
  onSelect,
  title,
  price,
  children,
  id,
}: {
  checked: boolean
  onSelect: () => void
  title: string
  price?: string | null
  children?: ReactNode
  id?: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
        checked ? 'border-emerald-400/70 bg-emerald-500/10' : 'border-white/15 bg-white/5 hover:bg-white/10'
      }`}
    >
      <span className="block text-white font-semibold">{title}</span>
      {price ? <span className="block text-emerald-300 text-sm font-semibold tabular-nums">{price}</span> : null}
      {children ? <span className="mt-1 block text-xs text-brand-300 leading-relaxed">{children}</span> : null}
    </button>
  )
}

function wizardStepIndex(step: WizardStep): number {
  if (step === 'intro') return 0
  if (step === 'scope') return 1
  if (step === 'company') return 2
  return 3
}

export default function CotizacionGuiadaLead({
  utmContext = {},
  initialCountryCode = 'HND',
}: Props) {
  const router = useRouter()
  const copy = COTIZACION_GUIADA_COPY
  const [step, setStep] = useState<WizardStep>('intro')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<LadderValidationErrors>({})
  const [formData, setFormData] = useState<QuotationRequest>(() => defaultForm(initialCountryCode))
  const [employeesText, setEmployeesText] = useState('')
  const [rules, setRules] = useState<VentasBusinessRules>(() => mergeVentasBusinessRules(null))
  const [plans, setPlans] = useState<LadderPlanPrice[]>(FALLBACK_LADDER_PLANS)
  const [pricesAvailable, setPricesAvailable] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/ventas/public-config', { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok || cancelled) return
        setRules(mergeVentasBusinessRules(data.business_rules || data))
        if (Array.isArray(data.plans) && data.plans.length > 0) {
          setPlans(parseLadderPlans(data.plans))
          setPricesAvailable(data.plans.every((p: { monthly_price_hnl?: unknown }) => p.monthly_price_hnl != null))
        }
      } catch {
        /* keep defaults */
      }
    }

    load()
    const onVis = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  // The home pricing cards link here with ?plan=pro|enterprise.
  useEffect(() => {
    if (!router.isReady) return
    const fromQuery = parseLadderPlanKey(router.query.plan)
    if (fromQuery) setFormData((prev) => ({ ...prev, plan_key: fromQuery }))
  }, [router.isReady, router.query.plan])

  const headline = utmContext.headline ?? copy.intro.headline
  const subheadline = utmContext.subheadline ?? copy.intro.subheadline
  const wizardStep = wizardStepIndex(step)
  const countryCode: CountryCode = isCountryCode(formData.country_code) ? formData.country_code : 'HND'
  const currency = currencyForCountryCode(countryCode)
  const fmt = (n: number) => formatMoney(currency, n)
  const planKey: LadderPlanKey = isLadderPlanKey(formData.plan_key) ? formData.plan_key : 'basic'
  const plan = findLadderPlan(plans, planKey)
  const modality = formData.billing_modality === 'monthly' ? 'monthly' : 'annual'
  const prices = ladderPlanPrices(plan, currency)
  const employeesCount = Number(formData.employees_count)
  const terminalsCount = Number(formData.terminals_count) || 0
  const needsCustomQuote = ladderFormNeedsCustomQuote(formData, rules)
  const preview =
    Number.isInteger(employeesCount) && employeesCount >= 1 && !needsCustomQuote
      ? buildLadderPlanSummary({
          quote: computeLadderQuote({
            plan,
            billingModality: modality,
            terminalsCount,
            employeesCount,
            currency,
            rules,
          }),
        })
      : null
  const unitPriceLabel = fmt(ladderTerminalUnitPrice(currency, rules))
  const customQuoteUrl = buildVentasSupportWhatsAppUrl(
    `Hola, quiero una cotización a medida de Humano SISU para ${
      Number.isFinite(employeesCount) ? employeesCount : 'más de 300'
    } colaboradores en ${VENTAS_COUNTRY_LABEL[countryCode]}.`
  )

  const patchForm = (patch: Partial<QuotationRequest>) => {
    setFormData((prev) => ({ ...prev, ...patch }))
    setErrors((prev) => (prev.submit ? omitValidationField(prev, 'submit') : prev))
  }

  const goScope = () => {
    setErrors({})
    setStep('scope')
  }

  const goCompany = () => {
    const e = ladderScopeErrors(formData, rules)
    if (hasValidationErrors(e)) {
      setErrors(e)
      focusFirstError(e)
      return
    }
    setErrors({})
    setStep('company')
  }

  const goDelivery = () => {
    const e = ventasCompanyErrors(formData)
    if (hasValidationErrors(e)) {
      setErrors(e)
      focusFirstError(e)
      return
    }
    setErrors({})
    setStep('delivery')
  }

  const validateEmailOnBlur = () => {
    if (!formData.contact_email.trim()) return
    const e = ventasDeliveryErrors(formData)
    setErrors((prev) =>
      e.contact_email ? { ...prev, contact_email: e.contact_email } : omitValidationField(prev, 'contact_email')
    )
  }

  const submitStep = (next: () => void) => (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    next()
  }

  const handleSubmit = async () => {
    const all = ladderAllErrors(formData, rules)
    if (hasValidationErrors(all)) {
      setErrors(all)
      const field = firstErrorField(all)
      if (field) setStep(FIELD_STEP[field])
      focusFirstError(all)
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
        country_code: countryCode,
        plan_key: planKey,
        employees_count: employeesCount,
        billing_modality: modality,
        terminals_count: terminalsCount,
        sector_rubro: formData.sector_rubro?.trim() || '',
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

      const waMsg = buildQuotationAcquisitionWhatsAppText({
        contactName: quotationPayload.contact_name,
        companyName: quotationPayload.company_name,
        includeBankPrompt: true,
      })
      writeThankYouContext('ventas', {
        displayName: quotationPayload.contact_name || undefined,
        empresa: quotationPayload.company_name || undefined,
        empleados: quotationPayload.employees_count,
        countryCode: quotationPayload.country_code,
        emailHintMasked: maskEmailForHint(quotationPayload.contact_email),
        whatsappUrl: buildVentasSupportWhatsAppUrl(waMsg),
      })
      await router.push('/ventas/gracias')
      return
    } catch {
      setErrors({ submit: 'No se pudo enviar. Revisa tu conexión e intenta de nuevo.' })
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    'w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all hover:bg-white/10'

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
                <motion.form key="scope" noValidate onSubmit={submitStep(goCompany)} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                  <h2 className="text-xl font-bold text-white mb-1">{copy.scope.title}</h2>
                  <p className="text-brand-400 text-sm mb-6">{copy.scope.subtitle}</p>

                  <div className="space-y-5">
                    <div>
                      <label htmlFor={FIELD_IDS.country_code} className="block text-white font-medium mb-2 text-sm">
                        País de operación *
                      </label>
                      <select
                        {...fieldA11y('country_code', errors)}
                        value={countryCode}
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
                      <FieldError field="country_code" errors={errors} />
                    </div>

                    <div>
                      <p id="ventas-plan-label" className="block text-white font-medium mb-2 text-sm">
                        Plan *
                      </p>
                      <div
                        role="radiogroup"
                        aria-labelledby="ventas-plan-label"
                        aria-describedby={errors.plan_key ? `${FIELD_IDS.plan_key}-error` : undefined}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                      >
                        {LADDER_PLAN_KEYS.map((key, i) => {
                          const option = findLadderPlan(plans, key)
                          const optionPrices = ladderPlanPrices(option, currency)
                          return (
                            <ChoiceCard
                              key={key}
                              id={i === 0 ? FIELD_IDS.plan_key : undefined}
                              checked={planKey === key}
                              onSelect={() => patchForm({ plan_key: key })}
                              title={option.name}
                              price={pricesAvailable ? `${fmt(optionPrices.monthly)} / mes` : null}
                            >
                              {LADDER_PLAN_MODULES[key].join(' · ')}
                            </ChoiceCard>
                          )
                        })}
                      </div>
                      <FieldError field="plan_key" errors={errors} />
                    </div>

                    <div>
                      <p id="ventas-modality-label" className="block text-white font-medium mb-2 text-sm">
                        Forma de pago *
                      </p>
                      <div role="radiogroup" aria-labelledby="ventas-modality-label" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <ChoiceCard
                          id={FIELD_IDS.billing_modality}
                          checked={modality === 'monthly'}
                          onSelect={() => patchForm({ billing_modality: 'monthly' })}
                          title="Mensual"
                          price={pricesAvailable ? `${fmt(prices.monthly)} / mes` : null}
                        >
                          Sin permanencia. Los relojes se compran aparte.
                        </ChoiceCard>
                        <ChoiceCard
                          checked={modality === 'annual'}
                          onSelect={() => patchForm({ billing_modality: 'annual' })}
                          title="Anual"
                          price={pricesAvailable ? `${fmt(prices.annual)} / año` : null}
                        >
                          12 meses con {plan.included_terminals_annual} reloj biométrico incluido y arranque asistido.
                        </ChoiceCard>
                      </div>
                      <FieldError field="billing_modality" errors={errors} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor={FIELD_IDS.employees_count} className="block text-white font-medium mb-2 text-sm">
                          Colaboradores *
                        </label>
                        <input
                          {...fieldA11y('employees_count', errors)}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          value={employeesText}
                          onChange={(e) => {
                            setEmployeesText(e.target.value)
                            patchForm({ employees_count: e.target.value === '' ? Number.NaN : Number(e.target.value) })
                          }}
                          className={`${inputClass} ${errors.employees_count ? 'border-red-500/50' : ''}`}
                          placeholder="Ej. 25"
                        />
                        <FieldError field="employees_count" errors={errors} />
                        {!errors.employees_count && (
                          <p className="text-xs text-brand-400 mt-2">{copy.scope.employeesHint}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor={FIELD_IDS.terminals_count} className="block text-white font-medium mb-2 text-sm">
                          Relojes biométricos
                        </label>
                        <select
                          {...fieldA11y('terminals_count', errors)}
                          value={terminalsCount}
                          onChange={(e) => patchForm({ terminals_count: parseInt(e.target.value, 10) || 0 })}
                          className={`${inputClass} ${errors.terminals_count ? 'border-red-500/50' : ''}`}
                        >
                          {Array.from({ length: rules.max_auto_quote_terminals + 1 }, (_, n) => n).map((n) => (
                            <option key={n} value={n} className="bg-slate-800">
                              {ladderTerminalOptionLabel({
                                n,
                                modality,
                                includedAnnual: plan.included_terminals_annual,
                                unitPriceLabel: pricesAvailable ? unitPriceLabel : undefined,
                              })}
                            </option>
                          ))}
                        </select>
                        <FieldError field="terminals_count" errors={errors} />
                        {!errors.terminals_count && (
                          <p className="text-xs text-brand-400 mt-2">{copy.scope.terminalsHint}</p>
                        )}
                      </div>
                    </div>

                    {needsCustomQuote ? (
                      <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4">
                        <p className="text-amber-100 text-sm">{errors.employees_count || ladderScopeErrors(formData, rules).employees_count}</p>
                        <a
                          href={customQuoteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                        >
                          {copy.scope.customQuoteCta}
                        </a>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-black/20 p-4" aria-live="polite">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300 mb-2">
                          {copy.scope.summaryTitle}
                        </p>
                        {preview && pricesAvailable ? (
                          <>
                            <ul className="space-y-1">
                              {preview.lines.map((line) => (
                                <li key={line.label} className="flex justify-between gap-3 text-sm text-brand-200">
                                  <span>{line.label}</span>
                                  <span className="tabular-nums">{line.value}</span>
                                </li>
                              ))}
                            </ul>
                            <p className="mt-3 text-xl font-bold text-white tabular-nums">{preview.totalValue}</p>
                            <p className="text-xs text-brand-300">{preview.totalLabel}</p>
                          </>
                        ) : (
                          <p className="text-sm text-brand-300">
                            {pricesAvailable
                              ? 'Indica cuántos colaboradores tiene tu empresa para ver el resumen.'
                              : copy.scope.pricesLater}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button type="button" onClick={() => setStep('intro')} className="text-brand-300 text-sm px-4 py-3">
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={needsCustomQuote}
                      className="flex-1 btn-shiny bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </motion.form>
              )}

              {step === 'company' && (
                <motion.form key="company" noValidate onSubmit={submitStep(goDelivery)} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                  <h2 className="text-xl font-bold text-white mb-1">{copy.company.title}</h2>
                  <p className="text-brand-400 text-sm mb-6">{copy.company.subtitle}</p>

                  <div className="space-y-5">
                    <div>
                      <label htmlFor={FIELD_IDS.company_name} className="block text-white font-medium mb-2 text-sm">
                        Nombre de la empresa *
                      </label>
                      <input
                        {...fieldA11y('company_name', errors)}
                        type="text"
                        name="organization"
                        autoComplete="organization"
                        value={formData.company_name || ''}
                        onChange={(e) => patchForm({ company_name: e.target.value })}
                        className={`${inputClass} ${errors.company_name ? 'border-red-500/50' : ''}`}
                        placeholder="Ej. Comercializadora del Norte S.A."
                      />
                      <FieldError field="company_name" errors={errors} />
                    </div>

                    <div>
                      <label htmlFor="ventas-sector" className="block text-white font-medium mb-2 text-sm">
                        Rubro (opcional)
                      </label>
                      <select
                        id="ventas-sector"
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

                  </div>

                  <div className="flex gap-3 mt-8">
                    <button type="button" onClick={() => setStep('scope')} className="text-brand-300 text-sm px-4 py-3">
                      Atrás
                    </button>
                    <button
                      type="submit"
                      className="flex-1 btn-shiny bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold"
                    >
                      Siguiente
                    </button>
                  </div>
                </motion.form>
              )}

              {step === 'delivery' && (
                <motion.form key="delivery" noValidate onSubmit={submitStep(handleSubmit)} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                  <h2 className="text-xl font-bold text-white mb-1">{copy.delivery.title}</h2>
                  <p className="text-brand-400 text-sm mb-6">{copy.delivery.subtitle}</p>

                  <div className="space-y-5">
                    <div>
                      <label htmlFor={FIELD_IDS.contact_email} className="block text-white font-medium mb-2 text-sm">
                        Correo corporativo *
                      </label>
                      <input
                        {...fieldA11y('contact_email', errors)}
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={formData.contact_email}
                        onChange={(e) => patchForm({ contact_email: e.target.value })}
                        onBlur={validateEmailOnBlur}
                        className={`${inputClass} ${errors.contact_email ? 'border-red-500/50' : ''}`}
                        placeholder="admin@miempresa.com"
                      />
                      <FieldError field="contact_email" errors={errors} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="ventas-name" className="block text-white font-medium mb-2 text-sm">
                          Tu nombre (opcional)
                        </label>
                        <input
                          id="ventas-name"
                          type="text"
                          name="name"
                          autoComplete="name"
                          value={formData.contact_name || ''}
                          onChange={(e) => patchForm({ contact_name: e.target.value })}
                          className={inputClass}
                          placeholder="Nombre y apellido"
                        />
                      </div>
                      <div>
                        <label htmlFor="ventas-phone" className="block text-white font-medium mb-2 text-sm">
                          Teléfono / WhatsApp (opcional)
                        </label>
                        <input
                          id="ventas-phone"
                          type="tel"
                          name="tel"
                          autoComplete="tel"
                          value={formData.phone || ''}
                          onChange={(e) => patchForm({ phone: e.target.value })}
                          className={inputClass}
                          placeholder={
                            VENTAS_PHONE_PLACEHOLDER[
                              isCountryCode(formData.country_code) ? formData.country_code : 'HND'
                            ]
                          }
                          inputMode="tel"
                        />
                      </div>
                    </div>
                  </div>

                  {errors.submit && (
                    <div role="alert" className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mt-4">
                      <p className="text-red-400 text-sm text-center">{errors.submit}</p>
                    </div>
                  )}

                  <p className="text-white/45 text-xs text-center mt-4 leading-relaxed">{copy.delivery.finePrint}</p>

                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setStep('company')} className="text-brand-300 text-sm px-4 py-3">
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
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
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </BorderBeam>
    </div>
  )
}
