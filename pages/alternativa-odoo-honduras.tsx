import Head from 'next/head'
import Link from 'next/link'
import { useEffect } from 'react'
import PublicPageShell from '../components/landing/PublicPageShell'
import TrackedWhatsAppLink from '../components/TrackedWhatsAppLink'
import { trackComparisonView } from '../lib/analytics/googleAds'
import { getPageTitle } from '../lib/seo/title'
import { getPageDescription } from '../lib/seo/description'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import RelatedGuides from '../components/SEO/RelatedGuides'
import { generateWebPageSchema, generateFAQPageSchema } from '../lib/seo/schema'
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function AlternativaOdooPage() {
  useEffect(() => {
    trackComparisonView('alternativa_odoo')
  }, [])

  const pageTitle = getPageTitle('alternativaOdoo')
  const pageDescription = getPageDescription('alternativaOdoo')
  const webPageSchema = generateWebPageSchema({
    url: '/alternativa-odoo-honduras',
    title: pageTitle,
    description: pageDescription
  })

  const faqs = [
    {
      question: '¿Humano SISU reemplaza a Odoo por completo?',
      answer:
        'Humano SISU está enfocado en RH: asistencia, nómina y cumplimiento legal local. Si usas Odoo para inventario o contabilidad, puedes mantenerlo y usar Humano SISU solo para recursos humanos.'
    },
    {
      question: '¿Odoo calcula bien IHSS, RAP e ISR en Honduras?',
      answer:
        'Odoo es un ERP genérico; la nómina local en Centroamérica suele requerir módulos, consultoría y ajustes manuales. Humano SISU viene preconfigurado con deducciones y tablas vigentes para HN, SV y GT.'
    },
    {
      question: '¿Cuánto tarda implementar Odoo vs Humano SISU?',
      answer:
        'Odoo en nómina local suele tardar de 2 a 8 semanas con consultoría. Humano SISU ofrece activación inmediata e implementación biométrica en 72 horas o menos cuando el alcance y los datos acordados están listos.'
    },
    {
      question: '¿Puedo migrar desde Odoo sin perder datos?',
      answer:
        'Sí. Importamos empleados e historial de nómina disponible y te acompañamos durante la transición, con capacitación incluida.'
    },
    {
      question: '¿Para qué tipo de empresa conviene Humano SISU sobre Odoo?',
      answer:
        'Para MIPYMES que necesitan RH simple, biométrico integrado y cumplimiento local sin la complejidad ni el costo de implementación de un ERP completo.'
    }
  ]

  const faqSchema = generateFAQPageSchema(faqs)

  const comparisonFeatures = [
    {
      feature: 'Biométrico integrado',
      humanoSisu: true,
      odoo: false,
      description: 'Control de asistencia biométrico nativo integrado con nómina'
    },
    {
      feature: 'Localización por país (SV, GT, HN)',
      humanoSisu: true,
      odoo: false,
      description: 'Deducciones y nómina según normativa local vigente en cada país'
    },
    {
      feature: 'Tiempo de implementación',
      humanoSisu: 'Hasta 72 h',
      odoo: '2-8 semanas',
      description: 'Configuración y puesta en marcha (plazos según alcance acordado)'
    },
    {
      feature: 'Costo de implementación',
      humanoSisu: 'Incluido',
      odoo: 'Alto (consultoría requerida)',
      description: 'Costo inicial de setup'
    },
    {
      feature: 'Complejidad de uso',
      humanoSisu: 'Simple',
      odoo: 'Complejo',
      description: 'Curva de aprendizaje'
    },
    {
      feature: 'Soporte en español',
      humanoSisu: true,
      odoo: true,
      description: 'Atención al cliente'
    },
    {
      feature: 'Enfoque MIPYMES',
      humanoSisu: true,
      odoo: false,
      description: 'Diseñado específicamente para pequeñas y medianas empresas'
    }
  ]

  return (
    <PublicPageShell showSpotlight>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content="https://humanosisu.net/alternativa-odoo-honduras" />
        <link rel="canonical" href="https://humanosisu.net/alternativa-odoo-honduras" />
        <meta name="keywords" content="alternativa a Odoo El Salvador Guatemala Honduras, Odoo vs nómina regional, MIPYMES Centroamérica, sistema nómina local" />
      </Head>
      <SchemaMarkup schema={[webPageSchema, faqSchema]} />

      {/* Hero Section */}
      <section className="py-4 sm:py-6 md:py-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-6 mb-6 sm:mb-8 animate-fade-up-subtle">
            <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
              Regional · SV, GT, HN
            </span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
              ⚡ 72h vs Semanas
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
              🔐 Biométrico Integrado
            </span>
            <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-500/30">
              🎁 30 días gratis
            </span>
          </div>

          {/* Hero Title */}
          <div className="text-center mb-6 sm:mb-8 px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight sm:leading-tight">
              <span className="text-white block sm:inline">El software de RH para tu operación local que integra todo:</span>
              <span className="text-brand-300 block text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mt-2 sm:mt-1">Biométrico, Nómina y Ley.</span>
            </h1>
            <p className="text-lg sm:text-xl text-brand-200/90 max-w-3xl mx-auto mt-4 sm:mt-6">
              Olvida las hojas de cálculo. Automatizamos tus deducciones de ley según el país con activación inmediata y soporte local.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-6">
            <Link
              href="/activar"
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-sky-600 text-white rounded-xl font-semibold text-sm sm:text-base hover:bg-sky-700 transition-colors shadow-sm"
            >
              Prueba gratis ahora
            </Link>
            <TrackedWhatsAppLink
              href="https://wa.me/50432226773?text=Hola,%20quiero%20comparar%20Humano%20SISU%20con%20Odoo"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-xl font-semibold text-sm sm:text-base hover:bg-green-700 transition-colors shadow-sm"
              trackingContext="alternativa_odoo_hero_whatsapp"
            >
              Compara con Odoo Gratis
            </TrackedWhatsAppLink>
          </div>
        </div>
      </section>

      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">

        {/* Comparison Table */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            Odoo vs Humano SISU: Comparación Directa
          </h2>
          <div className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 overflow-x-auto border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-4 px-4">Característica</th>
                  <th className="text-center py-4 px-4">Humano SISU</th>
                  <th className="text-center py-4 px-4">Odoo</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((item, index) => (
                  <tr key={index} className="border-b border-white/10">
                    <td className="py-4 px-4">
                      <div className="font-semibold">{item.feature}</div>
                      <div className="text-sm text-gray-400">{item.description}</div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.humanoSisu === true ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-400 mx-auto" />
                      ) : item.humanoSisu === false ? (
                        <XMarkIcon className="h-6 w-6 text-red-400 mx-auto" />
                      ) : (
                        <span className="text-green-400 font-semibold">{item.humanoSisu}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.odoo === true ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-400 mx-auto" />
                      ) : item.odoo === false ? (
                        <XMarkIcon className="h-6 w-6 text-red-400 mx-auto" />
                      ) : (
                        <span className="text-gray-400">{item.odoo}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Key Differentiators */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            ¿Por qué elegir Humano SISU sobre Odoo?
          </h2>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            <div className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">Biométrico Integrado</h3>
              <p className="text-brand-200/90 text-sm sm:text-base">
                Odoo no tiene integración biométrica nativa. Humano SISU incluye control de asistencia biométrico integrado con nómina en un solo sistema.
              </p>
            </div>
            <div className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
              <div className="text-4xl mb-4">🇭🇳</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">Localización profunda</h3>
              <p className="text-brand-200/90 text-sm sm:text-base">
                Odoo es genérico y requiere configuración compleja. Humano SISU viene preconfigurado con deducciones y reglas nacionales para El Salvador, Guatemala y Honduras.
              </p>
            </div>
            <div className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">Puesta en marcha express vs semanas</h3>
              <p className="text-brand-200/90 text-sm sm:text-base">
                Odoo suele tardar semanas o meses en implementarse. Con Humano SISU la activación es inmediata y la implementación biométrica queda lista en 72 horas o menos cuando el alcance y los datos acordados están listos.
              </p>
            </div>
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
            ¿Listo para hacer el cambio?
          </h2>
          <p className="text-lg sm:text-xl text-brand-200/90 mb-6 sm:mb-8">
            Prueba Humano SISU gratis por 30 días. Sin tarjeta de crédito. Sin compromiso.
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link
              href="/activar"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-sky-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-sky-700 transition-colors shadow-sm"
            >
              Comenzar Prueba Gratis
            </Link>
            <TrackedWhatsAppLink
              href="https://wa.me/50432226773?text=Hola,%20quiero%20saber%20más%20sobre%20Humano%20SISU%20vs%20Odoo"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-green-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-green-700 transition-colors shadow-sm"
              trackingContext="alternativa_odoo_cta_whatsapp"
            >
              Hablar con un Experto
            </TrackedWhatsAppLink>
          </div>
        </section>

        {/* Migration Section */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            Migración desde Odoo
          </h2>
          <div className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-white/10">
            <p className="text-base sm:text-lg text-brand-200/90 mb-4 sm:mb-6">
              Si actualmente usas Odoo y buscas una solución más simple, rápida y específica para tu país en la región, 
              podemos ayudarte a migrar tus datos.
            </p>
            <ul className="list-disc list-inside space-y-2 text-brand-200/90 mb-6 sm:mb-8 text-sm sm:text-base">
              <li>Migración de datos de empleados</li>
              <li>Importación de historial de nómina</li>
              <li>Soporte durante la transición</li>
              <li>Capacitación incluida</li>
            </ul>
            <TrackedWhatsAppLink
              href="https://wa.me/50432226773?text=Hola,%20quiero%20migrar%20desde%20Odoo%20a%20Humano%20SISU"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              trackingContext="alternativa_odoo_migracion_whatsapp"
            >
              Solicitar Migración
            </TrackedWhatsAppLink>
          </div>
        </section>

        <RelatedGuides currentPath="/alternativa-odoo-honduras" />
      </div>
    </PublicPageShell>
  )
}

