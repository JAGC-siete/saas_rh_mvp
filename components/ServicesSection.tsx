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

      <header className="max-w-3xl mb-10">
        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
          Robots de RH de Humano SISU
        </h2>
        <p className="mt-3 text-brand-200">
          Reemplazá tareas repetitivas y propensas a error con <span className="text-brand-400">automatización verificable</span>.
        </p>
      </header>

      {/* GRID: stack de soporte (2 col) */}
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

          <div className="mt-5 flex gap-3">
            <Button variant="outline" asChild className="h-10 px-4">
              <Link href="/demo#asistencia">Ver módulo</Link>
            </Button>
            <Link href="/activar" className="inline-flex items-center underline decoration-white/20 underline-offset-4 hover:decoration-brand-400 transition text-brand-300 hover:text-white">
              Activar <ArrowRightIcon className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </article>

        {/* SOPORTE: Nómina */}
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

          <div className="mt-5 flex gap-3">
            <Button variant="outline" asChild className="h-10 px-4">
              <Link href="/demo#nomina">Ver módulo</Link>
            </Button>
            <Link href="/activar" className="inline-flex items-center underline decoration-white/20 underline-offset-4 hover:decoration-brand-400 transition text-brand-300 hover:text-white">
              Activar <ArrowRightIcon className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </article>
      </div>

      {/* Mini-proof bar */}
      <div className="mt-8 rounded-xl glass border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3 text-brand-200">
        <span className="text-white/90 font-medium">Prueba social:</span>
        <span className="flex items-center gap-2"><CheckCircleIcon className="h-5 w-5 text-emerald-400" /> 80% menos tiempo en Paragon</span>
        <span className="flex items-center gap-2"><CheckCircleIcon className="h-5 w-5 text-emerald-400" /> 0 multas STSS desde implementación</span>
        <span className="sm:ml-auto text-brand-300/90">Transparencia total en auditoría</span>
      </div>

      {/* Animaciones clave globales, sin JS */}
      <style jsx global>{`
        @keyframes fade-up { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        .animate-fade-up { animation: fade-up .6s ease-out both }
      `}</style>
    </section>
  )
}
