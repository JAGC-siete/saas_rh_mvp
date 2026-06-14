import { ClockIcon, CurrencyDollarIcon, CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { Button } from './ui/button'
import CountdownTimer from './CountdownTimer'
import { GUIDE_LINKS } from '../lib/seo/internal-links'

export default function ServicesSection() {
  return (
    <section id="servicios" className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* sutil glow de fondo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="mx-auto h-72 w-72 blur-3xl rounded-full opacity-20 bg-brand-600/40 translate-y-8" />
      </div>

      {/* Cómo funciona section */}

      <header className="max-w-3xl mb-8 sm:mb-10 mx-auto text-center px-2">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight">
          <span className="text-white block sm:inline">Tu nuevo ecosistema de RRHH:</span>
          <span className="hidden sm:inline"> </span>
          <span className="text-brand-300 block sm:inline mt-1 sm:mt-0">diseñado para escalar sin burocracia.</span>
        </h2>
        <p className="mt-3 text-sm sm:text-base text-brand-200 px-2">
          Dejá de contratar personal solo para pasar datos. Centralizá tu operación con tecnología y <span className="text-brand-400">trazabilidad</span>.
        </p>
      </header>

      {/* El Libro Rojo - Asistencia */}
      <div id="libro-rojo" className="mb-12 sm:mb-16">
        <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-4 sm:mb-6 text-center px-2">
          <span className="text-white block sm:inline">Control de Asistencia</span>
          <span className="hidden sm:inline"> </span>
          <span className="text-brand-300 block sm:inline mt-1 sm:mt-0">Biométrico</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* SOPORTE: Asistencia */}
          <article className="group relative overflow-hidden rounded-xl sm:rounded-2xl glass border border-white/15 p-4 sm:p-6 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 grid place-items-center rounded-lg bg-white/10 border border-white/15 flex-shrink-0">
                <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-300" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-white">Asistencia en tiempo real</h3>
                <p className="text-xs sm:text-sm text-brand-300/90">Registro exacto + control operativo</p>
              </div>
            </div>

            <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
              <li className="flex gap-2 sm:gap-3 text-brand-200 text-sm sm:text-base"><CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400 flex-shrink-0 mt-0.5" /> <span>Registro exacto y en tiempo real</span></li>
              <li className="flex gap-2 sm:gap-3 text-brand-200 text-sm sm:text-base"><CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400 flex-shrink-0 mt-0.5" /> <span>Detección de patrones de tardanza y justificación inteligente</span></li>
              <li className="flex gap-2 sm:gap-3 text-brand-200 text-sm sm:text-base"><CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400 flex-shrink-0 mt-0.5" /> <span>Alertas y visibilidad para gerencia</span></li>
            </ul>

          </article>

          {/* SOPORTE: Reportes ejecutivos */}
          <article className="group relative overflow-hidden rounded-xl sm:rounded-2xl glass border border-white/15 p-4 sm:p-6 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 grid place-items-center rounded-lg bg-white/10 border border-white/15 flex-shrink-0">
                <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-300" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-white">Reportes ejecutivos</h3>
                <p className="text-xs sm:text-sm text-brand-300/90">Dashboard y alertas de puntualidad</p>
              </div>
            </div>

            <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
              <li className="flex gap-2 sm:gap-3 text-brand-200 text-sm sm:text-base"><CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400 flex-shrink-0 mt-0.5" /> <span>Dashboard ejecutivo con alertas</span></li>
              <li className="flex gap-2 sm:gap-3 text-brand-200 text-sm sm:text-base"><CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400 flex-shrink-0 mt-0.5" /> <span>Métricas claras para tomar decisiones</span></li>
              <li className="flex gap-2 sm:gap-3 text-brand-200 text-sm sm:text-base"><CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400 flex-shrink-0 mt-0.5" /> <span>Exportación Excel/PDF</span></li>
            </ul>

          </article>
        </div>

        <div className="mt-4 sm:mt-6 text-center">
          <Link
            href={GUIDE_LINKS.biometricoNomina.href}
            className="inline-flex items-center gap-1.5 text-sm sm:text-base text-brand-300 hover:text-white transition-colors"
          >
            ¿Cómo se conecta la biometría con la planilla?
            <ArrowRightIcon className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>

      {/* El Planillero - Nómina */}
      <div id="planillero" className="mb-12 sm:mb-16">
        <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-4 sm:mb-6 text-center px-2">
          <span className="text-white block sm:inline">Nómina</span>
          <span className="hidden sm:inline"> </span>
          <span className="text-brand-300 block sm:inline mt-1 sm:mt-0">“Cero Errores”</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* SOPORTE: Nómina sin errores */}
          <article className="group relative overflow-hidden rounded-xl sm:rounded-2xl glass border border-white/15 p-4 sm:p-6 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 grid place-items-center rounded-lg bg-white/10 border border-white/15 flex-shrink-0">
                <CurrencyDollarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-300" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-white">Nómina sin errores</h3>
                <p className="text-xs sm:text-sm text-brand-300/90">Ley local + vouchers PDF por email/WhatsApp</p>
              </div>
            </div>

            <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
              <li className="flex gap-2 sm:gap-3 text-brand-200 text-sm sm:text-base"><CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400 flex-shrink-0 mt-0.5" /> <span>Cálculos 100% parametrizados a la ley local (IHSS, RAP, ISR, INFOP)</span></li>
              <li className="flex gap-2 sm:gap-3 text-brand-200 text-sm sm:text-base"><CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400 flex-shrink-0 mt-0.5" /> <span>Gestión de horas extra y prestaciones (13°/14°, cesantías, etc.)</span></li>
              <li className="flex gap-2 sm:gap-3 text-brand-200 text-sm sm:text-base"><CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400 flex-shrink-0 mt-0.5" /> <span>Vouchers PDF masivos y envío automatizado</span></li>
            </ul>

          </article>

          {/* SOPORTE: Cálculo automático */}
          <article className="group relative overflow-hidden rounded-xl sm:rounded-2xl glass border border-white/15 p-4 sm:p-6 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 grid place-items-center rounded-lg bg-white/10 border border-white/15 flex-shrink-0">
                <CurrencyDollarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-300" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-white">Trazabilidad y cumplimiento</h3>
                <p className="text-xs sm:text-sm text-brand-300/90">Auditoría clara para operar con confianza</p>
              </div>
            </div>

            <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
              <li className="flex gap-2 sm:gap-3 text-brand-200 text-sm sm:text-base"><CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400 flex-shrink-0 mt-0.5" /> <span>Auditoría completa y trazabilidad</span></li>
              <li className="flex gap-2 sm:gap-3 text-brand-200 text-sm sm:text-base"><CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400 flex-shrink-0 mt-0.5" /> <span>Documentación lista para revisión interna</span></li>
              <li className="flex gap-2 sm:gap-3 text-brand-200 text-sm sm:text-base"><CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400 flex-shrink-0 mt-0.5" /> <span>Operación ordenada para crecer sin fricción</span></li>
            </ul>

          </article>


        </div>

        <div className="mt-4 sm:mt-6 text-center">
          <Link
            href={GUIDE_LINKS.deduccionesHonduras.href}
            className="inline-flex items-center gap-1.5 text-sm sm:text-base text-brand-300 hover:text-white transition-colors"
          >
            Guía completa: IHSS, RAP e ISR en Honduras
            <ArrowRightIcon className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>

      {/* Countdown Timer */}
      <CountdownTimer />

      {/* Animaciones clave globales, sin JS */}
      <style jsx global>{`
        @keyframes fade-up { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        .animate-fade-up { animation: fade-up .6s ease-out both }
      `}</style>
    </section>
  )
}
