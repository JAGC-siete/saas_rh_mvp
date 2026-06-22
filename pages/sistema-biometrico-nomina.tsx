import Head from 'next/head'
import Link from 'next/link'
import PublicPageShell from '../components/landing/PublicPageShell'
import { getPageTitle } from '../lib/seo/title'
import { getPageDescription } from '../lib/seo/description'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import RelatedGuides from '../components/SEO/RelatedGuides'
import { generateWebPageSchema, generateSoftwareApplicationSchema, generateFAQPageSchema } from '../lib/seo/schema'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

export default function SistemaBiometricoNominaPage() {
  const pageTitle = getPageTitle('biometricoNomina')
  const pageDescription = getPageDescription('biometricoNomina')
  const webPageSchema = generateWebPageSchema({
    url: '/sistema-biometrico-nomina',
    title: pageTitle,
    description: pageDescription
  })
  const softwareSchema = generateSoftwareApplicationSchema()

  const faqs = [
    {
      question: '¿Puedo usar mi biométrico actual con Humano SISU?',
      answer:
        'Sí. Humano SISU se integra con dispositivos biométricos compatibles (por ejemplo Hikvision y otros vía nuestro conector). Si aún no tienes equipo, puedes registrar asistencia manualmente o desde la app. Validamos compatibilidad durante la implementación.'
    },
    {
      question: '¿Las horas del biométrico pasan solas a la nómina?',
      answer:
        'Sí. Las checadas alimentan el módulo de asistencia y, al generar planilla, el sistema calcula horas ordinarias y extras según la jornada configurada, sin reingreso manual entre sistemas.'
    },
    {
      question: '¿Qué pasa si falla el biométrico o no hay internet?',
      answer:
        'Las checadas pueden quedar en el dispositivo y sincronizarse al restablecer conexión. Mientras tanto puedes registrar asistencia manualmente en Humano SISU sin detener el cálculo de nómina.'
    },
    {
      question: '¿Funciona en Honduras, El Salvador y Guatemala?',
      answer:
        'Sí. La plataforma está localizada para HN, SV y GT: deducciones de ley, jornadas y reglas de asistencia según el país de tu empresa.'
    },
    {
      question: '¿Necesito pagar dos sistemas (biométrico y nómina)?',
      answer:
        'No. Asistencia y nómina viven en una sola plataforma y una sola suscripción. Evitas licencias duplicadas y errores al pasar datos entre herramientas.'
    }
  ]

  const faqSchema = generateFAQPageSchema(faqs)

  const benefits = [
    {
      title: 'Todo en Uno',
      description: 'No necesitas dos sistemas separados. El biométrico y la nómina están completamente integrados.',
      icon: '🔗'
    },
    {
      title: 'Datos en Tiempo Real',
      description: 'Las checadas se registran automáticamente y se reflejan inmediatamente en la nómina.',
      icon: '⚡'
    },
    {
      title: 'Sin Errores Manuales',
      description: 'Elimina la necesidad de ingresar datos manualmente. Todo es automático y preciso.',
      icon: '✅'
    },
    {
      title: 'Ahorro de Tiempo',
      description: 'Ya no pierdes horas calculando horas trabajadas. El sistema lo hace automáticamente.',
      icon: '⏰'
    },
    {
      title: 'Cumplimiento Legal',
      description: 'Registros de asistencia auditables según STSS. Todo queda documentado automáticamente.',
      icon: '📋'
    },
    {
      title: 'Antifraude',
      description: 'Reconocimiento facial y biométrico previene suplantación y fraude en asistencia.',
      icon: '🔒'
    }
  ]

  const useCases = [
    {
      title: 'Restaurantes',
      description: 'Control de asistencia de meseros, cocineros y personal de turnos rotativos.',
      example: 'Tony\'s Mar Restaurant - 40 empleados'
    },
    {
      title: 'Manufactura',
      description: 'Registro preciso de horas trabajadas para cálculo de horas extras y producción.',
      example: 'PROHALCA - 37 empleados'
    },
    {
      title: 'Oficinas',
      description: 'Control de asistencia de personal administrativo con reportes automáticos.',
      example: 'Despachos legales - 15 empleados'
    }
  ]

  return (
    <PublicPageShell showSpotlight>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content="https://humanosisu.net/sistema-biometrico-nomina" />
        <link rel="canonical" href="https://humanosisu.net/sistema-biometrico-nomina" />
        <meta name="keywords" content="sistema biométrico con nómina, control asistencia biométrico, biométrico integrado nómina, asistencia nómina El Salvador Guatemala Honduras" />
      </Head>
      <SchemaMarkup schema={[webPageSchema, softwareSchema, faqSchema]} />

      {/* Hero Section */}
      <section className="py-4 sm:py-6 md:py-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-6 mb-6 sm:mb-8 animate-fade-up-subtle">
            <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
              🔐 Biométrico Integrado
            </span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
              ⚡ Tiempo Real
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
              ✅ Sin Errores
            </span>
            <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-500/30">
              🎁 30 días gratis
            </span>
          </div>

          {/* Hero Title */}
          <div className="text-center mb-6 sm:mb-8 px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight sm:leading-tight">
              <span className="text-white block sm:inline">Control de asistencia y nómina en un solo lugar:</span>
              <span className="text-brand-300 block text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mt-2 sm:mt-1">Sin cálculos manuales, sin errores.</span>
            </h1>
            <p className="text-lg sm:text-xl text-brand-200/90 max-w-3xl mx-auto mt-4 sm:mt-6">
              Integra tus biométricos con nuestro software regional. Automatiza deducciones y nómina local mientras tu equipo se enfoca en crecer.
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center mb-6">
            <Link
              href="/activar"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-sky-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-sky-700 transition-colors shadow-sm"
            >
              Activar gratis hoy - Sin tarjeta de crédito
            </Link>
          </div>
        </div>
      </section>

      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">

        {/* Problem vs Solution */}
        <section className="mb-12 sm:mb-16 md:mb-20 grid md:grid-cols-2 gap-4 sm:gap-6">
          <div className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-red-500/20">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-400">❌ Sistemas Separados</h2>
            <ul className="space-y-2 text-brand-200/90 text-sm sm:text-base">
              <li>• Tienes que usar dos sistemas diferentes</li>
              <li>• Ingresar datos manualmente entre sistemas</li>
              <li>• Errores de transcripción</li>
              <li>• Más costos de licencias</li>
              <li>• Más tiempo de capacitación</li>
            </ul>
          </div>
          <div className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-500/20">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-green-400">✅ Humano SISU Integrado</h2>
            <ul className="space-y-2 text-brand-200/90 text-sm sm:text-base">
              <li>• Un solo sistema para todo</li>
              <li>• Datos fluyen automáticamente</li>
              <li>• Cero errores manuales</li>
              <li>• Un solo costo de licencia</li>
              <li>• Capacitación simple y rápida</li>
            </ul>
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            Ventajas de la Integración Biométrico + Nómina
          </h2>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">{benefit.title}</h3>
                <p className="text-brand-200/90 text-sm sm:text-base">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            ¿Cómo Funciona?
          </h2>
          <div className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-white/10">
            <div className="space-y-4 sm:space-y-6">
              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center font-bold text-white">
                  1
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">Empleado checa en el dispositivo biométrico</h3>
                  <p className="text-brand-200/90 text-sm sm:text-base">Reconocimiento facial o huella dactilar. Registro instantáneo y seguro.</p>
                </div>
              </div>
              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center font-bold text-white">
                  2
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">Datos se sincronizan automáticamente</h3>
                  <p className="text-brand-200/90 text-sm sm:text-base">Las horas trabajadas se calculan automáticamente en tiempo real.</p>
                </div>
              </div>
              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center font-bold text-white">
                  3
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">Nómina se genera automáticamente</h3>
                  <p className="text-brand-200/90 text-sm sm:text-base">Con las horas trabajadas, se calcula IHSS, RAP, ISR y se genera la nómina completa.</p>
                </div>
              </div>
              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center font-bold text-white">
                  4
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">Comprobantes se envían automáticamente</h3>
                  <p className="text-brand-200/90 text-sm sm:text-base">Cada empleado recibe su voucher por email o WhatsApp automáticamente.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            Casos de Éxito
          </h2>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            {useCases.map((useCase, index) => (
              <div key={index} className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">{useCase.title}</h3>
                <p className="text-brand-200/90 mb-4 text-sm sm:text-base">{useCase.description}</p>
                <p className="text-xs sm:text-sm text-sky-400 font-semibold">{useCase.example}</p>
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
            ¿Listo para integrar biométrico y nómina?
          </h2>
          <p className="text-lg sm:text-xl text-brand-200/90 mb-6 sm:mb-8">
            Prueba Humano SISU gratis por 30 días. Sin tarjeta de crédito.
          </p>
          <Link
            href="/activar"
            className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-sky-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-sky-700 transition-colors shadow-sm"
          >
            Comenzar Prueba Gratis
          </Link>
        </section>

        <RelatedGuides currentPath="/sistema-biometrico-nomina" />
      </div>
    </PublicPageShell>
  )
}

