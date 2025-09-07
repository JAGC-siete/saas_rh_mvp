import { ClockIcon, CurrencyDollarIcon, CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { Button } from './ui/button'

export default function ServicesSection() {
  return (
    <section id="servicios" className="relative py-20 px-6 max-w-7xl mx-auto">
      {/* sutil glow de fondo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="mx-auto h-72 w-72 blur-3xl rounded-full opacity-20 bg-brand-600/40 translate-y-8" />
      </div>

      {/* Cómo funciona section */}
      <div className="max-w-6xl mx-auto mb-20">
        <div className="text-center mb-8">
          <div className="inline-block bg-gray-800/50 text-gray-300 text-sm font-medium px-4 py-2 rounded-full mb-6">
            CÓMO FUNCIONA
          </div>
          <h2 className="text-3xl font-bold text-white mb-8">
            Reemplazá equipos internos costosos y consultores poco confiables por una tarifa mensual fija
          </h2>
        </div>
        
        <div className="bg-gray-900/50 border border-green-500/30 rounded-2xl p-8 max-w-4xl mx-auto">
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-green-400 font-bold text-lg">1</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">No más contratar, gestionar o lidiar con personal de RH</h3>
                <p className="text-gray-300">Automatizamos el 80% de las operaciones de Recursos Humanos por vos.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-green-400 font-bold text-lg">2</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Extraordinariamente simple de usar</h3>
                <p className="text-gray-300">Agregá los parámetros específicos de tu caso de uso y nosotros nos encargamos del resto.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-green-400 font-bold text-lg">3</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Completamente libre de riesgo con empleados ilimitados</h3>
                <p className="text-gray-300">¿No te gusta tu dashboard? Podemos construir tu propio sistema.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <header className="max-w-3xl mb-10 mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
          Presentamos: Tus robots de Recursos Humanos
        </h2>
        <p className="mt-3 text-brand-200">
          Reemplazá tareas repetitivas y propensas a error con <span className="text-brand-400">automatización verificable</span>.
        </p>
      </header>

      {/* El Libro Rojo - Asistencia */}
      <div id="libro-rojo" className="mb-16">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">El Libro Rojo de Asistencia</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SOPORTE: Asistencia */}
          <article className="group relative overflow-hidden rounded-2xl glass border border-white/15 p-6 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-white/10 border border-white/15">
                <ClockIcon className="h-5 w-5 text-brand-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Asistencia en tiempo real</h3>
                <p className="text-sm text-brand-300/90">Checadas, tolerancias, alertas y bienestar</p>
              </div>
            </div>

            <ul className="mt-4 space-y-3">
              <li className="flex gap-3 text-brand-200"><CheckCircleIcon className="h-5 w-5 text-brand-400" /> Tolerancia configurada + justificación inteligente</li>
              <li className="flex gap-3 text-brand-200"><CheckCircleIcon className="h-5 w-5 text-brand-400" /> Antifraude: patrones de tardanza y ubicación</li>
              <li className="flex gap-3 text-brand-200"><CheckCircleIcon className="h-5 w-5 text-brand-400" /> Pulso laboral: semáforo aleatorio (R/A/V)</li>
            </ul>

          </article>

          {/* SOPORTE: Reportes ejecutivos */}
          <article className="group relative overflow-hidden rounded-2xl glass border border-white/15 p-6 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-white/10 border border-white/15">
                <CheckCircleIcon className="h-5 w-5 text-brand-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Reportes ejecutivos</h3>
                <p className="text-sm text-brand-300/90">Dashboard interactivo y exportación automática</p>
              </div>
            </div>

            <ul className="mt-4 space-y-3">
              <li className="flex gap-3 text-brand-200"><CheckCircleIcon className="h-5 w-5 text-brand-400" /> Métricas en tiempo real</li>
              <li className="flex gap-3 text-brand-200"><CheckCircleIcon className="h-5 w-5 text-brand-400" /> Exportación Excel/PDF automática</li>
              <li className="flex gap-3 text-brand-200"><CheckCircleIcon className="h-5 w-5 text-brand-400" /> Alertas inteligentes y notificaciones</li>
            </ul>

          </article>
        </div>
      </div>

      {/* El Planillero - Nómina */}
      <div id="planillero" className="mb-16">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">El Planillero Automático</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SOPORTE: Nómina sin errores */}
          <article className="group relative overflow-hidden rounded-2xl glass border border-white/15 p-6 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-white/10 border border-white/15">
                <CurrencyDollarIcon className="h-5 w-5 text-brand-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Nómina sin errores</h3>
                <p className="text-sm text-brand-300/90">IHSS, RAP, ISR; PDF + vouchers por email/WhatsApp</p>
              </div>
            </div>

            <ul className="mt-4 space-y-3">
              <li className="flex gap-3 text-brand-200"><CheckCircleIcon className="h-5 w-5 text-brand-400" /> Cálculo legal automático (Honduras)</li>
              <li className="flex gap-3 text-brand-200"><CheckCircleIcon className="h-5 w-5 text-brand-400" /> 4 horas → 4 minutos (comprobado en Paragon)</li>
              <li className="flex gap-3 text-brand-200"><CheckCircleIcon className="h-5 w-5 text-brand-400" /> ZIP de vouchers + envío masivo</li>
            </ul>

          </article>

          {/* SOPORTE: Cálculo automático */}
          <article className="group relative overflow-hidden rounded-2xl glass border border-white/15 p-6 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-white/10 border border-white/15">
                <CurrencyDollarIcon className="h-5 w-5 text-brand-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Cálculo automático</h3>
                <p className="text-sm text-brand-300/90">IHSS, RAP, ISR automáticos según ley hondureña</p>
              </div>
            </div>

            <ul className="mt-4 space-y-3">
              <li className="flex gap-3 text-brand-200"><CheckCircleIcon className="h-5 w-5 text-brand-400" /> Cumplimiento legal 100% automático</li>
              <li className="flex gap-3 text-brand-200"><CheckCircleIcon className="h-5 w-5 text-brand-400" /> Vouchers PDF + envío por email/WhatsApp</li>
              <li className="flex gap-3 text-brand-200"><CheckCircleIcon className="h-5 w-5 text-brand-400" /> Auditoría completa y trazabilidad</li>
            </ul>

          </article>


        </div>
      </div>

      {/* Mini-proof bar */}
      <div className="mt-8 rounded-xl glass border border-white/10 p-6 flex flex-col items-center gap-6 text-center">
        <div className="text-brand-200">
          <span className="text-white/90 font-medium">Prúebalo:</span>
          <span className="flex items-center gap-2 mt-2"><CheckCircleIcon className="h-5 w-5 text-emerald-400" /> 99% menos tiempo corrigiendo errores</span>
          <span className="flex items-center gap-2 mt-2"><CheckCircleIcon className="h-5 w-5 text-emerald-400" /> IHSS, RAP, ISR, 2025 en 1 click</span>
          <span className="flex items-center gap-2 mt-2"><CheckCircleIcon className="h-5 w-5 text-emerald-400" /> Cumplimiento STSS desde implementación</span>
        </div>
        
        {/* Email CTA Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 max-w-md">
            <input
              type="email"
              placeholder="Tu email"
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-brand-200/70 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
            />
            <button
              onClick={() => window.location.href = '/activar'}
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-lg font-semibold shadow-lg bg-sky-600 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-300 hover:-translate-y-0.5 whitespace-nowrap"
              data-analytics="cta_footer_click"
            >
              Comenza HOY
            </button>
          </div>
          
          {/* Features text below CTA */}
          <div className="text-sm text-brand-200/60">
            <p>Usalo gratis 30 días. Empleados ilimitados.</p>
          </div>
        </div>
      </div>

      {/* Animaciones clave globales, sin JS */}
      <style jsx global>{`
        @keyframes fade-up { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        .animate-fade-up { animation: fade-up .6s ease-out both }
      `}</style>
    </section>
  )
}
