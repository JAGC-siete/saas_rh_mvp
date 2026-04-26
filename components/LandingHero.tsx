import React from 'react'
import Link from 'next/link'
import ImageCarousel from './ImageCarousel'
import { nowInHonduras } from '../lib/timezone'
import { trackCTAClick } from '../lib/analytics/googleAds'

export default function LandingHero() {
  const getNextPayday = () => {
    const now = nowInHonduras()
    const y = now.getFullYear()
    const m = now.getMonth()
    const day = now.getDate()

    const fifteenth = new Date(y, m, 15, 23, 59, 59)
    const lastOfMonth = new Date(y, m + 1, 0, 23, 59, 59)

    return day <= 15 ? fifteenth : lastOfMonth
  }

  const nextPayday = getNextPayday()

  return (
    <div className="relative isolate overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12 lg:py-20">
        <div className="glass-strong rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12 backdrop-blur-sm border border-white/20 shadow-2xl">
          <div className="text-center space-y-8">
            <div className="relative max-w-4xl mx-auto">
              <ImageCarousel />
            </div>

            <div className="space-y-4 sm:space-y-5 max-w-lg mx-auto px-2">
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
                <Link
                  href="/ventas"
                  onClick={() => trackCTAClick('solicitar_cotizacion', 'landing_hero_primary')}
                  className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-base sm:text-lg font-semibold bg-sky-600 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors text-center"
                  data-analytics="cta_hero_ventas"
                >
                  Solicitar cotización
                </Link>
                <Link
                  href="/activar"
                  onClick={() => trackCTAClick('activar_trial', 'landing_hero_secondary')}
                  className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-medium border border-white/25 text-white hover:bg-white/10 transition-colors text-center"
                  data-analytics="cta_hero_activar"
                >
                  Probar gratis
                </Link>
              </div>
              <p className="text-xs sm:text-sm text-brand-200/70">
                Cotización sin costo. Prueba con límites del trial según política vigente.
              </p>
            </div>
          </div>

          <div className="text-center mt-8 sm:mt-10 md:mt-12 px-2">
            <p className="text-sm sm:text-base text-brand-200/80">
              Próximo cierre de planilla (referencia):{' '}
              <span className="text-brand-100 font-medium">{nextPayday.toLocaleDateString()}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
