import Head from 'next/head'
import Link from 'next/link'
import MainHeader from '../components/MainHeader'
import DemoFooter from '../components/DemoFooter'
import TrackedWhatsAppLink from '../components/TrackedWhatsAppLink'
import { getPageTitle } from '../lib/seo/title'
import { getPageDescription } from '../lib/seo/description'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import { generateWebPageSchema } from '../lib/seo/schema'
import { ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'

const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })

export default function Implementacion48HorasPage() {
  const pageTitle = getPageTitle('implementacion48h')
  const pageDescription = getPageDescription('implementacion48h')
  const webPageSchema = generateWebPageSchema({
    url: '/implementacion-48-horas',
    title: pageTitle,
    description: pageDescription
  })

  const steps = [
    {
      time: 'Hora 0-2',
      title: 'Configuración inicial',
      description: 'Creamos tu cuenta, configuramos tu empresa y departamentos. Todo listo en menos de 2 horas.',
      icon: '⚙️'
    },
    {
      time: 'Hora 2-8',
      title: 'Registro de empleados',
      description: 'Importamos o registramos tus empleados. Puedes hacerlo manualmente o importar desde Excel.',
      icon: '👥'
    },
    {
      time: 'Hora 8-24',
      title: 'Configuración de nómina',
      description: 'Configuramos deducciones IHSS, RAP, ISR según tus necesidades. Todo preconfigurado para Honduras.',
      icon: '💰'
    },
    {
      time: 'Hora 24-40',
      title: 'Instalación biométrica (si aplica)',
      description: 'Si tienes dispositivo biométrico, lo configuramos y conectamos. Si no, puedes usar registro manual.',
      icon: '🔐'
    },
    {
      time: 'Hora 40-48',
      title: 'Capacitación y prueba',
      description: 'Te capacitamos en el uso del sistema y hacemos una prueba completa. Todo funcionando perfectamente.',
      icon: '✅'
    }
  ]

  const guarantees = [
    {
      title: 'Compromiso de puesta en marcha',
      description:
        'Con la información, accesos y responsables acordados, si no queda operativo en el plazo previsto coordinamos soporte adicional de implementación hasta dejarlo funcionando, según alcance contractual.',
      icon: '⏱️'
    },
    {
      title: 'Soporte Incluido',
      description: 'Soporte técnico y capacitación incluidos durante todo el proceso.',
      icon: '🎓'
    },
    {
      title: 'Sin Costos Ocultos',
      description: 'Todo el proceso de implementación está incluido. Sin sorpresas.',
      icon: '💯'
    }
  ]

  const testimonials = [
    {
      name: 'Felix Garcia',
      company: "Tony's Mar Restaurant",
      quote: 'En 2 días ya estaba usando el sistema. Odoo me había dicho que tardaría 3 semanas.',
      time: '48 horas'
    },
    {
      name: 'Nancy Urrutia',
      company: 'PROHALCA',
      quote: 'La implementación fue más rápida de lo que esperaba. El mismo día ya estábamos registrando asistencia.',
      time: '24 horas'
    }
  ]

  return (
    <div className="min-h-screen bg-app text-white flex flex-col pt-16 sm:pt-20 md:pt-24 relative">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content="https://humanosisu.net/implementacion-48-horas" />
        <link rel="canonical" href="https://humanosisu.net/implementacion-48-horas" />
        <meta name="keywords" content="implementación nómina 48 horas, sistema nómina rápido Honduras, implementación rápida nómina, setup nómina rápido" />
      </Head>
      <SchemaMarkup schema={webPageSchema} />

      <MainHeader enableScrollEffect={true} fixed={true} />

      {/* Hero Section */}
      <section className="py-4 sm:py-6 md:py-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-6 mb-6 sm:mb-8 animate-fade-up-subtle">
            <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
              ⚡ 48 Horas Garantizadas
            </span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
              🎓 Soporte Incluido
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
              💯 Sin Costos Ocultos
            </span>
            <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-500/30">
              🎁 30 días gratis
            </span>
          </div>

          {/* Hero Title */}
          <div className="text-center mb-6 sm:mb-8 px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight sm:leading-tight">
              <span className="text-white block sm:inline">Multiplica el valor de tu equipo:</span>
              <span className="text-brand-300 block text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mt-2 sm:mt-1">Automatiza la asistencia y el payroll hoy.</span>
            </h1>
            <p className="text-lg sm:text-xl text-brand-200/90 max-w-3xl mx-auto mt-4 sm:mt-6">
              Del biométrico al comprobante de pago en segundos. Ahorra horas de trabajo administrativo y elimina la resistencia al cambio con una plataforma intuitiva.
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center mb-6">
            <TrackedWhatsAppLink
              href="https://wa.me/50432226773?text=Hola,%20quiero%20solicitar%20cotización%20de%20Humano%20SISU"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-sky-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-sky-700 transition-colors shadow-sm"
              trackingContext="implementacion_48h_hero_cotizacion"
            >
              Solicitar cotización
            </TrackedWhatsAppLink>
          </div>
        </div>
      </section>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">

        {/* Comparison */}
        <section className="mb-12 sm:mb-16 md:mb-20 grid md:grid-cols-2 gap-4 sm:gap-6">
          <div className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-red-500/20">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-400">❌ Otros Sistemas</h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-2">
                <ClockIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <span><strong>Odoo:</strong> 2-8 semanas</span>
              </li>
              <li className="flex items-start gap-2">
                <ClockIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <span><strong>ERP tradicionales:</strong> 1-3 meses</span>
              </li>
              <li className="flex items-start gap-2">
                <ClockIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <span>Requieren consultoría externa</span>
              </li>
              <li className="flex items-start gap-2">
                <ClockIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <span>Configuración compleja</span>
              </li>
            </ul>
          </div>
          <div className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-500/20">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-green-400">✅ Humano SISU</h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span><strong>Puesta en marcha típica en hasta 48 h</strong> (según alcance acordado)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Sin consultoría externa necesaria</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Configuración simple y guiada</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Soporte incluido durante todo el proceso</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Process Steps */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            Proceso de Implementación Paso a Paso
          </h2>
          <div className="space-y-4 sm:space-y-6">
            {steps.map((step, index) => (
              <div key={index} className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-4xl">{step.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-sky-600/20 text-sky-300 rounded-full text-sm font-semibold">
                        {step.time}
                      </span>
                      <h3 className="text-xl font-bold">{step.title}</h3>
                    </div>
                    <p className="text-gray-300">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Guarantees */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            Nuestras Garantías
          </h2>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            {guarantees.map((guarantee, index) => (
              <div key={index} className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center border border-white/10 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
                <div className="text-4xl mb-4">{guarantee.icon}</div>
                <h3 className="text-xl font-bold mb-2">{guarantee.title}</h3>
                <p className="text-gray-300">{guarantee.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            Lo Que Dicen Nuestros Clientes
          </h2>
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
                <p className="text-gray-300 italic mb-4">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-sm text-gray-400">{testimonial.company}</p>
                  </div>
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-semibold">
                    {testimonial.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center glass-strong rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 mb-12 sm:mb-16 border border-white/10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-white">
            ¿Listo para una puesta en marcha express?
          </h2>
          <p className="text-lg sm:text-xl text-brand-200/90 mb-6 sm:mb-8">
            Solicitá tu implementación ahora. Prueba gratis 30 días. Los plazos dependen del alcance acordado y de que nos compartas la información a tiempo.
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link
              href="/activar"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-sky-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-sky-700 transition-colors shadow-sm"
            >
              Solicitar Implementación
            </Link>
            <TrackedWhatsAppLink
              href="https://wa.me/50432226773?text=Hola,%20quiero%20saber%20más%20sobre%20la%20implementación%20express%20de%20Humano%20SISU"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-green-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-green-700 transition-colors shadow-sm"
              trackingContext="implementacion_48h_footer_experto"
            >
              Hablar con un Experto
            </TrackedWhatsAppLink>
          </div>
        </section>
      </main>

      <CloudBackground />
      <DemoFooter />
    </div>
  )
}

