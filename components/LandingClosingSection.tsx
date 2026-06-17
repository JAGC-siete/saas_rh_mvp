import Link from 'next/link'
import { trackCTAClick } from '../lib/analytics/googleAds'

export default function LandingClosingSection() {
  return (
    <section className="relative bg-brand-900 border-t border-white/10">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-900/80 to-brand-900 pointer-events-none" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
          ¿Listo para dejar el Excel y automatizar tu nómina?
        </h2>
        <p className="text-brand-200/90 text-base sm:text-lg max-w-2xl mx-auto mb-8 font-medium">
          Cotización sin costo o prueba gratuita. Soporte humano en español, horario regional.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
          <Link
            href="/ventas"
            onClick={() => trackCTAClick('solicitar_cotizacion', 'landing_closing_primary')}
            className="inline-flex items-center justify-center rounded-xl px-8 py-3 min-h-[48px] text-base font-semibold bg-brand-500 text-white hover:bg-brand-600 shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-pulse-glow transition-colors"
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
      </div>
    </section>
  )
}
