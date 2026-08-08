import { ClockIcon, CpuChipIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import BorderBeam from './BorderBeam'
import ScrollReveal from './ScrollReveal'
import { getHomeCopy } from '../../lib/i18n/landings/home'
import { useLandingPreferences } from './LandingPreferencesProvider'

const ICONS = [ClockIcon, CpuChipIcon, DocumentTextIcon]

export default function HowItWorksBento() {
  const { locale } = useLandingPreferences()
  const copy = getHomeCopy(locale).howItWorks

  return (
    <section id="como-funciona" className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      <ScrollReveal>
        <div className="text-center mb-8">
          <div className="inline-block glass-modern landing-muted text-xs font-medium px-4 py-2 rounded-full mb-6 uppercase tracking-widest">
            {copy.eyebrow}
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold landing-ink leading-tight mb-6 px-2">
            <span className="landing-ink block sm:inline">{copy.titleLead}</span>
            <span className="landing-brand-soft block sm:inline mt-1 sm:mt-0"> {copy.titleAccent}</span>
          </h2>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 max-w-6xl mx-auto">
        {copy.steps.map((step, i) => {
          const Icon = ICONS[i] ?? ClockIcon
          return (
            <ScrollReveal key={step.title} delay={i * 0.08}>
              <BorderBeam className="h-full">
                <div className="glass-modern rounded-2xl p-5 sm:p-6 h-full hover:scale-[1.01] transition-transform duration-300">
                  <div className="w-10 h-10 bg-green-500/15 rounded-xl flex items-center justify-center border border-green-500/25 mb-4">
                    <Icon className="h-5 w-5 text-green-400" aria-hidden />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold landing-ink mb-2">{step.title}</h3>
                  <p className="text-sm landing-muted font-medium landing-dark-text">{step.desc}</p>
                </div>
              </BorderBeam>
            </ScrollReveal>
          )
        })}
      </div>
    </section>
  )
}
