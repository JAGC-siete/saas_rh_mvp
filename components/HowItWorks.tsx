import { CheckCircleIcon } from '@heroicons/react/24/outline'

export default function HowItWorks() {
  const steps = [
    { 
      title: '⏱️ Tus empleados marcan asistencia con PIN o QR', 
      desc: 'Pulso-Loboral guarda registros, detecta patrones y pide justificación.' 
    },
    { 
      title: '🤖 Pulso-Laboral hace la magia', 
      desc: 'Convierte horas, ausencias y extras en planillas legales listas con IHSS, RAP e ISR.' 
    },
    { 
      title: '📑 Nómina-PRO genera la planilla y comprobantes 24/7', 
      desc: 'Un PDF para tu gerencia y comprobantes automáticos en email o WhatsApp para cada empleado.' 
    },
    { 
      title: '📊 Tenés control total en tiempo real', 
      desc: 'Dashboard con métricas de asistencia, costos y desempeño.' 
    },
    { 
      title: '✅ Cumplimiento con la ley hondureña', 
      desc: 'Olvidate de cálculos manuales y deducciones: seguro y escalable.' 
    }
  ]

  return (
    <section id="como-funciona" className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="mx-auto h-72 w-72 blur-3xl rounded-full opacity-20 bg-brand-600/40 translate-y-8" />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block bg-gray-800/50 text-gray-300 text-sm font-medium px-4 py-2 rounded-full mb-6">
            CÓMO FUNCIONA
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-6 sm:mb-8 px-2">
            <span className="text-white block sm:inline">Automatizá el 80% de las tareas de tu Recursos Humanos</span>
            <span className="hidden sm:inline"> </span>
            <span className="text-brand-300 block sm:inline mt-1 sm:mt-0">con tus robots de RRHH 100% hondureños</span>
          </h2>
        </div>

        <div className="bg-gray-900/50 border border-green-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
          <div className="space-y-6 sm:space-y-8">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="text-green-400 font-bold text-base sm:text-lg">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">{step.title}</h3>
                  <p className="text-sm sm:text-base text-gray-300">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
