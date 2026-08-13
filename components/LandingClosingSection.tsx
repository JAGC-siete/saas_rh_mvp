import Link from 'next/link'
import { trackCTAClick } from '../lib/analytics/googleAds'
import ScrollReveal from './landing/ScrollReveal'

export default function LandingClosingSection() {
  return (
    <section className="relative border-t border-white/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
            Activa Humano SISU: software de recursos humanos y control de asistencia
          </h2>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-8 font-medium">
            Cotización sin costo o prueba gratuita del sistema de nómina y biometría para tu empresa.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            <Link
              href="/ventas"
              onClick={() => trackCTAClick('solicitar_cotizacion', 'landing_closing_primary')}
              className="btn-shiny inline-flex items-center justify-center rounded-xl px-8 py-3 min-h-[48px] text-base font-semibold bg-brand-500 text-white hover:bg-brand-600 shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-pulse-glow transition-colors"
            >
              Solicitar cotización
            </Link>
            <Link
              href="/activar"
              onClick={() => trackCTAClick('activar_trial', 'landing_closing_secondary')}
              className="inline-flex items-center justify-center rounded-xl px-8 py-3 min-h-[48px] text-base font-medium border border-white/25 text-white hover:bg-white/10 transition-colors"
            >
              Probar gratis
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
