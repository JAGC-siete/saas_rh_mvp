import Link from 'next/link'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { trackCTAClick } from '../lib/analytics/googleAds'

/** Antes: cuenta regresiva a quincena + email + “Probalo HOY”. Ahora CTA a cotización en /ventas. */
export default function CountdownTimer() {
  return (
    <div className="text-center mb-12">
      <div className="bg-gradient-to-r from-blue-500/20 to-orange-500/20 border border-black-400/30 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl max-w-4xl mx-auto">
        <h3 className="text-lg sm:text-xl font-semibold text-red-100 mb-2">
          Cotización clara para tu operación
        </h3>
        <p className="text-sm sm:text-base text-red-100/85 mb-6 max-w-xl mx-auto">
          Precio calculado en servidor según empleados y modalidad. Recibís el PDF por correo en minutos.
        </p>
        <Link
          href="/ventas"
          onClick={() => trackCTAClick('solicitar_cotizacion', 'services_section_cta')}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base sm:text-lg font-semibold shadow-lg bg-sky-600 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-300 hover:-translate-y-0.5"
          data-analytics="cta_ventas_click"
        >
          Solicitar cotización
          <ArrowRightIcon className="h-5 w-5" aria-hidden />
        </Link>
        <p className="text-xs sm:text-sm text-red-100/70 mt-4">
          Sin tarjeta de crédito para solicitar la cotización.
        </p>
      </div>
    </div>
  )
}
