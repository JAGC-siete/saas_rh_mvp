import { ClockIcon, CpuChipIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import BorderBeam from './BorderBeam'
import ScrollReveal from './ScrollReveal'

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

export default function HowItWorksBento() {
  return (
    <section id="como-funciona" className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      <ScrollReveal>
        <div className="text-center mb-8">
          <div className="inline-block glass-modern text-slate-400 text-xs font-medium px-4 py-2 rounded-full mb-6 uppercase tracking-widest">
            Cómo funciona Humano SISU
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6 px-2">
            <span className="text-white block sm:inline">Control de asistencia + nómina en un solo ecosistema de Recursos Humanos:</span>
            <span className="text-brand-300 block sm:inline mt-1 sm:mt-0">el método SISU automatiza el 80% de las tareas repetitivas de RRHH para MiPyMes.</span>
          </h2>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 max-w-6xl mx-auto">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <ScrollReveal key={i} delay={i * 0.08}>
              <BorderBeam className="h-full">
                <div className="glass-modern rounded-2xl p-5 sm:p-6 h-full hover:scale-[1.01] transition-transform duration-300">
                  <div className="w-10 h-10 bg-green-500/15 rounded-xl flex items-center justify-center border border-green-500/25 mb-4">
                    <Icon className="h-5 w-5 text-green-400" aria-hidden />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-400 font-medium landing-dark-text">{step.desc}</p>
                </div>
              </BorderBeam>
            </ScrollReveal>
          )
        })}
      </div>
    </section>
  )
}
