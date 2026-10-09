import { useEffect, useState, type FormEvent } from 'react'
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
import { getVentasModalityDefinition, annualTerminalsSaleFieldHint } from '../../lib/ventas/modality-includes'
import {
  annualIncludesExtrasMessage,
  mergeVentasBusinessRules,
  resolveHardwareMode,
  resolveIncludedTerminalsCap,
  VENTAS_ANNUAL_TERMINALS_INCLUDED_MIN_EMPLOYEES,
  VENTAS_BASIC_ANNUAL_PRICE,
  VENTAS_ENTERPRISE_ANNUAL_PRICE,
  VENTAS_EXTRA_TERMINALS_DISCOUNT_PCT,
  VENTAS_HARDWARE_SALE_UNIT_PRICE,
  VENTAS_MAX_AUTO_QUOTE_TERMINALS,
  VENTAS_MEMBERSHIP_DISCOUNT_PCT,
  VENTAS_MICRO_MAX_EMPLOYEES,
  VENTAS_MONTHLY_MIN_EMPLOYEES,
  type VentasAnnualTerminalMode,
  type VentasBusinessRules,
} from '../../lib/ventas/business-rules'
import {
  resolveVentasProductSelection,
} from '../../lib/ventas/product-catalog'
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
  computeVentasErrors,
  findPublicTierForEmployees,
  formatEmployeeRangeLabel,
  formatTerminalSelectLabel,
  isMonthlyAvailableOnForm,
  sortPublicTiers,
  ventasCompanyErrors,
  ventasDeliveryErrors,
  ventasScopeErrors,
  VENTAS_COUNTRY_LABEL,
  VENTAS_PHONE_PLACEHOLDER,
  VENTAS_SECTOR_OPTIONS,
  type VentasFormLimits,
  type VentasPublicTier,
  type VentasValidationErrors,
} from '../../lib/ventas-game/ventas-form'
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
  employees_count: 2,
  billing_modality: 'annual',
  terminals_count: 1,
  sector_rubro: '',
  coupon_code: '',
  consent_newsletter: true,
  include_terminals: true,
  complement_biometric: true,
  affiliate_membership: false,
  include_enterprise: false,
})

const VENTAS_WIZARD_STEPS: [string, string, string] = ['Alcance', 'Empresa', 'Entrega']

type ErrorField = Exclude<keyof VentasValidationErrors, 'submit'>

/** Order matters: focusFirstError picks the first field with an error in this order. */
const FIELD_IDS: Record<ErrorField, string> = {
  country_code: 'ventas-country',
  employees_count: 'ventas-employees',
  billing_modality: 'ventas-modality',
  terminals_count: 'ventas-terminals',
  company_name: 'ventas-company',
  contact_email: 'ventas-email',
}

const FIELD_STEP: Record<ErrorField, WizardStep> = {
  country_code: 'scope',
  employees_count: 'scope',
  billing_modality: 'scope',
  terminals_count: 'scope',
  company_name: 'company',
  contact_email: 'delivery',
}

function firstErrorField(errors: VentasValidationErrors): ErrorField | null {
  const fields = Object.keys(FIELD_IDS) as ErrorField[]
  return fields.find((f) => Boolean(errors[f])) ?? null
}

function focusFirstError(errors: VentasValidationErrors) {
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

function fieldA11y(field: ErrorField, errors: VentasValidationErrors) {
  const id = FIELD_IDS[field]
  return {
    id,
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `${id}-error` : undefined,
  }
}

function FieldError({ field, errors }: { field: ErrorField; errors: VentasValidationErrors }) {
  if (!errors[field]) return null
  return (
    <p id={`${FIELD_IDS[field]}-error`} className="text-red-400 text-xs mt-2">
      {errors[field]}
    </p>
  )
}

function BooleanSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70"
    >
      <span className="text-white text-sm font-medium">{label}</span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-blue-500' : 'bg-white/20'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}

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
  const router = useRouter()
  const copy = COTIZACION_GUIADA_COPY
  const [step, setStep] = useState<WizardStep>('intro')
  const [showCoupon, setShowCoupon] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<VentasValidationErrors>({})
  const [formData, setFormData] = useState<QuotationRequest>(() => defaultForm(initialCountryCode))
  const [formLimits, setFormLimits] = useState<VentasFormLimits>({
    monthly_min_employees: VENTAS_MONTHLY_MIN_EMPLOYEES,
    max_auto_quote_terminals: VENTAS_MAX_AUTO_QUOTE_TERMINALS,
    annual_terminals_included_min_employees: VENTAS_ANNUAL_TERMINALS_INCLUDED_MIN_EMPLOYEES,
    hardware_sale_unit_price: VENTAS_HARDWARE_SALE_UNIT_PRICE,
    micro_max_employees: VENTAS_MICRO_MAX_EMPLOYEES,
    basic_annual_price: VENTAS_BASIC_ANNUAL_PRICE,
    membership_discount_pct: VENTAS_MEMBERSHIP_DISCOUNT_PCT,
    enterprise_annual_price: VENTAS_ENTERPRISE_ANNUAL_PRICE,
  })
  const [publicTiers, setPublicTiers] = useState<VentasPublicTier[]>([])

  useEffect(() => {
    let cancelled = false

    const applyPublicConfig = (data: Record<string, unknown>) => {
      const rules = mergeVentasBusinessRules(
        (data.business_rules as Partial<VentasBusinessRules> | undefined) ||
          (data as Partial<VentasBusinessRules>)
      )
      setFormLimits({
        monthly_min_employees: rules.monthly_min_employees,
        max_auto_quote_terminals: rules.max_auto_quote_terminals,
        annual_terminals_included_min_employees: rules.annual_terminals_included_min_employees,
        hardware_sale_unit_price: rules.hardware_sale_unit_price,
        micro_max_employees: rules.micro_max_employees,
        basic_annual_price: rules.basic_annual_price,
        membership_discount_pct: rules.membership_discount_pct,
        enterprise_annual_price: rules.enterprise_annual_price,
      })
      if (!Array.isArray(data.tiers)) return
      const mapped = sortPublicTiers(
        data.tiers.map((t: any) => ({
          min_employees: Number(t.min_employees),
          max_employees: Number(t.max_employees),
          annual_terminal_mode: (['auto', 'included', 'sale'].includes(t.annual_terminal_mode)
            ? t.annual_terminal_mode
            : 'auto') as VentasAnnualTerminalMode,
          included_terminals_max:
            t.included_terminals_max == null ? null : Number(t.included_terminals_max),
        }))
      )
      setPublicTiers(mapped)
      if (mapped.length === 0) return
      setFormData((prev) => {
        const current = Number(prev.employees_count)
        const nextEmp = findPublicTierForEmployees(current, mapped)
          ? current
          : mapped[0].min_employees
        const nextProduct = resolveVentasProductSelection({
          employeesCount: nextEmp,
          includeTerminals: prev.include_terminals ?? prev.complement_biometric,
          complementBiometric: prev.complement_biometric,
          affiliateMembership: prev.affiliate_membership,
          includeEnterprise: prev.include_enterprise,
          rules,
        })
        let modality = prev.billing_modality
        if (nextProduct.forceAnnual) modality = 'annual'
        else if (
          modality === 'monthly' &&
          !isMonthlyAvailableOnForm(nextEmp, rules, mapped)
        ) {
          modality = 'annual'
        }
        return {
          ...prev,
          employees_count: nextEmp,
          billing_modality: modality,
          include_terminals: nextProduct.includeTerminals,
          complement_biometric: nextProduct.includeTerminals,
        }
      })
    }

    const load = async () => {
      try {
        const res = await fetch('/api/ventas/public-config', { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok || cancelled) return
        applyPublicConfig(data)
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

  const headline = utmContext.headline ?? copy.intro.headline
  const subheadline = utmContext.subheadline ?? copy.intro.subheadline
  const wizardStep = wizardStepIndex(step)
  const countryLabel =
    formData.country_code && isCountryCode(formData.country_code)
      ? VENTAS_COUNTRY_LABEL[formData.country_code]
      : ''

  const employeesCount = Number(formData.employees_count) || 1
  const product = resolveVentasProductSelection({
    employeesCount,
    includeTerminals: formData.include_terminals ?? formData.complement_biometric,
    complementBiometric: formData.complement_biometric,
    affiliateMembership: formData.affiliate_membership,
    includeEnterprise: formData.include_enterprise,
    rules: formLimits,
  })
  const monthlyMin = formLimits.monthly_min_employees ?? VENTAS_MONTHLY_MIN_EMPLOYEES
  const maxTerminals = formLimits.max_auto_quote_terminals ?? VENTAS_MAX_AUTO_QUOTE_TERMINALS
  const monthlyAvailable =
    !product.forceAnnual && isMonthlyAvailableOnForm(employeesCount, formLimits, publicTiers)
  const matchedTier = findPublicTierForEmployees(employeesCount, publicTiers)
  const tierHints = {
    annual_terminal_mode: matchedTier?.annual_terminal_mode ?? ('auto' as VentasAnnualTerminalMode),
    included_terminals_max: matchedTier?.included_terminals_max ?? null,
  }
  const selectedRangeLabel = matchedTier
    ? formatEmployeeRangeLabel(matchedTier.min_employees, matchedTier.max_employees)
    : null
  const selectEmployeesValue = matchedTier
    ? matchedTier.min_employees
    : publicTiers[0]?.min_employees ?? employeesCount
  const hardwareModeForSelection = resolveHardwareMode(
    (formData.billing_modality || 'annual') as 'annual' | 'monthly',
    employeesCount,
    { rules: formLimits, tier: tierHints }
  )
  const includedCap = resolveIncludedTerminalsCap(formLimits, tierHints)
  const selectedTerminals = Number(formData.terminals_count) || 1
  const showAnnualExtrasHint =
    hardwareModeForSelection === 'included' && selectedTerminals > includedCap
  const extrasCount = Math.max(0, selectedTerminals - includedCap)
  const extrasPct = Math.round(VENTAS_EXTRA_TERMINALS_DISCOUNT_PCT * 100)

  const patchForm = (patch: Partial<QuotationRequest>) => {
    setFormData((prev) => {
      const next = { ...prev, ...patch }
      const emp = Number(next.employees_count)
      const nextProduct = resolveVentasProductSelection({
        employeesCount: emp,
        includeTerminals: next.include_terminals ?? next.complement_biometric,
        complementBiometric: next.complement_biometric,
        affiliateMembership: next.affiliate_membership,
        includeEnterprise: next.include_enterprise,
        rules: formLimits,
      })
      next.include_terminals = nextProduct.includeTerminals
      next.complement_biometric = nextProduct.includeTerminals
      if (nextProduct.forceAnnual) next.billing_modality = 'annual'
      if (
        next.billing_modality === 'monthly' &&
        Number.isFinite(emp) &&
        !isMonthlyAvailableOnForm(emp, formLimits, publicTiers)
      ) {
        next.billing_modality = 'annual'
      }
      if (nextProduct.chargeHardware && !(Number(next.terminals_count) >= 1)) {
        next.terminals_count = 1
      }
      if (!nextProduct.chargeHardware) next.terminals_count = 0
      return next
    })
    setErrors((prev) => (prev.submit ? omitValidationField(prev, 'submit') : prev))
  }

  const goScope = () => {
    setErrors({})
    setStep('scope')
  }

  const goCompany = () => {
    const e = ventasScopeErrors(formData, formLimits, publicTiers)
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
    const all = computeVentasErrors(formData, formLimits, publicTiers)
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
        country_code: isCountryCode(formData.country_code) ? formData.country_code : 'HND',
        employees_count: Number(formData.employees_count),
        billing_modality: formData.billing_modality || 'annual',
        terminals_count: Number(formData.terminals_count) || (product.chargeHardware ? 1 : 0),
        sector_rubro: formData.sector_rubro?.trim() || '',
        coupon_code: formData.coupon_code?.trim() || '',
        consent_newsletter: formData.consent_newsletter === true,
        complement_biometric: product.includeTerminals,
        include_terminals: product.includeTerminals,
        affiliate_membership: product.affiliateMembership,
        include_enterprise: product.includeEnterprise,
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
                      <FieldError field="country_code" errors={errors} />
                    </div>

                    <div>
                      <label htmlFor={FIELD_IDS.employees_count} className="block text-white font-medium mb-2 text-sm">
                        Rango de empleados *
                      </label>
                      <select
                        {...fieldA11y('employees_count', errors)}
                        value={selectEmployeesValue}
                        onChange={(e) =>
                          patchForm({ employees_count: parseInt(e.target.value, 10) || 1 })
                        }
                        disabled={publicTiers.length === 0}
                        className={`${inputClass} ${errors.employees_count ? 'border-red-500/50' : ''}`}
                      >
                        {publicTiers.length === 0 ? (
                          <option value={selectEmployeesValue} className="bg-slate-800">
                            Cargando rangos…
                          </option>
                        ) : (
                          publicTiers.map((t) => (
                            <option
                              key={`${t.min_employees}-${t.max_employees}`}
                              value={t.min_employees}
                              className="bg-slate-800"
                            >
                              {formatEmployeeRangeLabel(t.min_employees, t.max_employees)}
                            </option>
                          ))
                        )}
                      </select>
                      <FieldError field="employees_count" errors={errors} />
                      {countryLabel && selectedRangeLabel && (
                        <p className="text-xs text-brand-400 mt-2">
                          {copy.scope.tierHint(selectedRangeLabel, countryLabel)}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <BooleanSwitch
                        label={copy.scope.membershipLabel}
                        checked={!!formData.affiliate_membership}
                        onChange={(next) => patchForm({ affiliate_membership: next })}
                      />
                      <BooleanSwitch
                        label={copy.scope.terminalsLabel}
                        checked={!!formData.include_terminals}
                        onChange={(next) =>
                          patchForm({
                            include_terminals: next,
                            complement_biometric: next,
                          })
                        }
                      />
                      <BooleanSwitch
                        label={copy.scope.enterpriseLabel}
                        checked={!!formData.include_enterprise}
                        onChange={(next) => patchForm({ include_enterprise: next })}
                      />
                    </div>

                    <div className={`grid grid-cols-1 ${product.chargeHardware ? 'sm:grid-cols-2' : ''} gap-4`}>
                      <div>
                        <label htmlFor={FIELD_IDS.billing_modality} className="block text-white font-medium mb-2 text-sm">
                          Modalidad
                        </label>
                        <select
                          {...fieldA11y('billing_modality', errors)}
                          value={formData.billing_modality || 'annual'}
                          onChange={(e) =>
                            patchForm({ billing_modality: e.target.value as 'annual' | 'monthly' })
                          }
                          className={`${inputClass} ${errors.billing_modality ? 'border-red-500/50' : ''}`}
                        >
                          <option value="annual" className="bg-slate-800">
                            Anual (recomendado)
                          </option>
                          <option
                            value="monthly"
                            className="bg-slate-800"
                            disabled={!monthlyAvailable}
                          >
                            {monthlyAvailable
                              ? 'Mensual'
                              : product.forceAnnual
                                ? 'Mensual (plan básico es anual)'
                                : `Mensual (desde ${monthlyMin} empleados)`}
                          </option>
                        </select>
                        {!monthlyAvailable && (
                          <p className="text-xs text-brand-400 mt-2">
                            {product.forceAnnual
                              ? 'El plan básico se contrata solo en modalidad anual.'
                              : `Modalidad mensual disponible a partir de ${monthlyMin} empleados.`}
                          </p>
                        )}
                        <FieldError field="billing_modality" errors={errors} />
                      </div>
                      {product.chargeHardware && (
                      <div>
                        <label htmlFor={FIELD_IDS.terminals_count} className="block text-white font-medium mb-2 text-sm">
                          Terminales
                        </label>
                        <select
                          {...fieldA11y('terminals_count', errors)}
                          value={Number(formData.terminals_count) || 1}
                          onChange={(e) => patchForm({ terminals_count: parseInt(e.target.value, 10) || 1 })}
                          className={`${inputClass} ${errors.terminals_count ? 'border-red-500/50' : ''}`}
                        >
                          {Array.from({ length: maxTerminals }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n} className="bg-slate-800">
                              {formatTerminalSelectLabel({
                                n,
                                hardwareMode: hardwareModeForSelection,
                                includedCap,
                              })}
                            </option>
                          ))}
                        </select>
                        {hardwareModeForSelection === 'included' && (
                          <p className="text-xs text-brand-400 mt-2">
                            {annualIncludesExtrasMessage(includedCap)}
                          </p>
                        )}
                        {hardwareModeForSelection === 'sale' && (
                          <p className="text-xs text-brand-400 mt-2">
                            {annualTerminalsSaleFieldHint(
                              currencyForCountryCode(
                                isCountryCode(formData.country_code) ? formData.country_code : 'HND'
                              ),
                              formLimits
                            )}
                          </p>
                        )}
                        {showAnnualExtrasHint && (
                          <p className="text-xs text-amber-300/90 mt-2">
                            Elegiste {selectedTerminals}: {includedCap} incluidas sin costo y{' '}
                            {extrasCount} adicional{extrasCount === 1 ? '' : 'es'} a precio unitario
                            con −{extrasPct}% de descuento, sumadas al total anual.
                          </p>
                        )}
                        {hardwareModeForSelection === 'continuity' && (
                          <p className="text-xs text-brand-400 mt-2">
                            En plan mensual cada terminal suma Continuidad de Hardware (cuota
                            mensual decreciente).
                          </p>
                        )}
                        <FieldError field="terminals_count" errors={errors} />
                      </div>
                      )}
                    </div>

                    <p className="text-xs text-brand-300 bg-black/20 p-3 rounded-lg border border-white/10">
                      {
                        getVentasModalityDefinition(
                          (formData.billing_modality || 'annual') === 'monthly' ? 'monthly' : 'annual',
                          {
                            employeesCount,
                            currency: currencyForCountryCode(
                              isCountryCode(formData.country_code) ? formData.country_code : 'HND'
                            ),
                            rules: formLimits,
                            tier: tierHints,
                            productKind: product.kind,
                          }
                        ).formHint
                      }
                    </p>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button type="button" onClick={() => setStep('intro')} className="text-brand-300 text-sm px-4 py-3">
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
                        <label htmlFor="ventas-coupon" className="block text-white font-medium mb-2 text-sm">
                          Cupón
                        </label>
                        <input
                          id="ventas-coupon"
                          type="text"
                          autoComplete="off"
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
