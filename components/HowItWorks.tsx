import { CheckCircleIcon } from '@heroicons/react/24/outline'

export default function HowItWorks() {
  const steps = [
    { 
      title: 'El biométrico registra asistencia a la hora exacta', 
      desc: 'Captura entradas y salidas y genera nómina con deducciones legales y comprobantes, sin errores y sin perder tu domingo cada ciclo de pago.' 
    },
    { 
      title: 'Las deducciones se calculan automáticamente', 
      desc: 'El sistema procesa tardanzas, ausencias y horas extra sin intervención manual. IHSS, RAP e ISR calculados al centavo.' 
    },
    { 
      title: 'La nómina se genera sin intervención manual', 
      desc: 'IHSS, RAP e ISR calculados al centavo. Todo exportable en Excel y PDF en segundos.' 
    },
    { 
      title: 'Los comprobantes disponibles al instante', 
      desc: 'Un PDF para gerencia y comprobantes automáticos por email o WhatsApp para cada empleado.' 
    }
  ]

  return (
    <section id="como-funciona" className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="mx-auto h-72 w-72 blur-3xl rounded-full opacity-20 bg-brand-600/40 translate-y-8" />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 sm:mb-6 px-2">
            Al digitalizar el control de asistencia con un biométrico.
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-brand-300/90 max-w-3xl mx-auto px-2 mb-8">
            La puntualidad deja de ser un sueño y la nómina pasa a ser un proceso automático.
          </p>
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
