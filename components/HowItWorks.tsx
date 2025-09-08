import { CheckCircleIcon } from '@heroicons/react/24/outline'

export default function HowItWorks() {
  const steps = [
    { title: 'No más contratar, gestionar o lidiar con personal de RH', desc: 'Automatizamos el 80% de las operaciones de Recursos Humanos por vos.' },
    { title: 'Extraordinariamente simple de usar', desc: 'Agregá los parámetros específicos de tu caso de uso y nosotros nos encargamos del resto.' },
    { title: 'Completamente libre de riesgo con empleados ilimitados', desc: '¿No te gusta tu dashboard? Podemos construir tu propio sistema.' }
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
          <h2 className="text-3xl font-bold text-white mb-8">
            Reemplazá equipos internos costosos y consultores poco confiables por una tarifa mensual fija
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
