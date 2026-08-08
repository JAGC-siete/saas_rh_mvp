import Image from 'next/image'
import { CheckCircleIcon, BoltIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import TrackedInternalCta from '../TrackedInternalCta'
import { nowInHonduras } from '../../lib/timezone'
import { getHomeCopy } from '../../lib/i18n/landings/home'
import { useLandingPreferences } from './LandingPreferencesProvider'

export default function MagneticHero() {
  const { locale, href, tone } = useLandingPreferences()
  const copy = getHomeCopy(locale).hero
  const isLight = tone === 'light'
  const now = nowInHonduras()
  const y = now.getFullYear()
  const m = now.getMonth()
  const day = now.getDate()
  const fifteenth = new Date(y, m, 15, 23, 59, 59)
  const lastOfMonth = new Date(y, m + 1, 0, 23, 59, 59)
  const nextPayday = day <= 15 ? fifteenth : lastOfMonth
  const secondaryCtaClass = isLight
    ? 'inline-flex items-center justify-center rounded-xl px-6 py-3 min-h-[48px] text-base font-medium border border-slate-300 text-slate-900 hover:bg-slate-100 transition-colors text-center'
    : 'inline-flex items-center justify-center rounded-xl px-6 py-3 min-h-[48px] text-base font-medium border border-white/25 text-white hover:bg-white/10 transition-colors text-center'

  return (
    <section className="relative py-6 sm:py-8 md:py-12 lg:py-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] gap-8 lg:gap-12 items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 text-green-300 text-xs rounded-full border border-green-500/25 font-medium">
                <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {copy.badgeLaws}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 text-blue-300 text-xs rounded-full border border-blue-500/25 font-medium">
                <BoltIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {copy.badgeSpeed}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 text-purple-300 text-xs rounded-full border border-purple-500/25 font-medium">
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

            <div className="flex flex-col sm:flex-row gap-3 mt-6 sm:mt-8">
              <TrackedInternalCta
                prefetch={false}
                href={href('/ventas')}
                ctaType="solicitar_cotizacion"
                location="landing_hero_primary"
                className="btn-shiny inline-flex items-center justify-center rounded-xl px-6 py-3 min-h-[48px] text-base font-semibold bg-brand-500 text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-colors text-center"
                data-analytics="cta_hero_ventas"
              >
                {copy.ctaQuote}
              </TrackedInternalCta>
              <TrackedInternalCta
                prefetch={false}
                href={href('/activar')}
                ctaType="activar_trial"
                location="landing_hero_secondary"
                className={secondaryCtaClass}
                data-analytics="cta_hero_activar"
              >
                {copy.ctaTrial}
              </TrackedInternalCta>
            </div>
            <p className="text-xs sm:text-sm landing-muted mt-3 font-medium">{copy.finePrint}</p>
            <p className="text-sm landing-muted mt-4">
              {copy.nextPayday}{' '}
              <span className="landing-ink font-medium">
                {nextPayday.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-HN')}
              </span>
            </p>
          </div>

          <div className="w-full max-w-sm mx-auto lg:max-w-none lg:mx-0 min-w-0">
            <div className="glass-modern rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
              <div className="rounded-xl overflow-hidden bg-slate-900/50 border border-white/5 leading-none">
                <Image
                  src="/images/landing/hero-human.jpg"
                  alt={copy.imageAlt}
                  width={682}
                  height={1024}
                  className="block w-full max-w-full h-auto object-cover object-top"
                  sizes="(max-width: 1023px) min(100vw - 2rem, 24rem), 28vw"
                />
              </div>
            </div>
            <p className="text-center mt-3 text-xs landing-muted font-medium">{copy.imageCaption}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
