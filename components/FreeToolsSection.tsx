import Link from 'next/link'
import { CALCULATOR_HUB_LINKS } from '../lib/public-calculator/hub-links'
import { GUIDE_LINKS } from '../lib/seo/internal-links'
import ScrollReveal from './landing/ScrollReveal'
import BorderBeam from './landing/BorderBeam'

const RELATED_GUIDE_CARDS = [GUIDE_LINKS.deduccionesHonduras, GUIDE_LINKS.recursos]

export default function FreeToolsSection() {
  return (
    <section id="herramientas-gratuitas" className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto z-10">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-8 sm:mb-10">
            <span className="inline-block px-3 py-1 mb-4 text-xs rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 uppercase tracking-widest">
              Herramientas gratuitas
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              Calculadoras gratuitas de Humano SISU
            </h2>
            <p className="text-slate-400 max-w-3xl mx-auto font-medium landing-dark-text">
              Valida deducciones de sueldo con las mismas reglas legales del software de recursos humanos Humano SISU.
              Cuando estés listo, activa el control de asistencia y la nómina completa.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {CALCULATOR_HUB_LINKS.deductions.map((item, i) => (
            <ScrollReveal key={item.href} delay={i * 0.06}>
              <BorderBeam>
                <Link
                  href={item.href}
                  className="glass-modern rounded-2xl p-5 min-h-[120px] hover:scale-[1.01] transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.25)] text-left group block h-full"
                >
                  <div className="text-xs text-brand-300 mb-1">{item.country}</div>
                  <div className="text-lg font-semibold text-white group-hover:text-brand-200">{item.title}</div>
                  <div className="text-sm text-slate-400 mt-1">{item.subtitle}</div>
                  {'badge' in item && typeof item.badge === 'string' && (
                    <div className="mt-3 text-xs text-cyan-400">{item.badge}</div>
                  )}
                </Link>
              </BorderBeam>
            </ScrollReveal>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-6">
          {CALCULATOR_HUB_LINKS.benefits.map((item, i) => (
            <ScrollReveal key={item.href} delay={i * 0.06}>
              <BorderBeam>
                <Link
                  href={item.href}
                  className="glass-modern rounded-2xl p-5 min-h-[100px] hover:scale-[1.01] transition-all text-left group block h-full"
                >
                  <div className="text-xs text-brand-300 mb-1">{item.country}</div>
                  <div className="text-lg font-semibold text-white group-hover:text-brand-200">{item.title}</div>
                  <div className="text-sm text-slate-400 mt-1">{item.subtitle}</div>
                </Link>
              </BorderBeam>
            </ScrollReveal>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
          <Link href={CALCULATOR_HUB_LINKS.hub.href} className="text-brand-300 hover:text-white underline">
            {CALCULATOR_HUB_LINKS.hub.label}
          </Link>
          <span className="hidden sm:inline text-brand-400">·</span>
          <Link href={CALCULATOR_HUB_LINKS.prestaciones.href} className="text-brand-300 hover:text-white underline">
            {CALCULATOR_HUB_LINKS.prestaciones.title}
          </Link>
        </div>

        <div className="mt-10 sm:mt-12">
          <h3 className="text-center text-xs uppercase tracking-widest text-slate-400 mb-4">Guías relacionadas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {RELATED_GUIDE_CARDS.map((guide, i) => (
              <ScrollReveal key={guide.href} delay={i * 0.08}>
                <BorderBeam>
                  <Link
                    href={guide.href}
                    className="glass-modern rounded-2xl p-5 min-h-[88px] hover:scale-[1.01] transition-all text-left group block h-full"
                  >
                    <div className="text-lg font-semibold text-white group-hover:text-brand-200">{guide.label}</div>
                    {guide.description && (
                      <div className="text-sm text-slate-400 mt-1">{guide.description}</div>
                    )}
                  </Link>
                </BorderBeam>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
