import { ClockIcon, CpuChipIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

export default function HowItWorks() {
  const steps = [
    {
      icon: ClockIcon,
      title: 'Biometría inteligente: tu equipo registra su entrada.',
      desc: 'El dispositivo captura el dato exacto, previniendo el robo de tiempo y alertando sobre patrones de tardanza.',
    },
    {
      icon: CpuChipIcon,
      title: 'El cerebro digital procesa',
      desc: 'Cruza las horas reales y calcula deducciones al centavo (IHSS, RAP, ISR) sin que toqués una sola hoja de cálculo.',
    },
    {
      icon: DocumentTextIcon,
      title: 'Nómina y comprobantes al instante',
      desc: 'Con un clic, se genera la planilla para gerencia y se envían vouchers PDF por email o WhatsApp a cada colaborador.',
    },
  ]

  return (
    <section id="como-funciona" className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="landing-section-glow right-0 top-1/3 translate-x-1/2" aria-hidden />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="mx-auto h-72 w-72 blur-3xl rounded-full opacity-20 bg-brand-600/40 translate-y-8" />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block bg-gray-800/50 text-gray-300 text-sm font-medium px-4 py-2 rounded-full mb-6">
            CÓMO FUNCIONA SISU
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl font-bold text-white leading-tight mb-6 sm:mb-8 px-2">
            <span className="text-white block sm:inline">El fin del trabajo manual:</span>
            <span className="hidden sm:inline"> </span>
            <span className="text-brand-300 block sm:inline mt-1 sm:mt-0">así automatizamos el 80% de tus tareas de RRHH.</span>
          </h2>
        </div>

        <div className="bg-gray-900/50 border border-green-500/30 rounded-2xl p-4 sm:p-6 md:p-8 max-w-4xl mx-auto shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="space-y-6 sm:space-y-8">
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={i} className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-green-500/20 rounded-xl flex items-center justify-center border border-green-500/30">
                    <Icon className="h-5 w-5 text-green-400" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">{step.title}</h3>
                    <p className="text-sm sm:text-base text-gray-300 font-medium landing-dark-text">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
