import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircleIcon, BoltIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { trackCTAClick } from '../../lib/analytics/googleAds'
import { nowInHonduras } from '../../lib/timezone'
import HeroProductWindow from './HeroProductWindow'
import ScrollReveal from './ScrollReveal'

export default function MagneticHero() {
  const now = nowInHonduras()
  const y = now.getFullYear()
  const m = now.getMonth()
  const day = now.getDate()
  const fifteenth = new Date(y, m, 15, 23, 59, 59)
  const lastOfMonth = new Date(y, m + 1, 0, 23, 59, 59)
  const nextPayday = day <= 15 ? fifteenth : lastOfMonth

  return (
    <section className="relative py-6 sm:py-8 md:py-12 lg:py-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-8 lg:gap-12 items-center">
          {/* Left 70% */}
          <ScrollReveal>
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 text-green-300 text-xs rounded-full border border-green-500/25 font-medium">
                <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Adaptado a leyes de CA (HN, SV, GT)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 text-blue-300 text-xs rounded-full border border-blue-500/25 font-medium">
                <BoltIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Implementación rápida
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 text-purple-300 text-xs rounded-full border border-purple-500/25 font-medium">
                <UserGroupIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Soporte local
              </span>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl font-bold leading-tight"
            >
              <span className="bg-gradient-to-r from-white via-brand-200 to-brand-400 bg-clip-text text-transparent">
                SISU — Control de Asistencia y Software de Recursos Humanos
              </span>
              <span className="block text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-4xl mt-2 bg-gradient-to-r from-brand-200 to-brand-500 bg-clip-text text-transparent font-semibold">
                Exclusivo para Honduras, El Salvador y Guatemala.
              </span>
            </motion.h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mt-4 sm:mt-6 font-medium landing-dark-text">
              Nuestro ecosistema integra reloj biométrico inteligente con software en un solo flujo. Digitaliza el control de asistencia, automatiza deducciones legales, elimina errores de Excel y libera a tu equipo para hacer crecer la empresa.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-6 sm:mt-8">
              <Link
                href="/ventas"
                onClick={() => trackCTAClick('solicitar_cotizacion', 'landing_hero_primary')}
                className="btn-shiny inline-flex items-center justify-center rounded-xl px-6 py-3 min-h-[48px] text-base font-semibold bg-brand-500 text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-pulse-glow transition-colors text-center"
                data-analytics="cta_hero_ventas"
              >
                Solicitar cotización
              </Link>
              <Link
                href="/activar"
                onClick={() => trackCTAClick('activar_trial', 'landing_hero_secondary')}
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 min-h-[48px] text-base font-medium border border-white/25 text-white hover:bg-white/10 transition-colors text-center"
                data-analytics="cta_hero_activar"
              >
                Probar gratis
              </Link>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-3 font-medium">
              Cotización sin costo. Prueba con límites del trial según política vigente.
            </p>
            <p className="text-sm text-slate-400 mt-4">
              Próximo cierre de planilla (referencia):{' '}
              <span className="text-white font-medium">{nextPayday.toLocaleDateString()}</span>
            </p>
          </ScrollReveal>

          {/* Right 30% — product window */}
          <ScrollReveal delay={0.15}>
            <HeroProductWindow />
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
