import Link from 'next/link'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { trackCTAClick } from '../lib/analytics/googleAds'

/** CTA hacia cotización formal en /ventas (reemplazo del countdown + email trial). */
export default function CountdownTimer() {
  return (
    <div className="text-center mb-12">
      <div className="rounded-2xl border border-white/15 bg-white/5 p-6 sm:p-8 backdrop-blur-sm shadow-xl max-w-4xl mx-auto">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
          Propuesta por escrito
        </h3>
        <p className="text-sm sm:text-base text-brand-200/90 mb-6 max-w-lg mx-auto leading-relaxed">
          Cotización con montos según plantilla y modalidad. Envío al correo que indique.
        </p>
        <Link
          href="/ventas"
          onClick={() => trackCTAClick('solicitar_cotizacion', 'services_section_cta')}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold bg-sky-600 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
          data-analytics="cta_ventas_click"
        >
          Solicitar cotización
          <ArrowRightIcon className="h-5 w-5" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
