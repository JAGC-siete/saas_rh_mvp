import Link from 'next/link'
import { CheckIcon } from '@heroicons/react/24/outline'
import BorderBeam from './BorderBeam'
import ScrollReveal from './ScrollReveal'
import { getHomeCopy } from '../../lib/i18n/landings/home'
import { useLandingPreferences } from './LandingPreferencesProvider'
import { mergeVentasBusinessRules } from '../../lib/ventas/business-rules'
import { LADDER_PLAN_KEYS, type LadderPlanKey } from '../../lib/ventas/ladder'
import type { PublicVentasConfig } from '../../lib/ventas/public-config'

type PublicPlan = {
  plan_key: LadderPlanKey
  monthly_price: number | null
  annual_price: number | null
  included_terminals_annual: number
}

export type PricingSectionData = {
  plans: PublicPlan[]
  /** Above this many employees the quote is custom. */
  maxAutoQuoteEmployees: number
  /** One-time assisted start on monthly Esencial and Profesional. */
  onboardingFee: number
}

const toPrice = (v: unknown): number | null => (v == null || !Number.isFinite(Number(v)) ? null : Number(v))

/** Runs in getStaticProps so the prices ship in the HTML instead of loading after hydration. */
export function pricingSectionData(config: PublicVentasConfig): PricingSectionData {
  const rules = mergeVentasBusinessRules(config.business_rules)
  const byKey = new Map(config.plans.map((p) => [p.plan_key, p]))
  return {
    plans: LADDER_PLAN_KEYS.map((key) => {
      const p = byKey.get(key)
      return {
        plan_key: key,
        monthly_price: toPrice(p?.monthly_price_hnl),
        annual_price: toPrice(p?.annual_price_hnl),
        included_terminals_annual: Number(p?.included_terminals_annual) || 0,
      }
    }),
    maxAutoQuoteEmployees: rules.max_auto_quote_employees,
    onboardingFee: rules.onboarding_fee_hnl,
  }
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  )
}

function formatLempiras(amount: number): string {
  return `L. ${Math.round(amount).toLocaleString('es-HN')}`
}

/** A null price means the config served its fallback, so the card asks for a quote instead. */
function annualNote(plan: PublicPlan, copy: { annualOne: string; annualMany: string; annualNoClock: string }) {
  if (plan.annual_price == null) return null
  const price = formatLempiras(plan.annual_price)
  const n = plan.included_terminals_annual
  if (n <= 0) return fill(copy.annualNoClock, { price })
  return fill(n === 1 ? copy.annualOne : copy.annualMany, { price, n })
}

export default function PricingSection({ pricing }: { pricing: PricingSectionData }) {
  const { locale, href } = useLandingPreferences()
  const copy = getHomeCopy(locale).pricing

  return (
    <section id="precios" className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      <ScrollReveal>
        <div className="text-center mb-8">
          <div className="inline-block glass-modern landing-muted text-xs font-medium px-4 py-2 rounded-full mb-6 uppercase tracking-widest">
            {copy.eyebrow}
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold landing-ink leading-tight mb-4 px-2">
            {copy.title}
          </h2>
          <p className="landing-muted max-w-3xl mx-auto text-base sm:text-lg font-medium landing-dark-text">
            {copy.lead}
          </p>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 max-w-6xl mx-auto">
        {pricing.plans.map((plan, i) => {
          const planCopy = copy.plans[plan.plan_key]
          return (
            <PlanCard
              key={plan.plan_key}
              name={planCopy.name}
              desc={planCopy.desc}
              price={plan.monthly_price == null ? copy.quoteLabel : formatLempiras(plan.monthly_price)}
              perPeriod={plan.monthly_price == null ? null : copy.perMonth}
              note={annualNote(plan, copy)}
              features={planCopy.features}
              cta={planCopy.cta}
              ctaHref={
                plan.plan_key === 'basic' ? href('/membresia-anual') : href(`/ventas?plan=${plan.plan_key}`)
              }
              highlighted={plan.plan_key === 'pro'}
              delay={i * 0.08}
            />
          )
        })}
      </div>

      <div className="max-w-6xl mx-auto mt-6 text-center space-y-2">
        <p className="landing-muted text-sm sm:text-base font-medium">
          {fill(copy.enterprise.text, { max: pricing.maxAutoQuoteEmployees })}{' '}
          <Link prefetch={false} href={href('/ventas')} className="landing-brand-soft underline underline-offset-2">
            {copy.enterprise.cta}
          </Link>
        </p>
        <p className="landing-muted text-xs sm:text-sm">
          {fill(copy.taxNote, { fee: formatLempiras(pricing.onboardingFee) })}{' '}
          <Link prefetch={false} href={href('/activar')} className="landing-brand-soft underline underline-offset-2">
            {copy.trialNote}
          </Link>
        </p>
      </div>
    </section>
  )
}

function PlanCard({
  name,
  desc,
  price,
  perPeriod,
  note,
  features,
  cta,
  ctaHref,
  highlighted = false,
  delay = 0,
}: {
  name: string
  desc: string
  price: string
  perPeriod: string | null
  note: string | null
  features: string[]
  cta: string
  ctaHref: string
  highlighted?: boolean
  delay?: number
}) {
  return (
    <ScrollReveal delay={delay}>
      <BorderBeam className="h-full">
        <div
          className={`glass-modern rounded-2xl p-5 sm:p-6 h-full flex flex-col ${
            highlighted ? 'ring-1 ring-green-500/40' : ''
          }`}
        >
          <h3 className="text-base sm:text-lg font-bold landing-ink">{name}</h3>
          <p className="text-sm landing-muted font-medium mt-1 mb-4">{desc}</p>
          <p className={note ? 'mb-1' : 'mb-4'}>
            <span className="text-3xl sm:text-4xl font-bold landing-ink tabular-nums">{price}</span>
            {perPeriod && <span className="landing-muted text-sm font-medium ml-1">{perPeriod}</span>}
          </p>
          {note && <p className="text-xs sm:text-sm landing-muted font-medium mb-4">{note}</p>}
          <ul className="space-y-2 mb-6 flex-1">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm landing-muted font-medium landing-dark-text">
                <CheckIcon className="h-4 w-4 mt-0.5 shrink-0 text-green-400" aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link
            prefetch={false}
            href={ctaHref}
            className={`flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors ${
              highlighted
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'border border-white/25 landing-ink hover:bg-white/10'
            }`}
          >
            {cta}
          </Link>
        </div>
      </BorderBeam>
    </ScrollReveal>
  )
}
