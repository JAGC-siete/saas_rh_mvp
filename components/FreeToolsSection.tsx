import Link from 'next/link'
import { CALCULATOR_HUB_LINKS } from '../lib/public-calculator/hub-links'

export default function FreeToolsSection() {
  return (
    <section id="herramientas-gratuitas" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto relative z-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <span className="inline-block px-3 py-1 mb-4 text-xs rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
            Herramientas gratuitas
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Valida deducciones antes de automatizar tu planilla
          </h2>
          <p className="text-brand-200/90 max-w-3xl mx-auto">
            Miles de búsquedas empiezan preguntando cuánto descuentan de sueldo. Usa nuestras calculadoras
            gratuitas — las mismas reglas legales que Humano SISU — y cuando estés listo, activa la nómina completa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
          {CALCULATOR_HUB_LINKS.deductions.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="glass-strong rounded-xl p-5 border border-white/15 hover:border-cyan-400/40 transition-all hover:-translate-y-0.5 text-left group"
            >
              <div className="text-xs text-brand-300 mb-1">{item.country}</div>
              <div className="text-lg font-semibold text-white group-hover:text-brand-200">{item.title}</div>
              <div className="text-sm text-brand-200/80 mt-1">{item.subtitle}</div>
              {'badge' in item && typeof item.badge === 'string' && (
                <div className="mt-3 text-xs text-cyan-300">{item.badge}</div>
              )}
            </Link>
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
      </div>
    </section>
  )
}
