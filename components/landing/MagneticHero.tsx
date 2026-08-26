import Image from 'next/image'
import { CheckCircleIcon, BoltIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import TrackedInternalCta from '../TrackedInternalCta'
import { getHomeCopy } from '../../lib/i18n/landings/home'
import { useLandingPreferences } from './LandingPreferencesProvider'

const PAYROLL_BARS = [40, 62, 48, 78, 70]

export default function MagneticHero() {
  const { locale, href, tone } = useLandingPreferences()
  const copy = getHomeCopy(locale).hero
  const isLight = tone === 'light'
  const badgeClass = isLight
    ? 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs rounded-full border border-slate-200 font-medium'
    : 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/8 text-slate-200 text-xs rounded-full border border-white/15 font-medium'
  const secondaryCtaClass = isLight
    ? 'inline-flex items-center justify-center rounded-xl px-6 py-3 min-h-[48px] text-base font-medium border border-slate-300 text-slate-900 hover:bg-slate-100 transition-colors text-center'
    : 'inline-flex items-center justify-center rounded-xl px-6 py-3 min-h-[48px] text-base font-medium border border-white/25 text-white hover:bg-white/10 transition-colors text-center'
  const overlayClass = isLight
    ? 'rounded-xl border border-slate-200 bg-white/90 backdrop-blur-md p-3 shadow-lg'
    : 'rounded-xl border border-white/10 bg-slate-950/80 backdrop-blur-md p-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)]'

  return (
    <section className="relative py-6 sm:py-8 md:py-12 lg:py-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] gap-8 lg:gap-12 items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
              <span className={badgeClass}>
                <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {copy.badgeLaws}
              </span>
              <span className={badgeClass}>
                <BoltIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {copy.badgeSpeed}
              </span>
              <span className={badgeClass}>
                <UserGroupIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {copy.badgeSupport}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl font-bold leading-tight">
              <span className="landing-hero-gradient">{copy.title}</span>
              <span className="block text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-4xl mt-2 landing-hero-gradient-sub font-semibold">
                {copy.subtitle}
              </span>
            </h1>

            <p className="text-base sm:text-lg landing-muted max-w-2xl mt-4 sm:mt-6 font-medium landing-dark-text">
              {copy.lead}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <TrackedInternalCta
                prefetch={false}
                href={href('/activar')}
                ctaType="activar_trial"
                location="landing_hero_primary"
                className="btn-shiny inline-flex items-center justify-center rounded-xl px-6 py-3 min-h-[48px] text-base font-semibold bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 shadow-[0_0_24px_rgba(34,197,94,0.28)] transition-colors text-center"
                data-analytics="cta_hero_activar"
              >
                {copy.ctaTrial}
              </TrackedInternalCta>
              <TrackedInternalCta
                prefetch={false}
                href={href('/ventas')}
                ctaType="solicitar_cotizacion"
                location="landing_hero_secondary"
                className={secondaryCtaClass}
                data-analytics="cta_hero_ventas"
              >
                {copy.ctaQuote}
              </TrackedInternalCta>
            </div>
          </div>

          <div className="w-full max-w-sm mx-auto lg:max-w-none lg:mx-0 min-w-0">
            <div className="relative">
              <div
                className={`pointer-events-none absolute inset-x-6 top-12 bottom-8 rounded-full blur-3xl ${
                  isLight ? 'bg-slate-300/50' : 'bg-brand-500/20'
                }`}
                aria-hidden
              />
              <Image
                src="/images/landing/hero-human-cutout.webp"
                alt={copy.imageAlt}
                width={682}
                height={1024}
                priority
                className={`relative z-10 block w-full max-w-full h-auto object-contain object-bottom ${
                  isLight ? 'drop-shadow-2xl' : 'drop-shadow-[0_24px_40px_rgba(0,0,0,0.45)]'
                }`}
                sizes="(max-width: 1023px) min(100vw - 2rem, 24rem), 28vw"
              />
              <aside
                className="absolute z-20 left-0 bottom-8 w-[11.5rem] sm:bottom-10 sm:-translate-x-2"
                aria-hidden
              >
                <div className={`hero-float ${overlayClass}`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide landing-muted">
                      {copy.overlayTitle}
                    </p>
                    <p className="text-[10px] font-semibold text-brand-300">{copy.overlayStatus}</p>
                  </div>
                  <p className="text-[11px] landing-muted">{copy.overlayNetLabel}</p>
                  <p className="text-lg font-semibold landing-ink tabular-nums leading-tight">
                    {copy.overlayNetValue}
                  </p>
                  <svg
                    viewBox="0 0 80 28"
                    className="mt-2 w-full h-7"
                    role="presentation"
                  >
                    {PAYROLL_BARS.map((h, i) => (
                      <rect
                        key={i}
                        x={i * 16 + 2}
                        y={28 - h * 0.28}
                        width="10"
                        height={h * 0.28}
                        rx="2"
                        className="fill-brand-400/80"
                      />
                    ))}
                  </svg>
                  <p className="mt-1.5 text-[10px] landing-muted">{copy.overlayTeam}</p>
                </div>
              </aside>
            </div>
            <p className="text-center mt-3 text-xs landing-muted font-medium">{copy.imageCaption}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
