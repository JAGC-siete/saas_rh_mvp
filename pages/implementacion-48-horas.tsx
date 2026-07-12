import Head from 'next/head'
import Link from 'next/link'
import PublicPageShell from '../components/landing/PublicPageShell'
import TrackedWhatsAppLink from '../components/TrackedWhatsAppLink'
import { getPageTitle } from '../lib/seo/title'
import { getPageDescription } from '../lib/seo/description'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import RelatedGuides from '../components/SEO/RelatedGuides'
import { generateWebPageSchema, generateFAQPageSchema, generateBreadcrumbListSchema } from '../lib/seo/schema'
import { ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { SERVICE_GUARANTEES } from '../lib/marketing/service-guarantees'

export default function Implementacion48HorasPage() {
  const pageTitle = getPageTitle('implementacion48h')
  const pageDescription = getPageDescription('implementacion48h')
  const webPageSchema = generateWebPageSchema({
    url: '/implementacion-48-horas',
    title: pageTitle,
    description: pageDescription
  })

  const faqs = [
    {
      question: '¿Qué es la activación inmediata?',
      answer:
        'Puedes crear tu cuenta y empezar a explorar Humano SISU de inmediato, con leyes locales ya parametrizadas para Honduras, El Salvador y Guatemala. No necesitas esperar semanas de consultoría para arrancar.'
    },
    {
      question: '¿En cuánto tiempo queda lista la implementación biométrica?',
      answer:
        'Garantizamos conectar tu biométrico a la nómina en 72 horas o menos, cuando nos entregas a tiempo la información, accesos y responsables acordados.'
    },
    {
      question: '¿Ayudan a migrar datos desde Excel u otro sistema?',
      answer:
        'Sí. Incluimos asistencia para importar empleados e historial disponible desde Excel, planillas anteriores u otras plataformas.'
    },
    {
      question: '¿La capacitación y las actualizaciones tienen costo extra?',
      answer:
        'No. La capacitación de tu equipo y las actualizaciones del software están incluidas en tu plan, sin cobros adicionales por formación ni por ajustes legales.'
    },
    {
      question: '¿Hay límite de usuarios o empleados?',
      answer:
        'No. Puedes agregar empleados y usuarios administrativos sin pagar licencia extra por cada puesto.'
    },
    {
      question: '¿Cómo funciona la garantía de 30 días con dinero de regreso?',
      answer:
        'Si en los primeros 30 días no cumplimos lo acordado, te devolvemos tu dinero según los términos de servicio. Aplica a clientes que cumplan con los requisitos del plan contratado.'
    }
  ]

  const faqSchema = generateFAQPageSchema(faqs)
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Inicio', url: '/' },
    { name: 'Implementación express', url: '/implementacion-48-horas' },
  ])

  const steps = [
    {
      time: 'Inmediato',
      title: 'Activación de cuenta',
      description: 'Creamos tu cuenta, configuramos empresa y departamentos. Empiezas a usar el sistema de inmediato.',
      icon: '⚡'
    },
    {
      time: 'Día 1',
      title: 'Migración y empleados',
      description: 'Importamos o registramos empleados desde Excel o manual. Asistencia incluida para migrar tus datos.',
      icon: '👥'
    },
    {
      time: 'Día 1-2',
      title: 'Configuración de nómina',
      description: 'Configuramos deducciones y nómina según tu país (Honduras, El Salvador o Guatemala).',
      icon: '💰'
    },
    {
      time: 'Hasta 72 h',
      title: 'Implementación biométrica',
      description: 'Si tienes dispositivo biométrico, lo configuramos y conectamos a la nómina en 72 horas o menos.',
      icon: '🔐'
    },
    {
      time: 'Cierre',
      title: 'Capacitación y prueba',
      description: 'Capacitamos a tu equipo y hacemos una prueba completa. Actualizaciones incluidas sin costo adicional.',
      icon: '✅'
    }
  ]

  const guarantees = SERVICE_GUARANTEES

  const testimonials = [
    {
      name: 'Felix Garcia',
      company: 'Restaurante Tonys Mar',
      quote: 'En 2 días ya estaba usando el sistema. Odoo me había dicho que tardaría 3 semanas.',
      time: '48 horas'
    },
    {
      name: 'Nancy Urrutia',
      company: 'Prohalca',
      quote: 'La implementación fue más rápida de lo que esperaba. El mismo día ya estábamos registrando asistencia.',
      time: '24 horas'
    }
  ]

  return (
    <PublicPageShell showSpotlight>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content="https://humanosisu.net/implementacion-48-horas" />
        <link rel="canonical" href="https://humanosisu.net/implementacion-48-horas" />
        <meta name="keywords" content="implementación nómina express, sistema nómina rápido regional, implementación rápida nómina, setup nómina El Salvador Guatemala Honduras" />
      </Head>
      <SchemaMarkup schema={[webPageSchema, breadcrumbSchema, faqSchema]} />

      {/* Hero Section */}
      <section className="py-4 sm:py-6 md:py-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-6 mb-6 sm:mb-8 animate-fade-up-subtle">
            <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
              ⚡ Activación inmediata
            </span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
              🔐 Biométrico en 72 h
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
              👥 Sin límite de usuarios
            </span>
            <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-500/30">
              💰 30 días dinero de regreso
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

      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">

        {/* Comparison */}
        <section className="mb-12 sm:mb-16 md:mb-20 grid md:grid-cols-2 gap-4 sm:gap-6">
          <div className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-red-500/20">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-400">❌ Otros Sistemas</h2>
            <ul className="space-y-3 text-brand-200/90 text-sm sm:text-base">
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
          <div className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-500/20">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-green-400">✅ Humano SISU</h2>
            <ul className="space-y-3 text-brand-200/90 text-sm sm:text-base">
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span><strong>Activación inmediata</strong> y biométrico en 72 h o menos</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Migración de datos y capacitación incluidas</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Sin límite de usuarios</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Garantía de 30 días con dinero de regreso</span>
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
              <div key={index} className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-4xl">{step.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-sky-600/20 text-sky-300 rounded-full text-sm font-semibold">
                        {step.time}
                      </span>
                      <h3 className="text-lg sm:text-xl font-bold text-white">{step.title}</h3>
                    </div>
                    <p className="text-brand-200/90 text-sm sm:text-base leading-relaxed">{step.description}</p>
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {guarantees.map((guarantee, index) => (
              <div key={index} className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center border border-white/10 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
                <div className="text-4xl mb-4">{guarantee.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">{guarantee.title}</h3>
                <p className="text-brand-200/90 text-sm sm:text-base leading-relaxed">{guarantee.description}</p>
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
              <div key={index} className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
                <p className="text-brand-200/90 text-sm sm:text-base italic mb-4">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-sm text-brand-200/70">{testimonial.company}</p>
                  </div>
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-semibold">
                    {testimonial.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            Preguntas Frecuentes
          </h2>
          <div className="space-y-4 sm:space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
                <h3 className="text-base sm:text-lg font-bold mb-2 text-white">{faq.question}</h3>
                <p className="text-brand-200/90 text-sm sm:text-base">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center glass-modern rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 mb-12 sm:mb-16 border border-white/10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-white">
            ¿Listo para una puesta en marcha express?
          </h2>
          <p className="text-lg sm:text-xl text-brand-200/90 mb-6 sm:mb-8">
            Activación inmediata, biométrico en 72 h o menos y garantía de 30 días con dinero de regreso. Sin límite de usuarios.
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

        <RelatedGuides currentPath="/implementacion-48-horas" />
      </div>
    </PublicPageShell>
  )
}

