import { CheckCircleIcon } from '@heroicons/react/24/outline'

export default function HowItWorks() {
  const steps = [
    { 
      title: '⏱️ Tus empleados marcan asistencia sin excusas', 
      desc: 'Con PIN o QR, el sistema detecta retrasos y pide justificación automáticamente.' 
    },
    { 
      title: '🤖 El robot hace la magia', 
      desc: 'Convierte horas, ausencias y extras en planillas legales listas con IHSS, RAP e ISR.' 
    },
    { 
      title: '📑 Recibís la planilla y comprobantes en segundos', 
      desc: 'Un PDF para tu gerencia y comprobantes automáticos en email o WhatsApp para cada empleado.' 
    },
    { 
      title: '📊 Tenés control total en tiempo real', 
      desc: 'Dashboard con métricas de asistencia, costos y desempeño.' 
    },
    { 
      title: '✅ Siempre en regla con la ley hondureña', 
      desc: 'Olvidate de multas o auditorías: todo trazado y auditable.' 
    }
  ]

  return (
    <section id="como-funciona" className="relative py-20 px-6 max-w-7xl mx-auto">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="mx-auto h-72 w-72 blur-3xl rounded-full opacity-20 bg-brand-600/40 translate-y-8" />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block bg-gray-800/50 text-gray-300 text-sm font-medium px-4 py-2 rounded-full mb-6">
            CÓMO FUNCIONA
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-8">
            <span className="text-white">Reemplazá equipos internos costosos y consultores poco confiables</span>
            <span className="hidden sm:inline"> </span>
            <span className="text-brand-300">por una tarifa mensual fija</span>
          </h2>
        </div>

        <div className="bg-gray-900/50 border border-green-500/30 rounded-2xl p-8 max-w-4xl mx-auto">
          <div className="space-y-8">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="text-green-400 font-bold text-lg">{i + 1}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-300">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
