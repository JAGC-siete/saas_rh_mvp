import Link from 'next/link'
import { CheckIcon } from '@heroicons/react/24/outline'
import BorderBeam from './BorderBeam'
import ScrollReveal from './ScrollReveal'
import { getHomeCopy } from '../../lib/i18n/landings/home'
import { useLandingPreferences } from './LandingPreferencesProvider'
import { VENTAS_BASIC_ANNUAL_PRICE } from '../../lib/ventas/business-rules'
import type { PublicVentasConfig } from '../../lib/ventas/public-config'

/** Tiers above this size are quoted, not listed. */
const PUBLIC_TIER_MAX_EMPLOYEES = 50

type PublicPricedTier = {
  min_employees: number
  max_employees: number
  included_terminals_max: number | null
  price: number | null
}

export type PricingSectionData = {
  basicAnnualPrice: number
  tiers: PublicPricedTier[]
}

/** Runs in getStaticProps so the prices ship in the HTML instead of loading after hydration. */
export function pricingSectionData(config: PublicVentasConfig): PricingSectionData {
  const basicAnnualPrice = Number(config.basic_annual_price)
  return {
    basicAnnualPrice:
      Number.isFinite(basicAnnualPrice) && basicAnnualPrice > 0 ? basicAnnualPrice : VENTAS_BASIC_ANNUAL_PRICE,
    tiers: config.tiers
      .map((t) => ({
        min_employees: Number(t.min_employees),
        max_employees: Number(t.max_employees),
        included_terminals_max: t.included_terminals_max == null ? null : Number(t.included_terminals_max),
        price: t.price == null || !Number.isFinite(Number(t.price)) ? null : Number(t.price),
      }))
      .filter((t) => t.max_employees <= PUBLIC_TIER_MAX_EMPLOYEES),
  }
}

function fill(template: string, values: Record<string, number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  )
}

/** A null price means the config served its fallback tiers, whose clock counts may be stale too. */
function terminalsFeature(
  tier: PublicPricedTier,
  copy: { terminalsOne: string; terminalsMany: string }
): string[] {
  const n = tier.included_terminals_max
  if (tier.price == null || !n) return []
  return [n === 1 ? copy.terminalsOne : fill(copy.terminalsMany, { n })]
}

function formatLempiras(amount: number): string {
  return `L. ${Math.round(amount).toLocaleString('es-HN')}`
}

export default function PricingSection({ pricing }: { pricing: PricingSectionData }) {
  const { locale, href } = useLandingPreferences()
  const copy = getHomeCopy(locale).pricing
  const enterpriseMin = PUBLIC_TIER_MAX_EMPLOYEES + 1

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
        <PlanCard
          name={copy.basic.name}
          desc={copy.basic.desc}
          price={formatLempiras(pricing.basicAnnualPrice)}
          perYear={copy.perYear}
          features={copy.basic.features}
          cta={copy.basic.cta}
          ctaHref={href('/membresia-anual')}
        />

        {pricing.tiers.map((tier, i) => (
          <PlanCard
            key={`${tier.min_employees}-${tier.max_employees}`}
            name={fill(copy.withClock.name, { min: tier.min_employees, max: tier.max_employees })}
            desc={copy.withClock.desc}
            price={tier.price == null ? copy.quoteLabel : formatLempiras(tier.price)}
            perYear={tier.price == null ? null : copy.perYear}
            features={[...terminalsFeature(tier, copy.withClock), ...copy.withClock.features]}
            cta={copy.withClock.cta}
            ctaHref={href('/ventas')}
            highlighted={i === 0}
            delay={(i + 1) * 0.08}
          />
        ))}
      </div>

      <div className="max-w-6xl mx-auto mt-6 text-center space-y-2">
        <p className="landing-muted text-sm sm:text-base font-medium">
          {fill(copy.enterprise.text, { min: enterpriseMin })}{' '}
          <Link prefetch={false} href={href('/ventas')} className="landing-brand-soft underline underline-offset-2">
            {copy.enterprise.cta}
          </Link>
        </p>
        <p className="landing-muted text-xs sm:text-sm">
          {copy.taxNote}{' '}
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
  perYear,
  features,
  cta,
  ctaHref,
  highlighted = false,
  delay = 0,
}: {
  name: string
  desc: string
  price: string
  perYear: string | null
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
          <p className="mb-4">
            <span className="text-3xl sm:text-4xl font-bold landing-ink tabular-nums">{price}</span>
            {perYear && <span className="landing-muted text-sm font-medium ml-1">{perYear}</span>}
          </p>
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
