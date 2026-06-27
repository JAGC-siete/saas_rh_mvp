import Link from 'next/link'
import { useEffect } from 'react'
import PublicPageShell from '../components/landing/PublicPageShell'
import PublicPageHead from '../components/SEO/PublicPageHead'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import SealedEnvelopeLead from '../components/info-game/SealedEnvelopeLead'
import { initGoogleAdsTracking } from '../lib/analytics/googleAds'
import { generateBreadcrumbListSchema, generateFAQPageSchema, generateWebPageSchema } from '../lib/seo/schema'
import { getPageDescription } from '../lib/seo/description'
import { getPageTitle } from '../lib/seo/title'
import { INFO_FUNNEL_PUBLIC_PATH } from '../lib/marketing/info-funnel-path'

const FAQS = [
  {
    question: '¿Qué es Humano SISU?',
    answer:
      'Software de recursos humanos para PyMEs en Honduras, El Salvador y Guatemala: control de asistencia biométrico, nómina con deducciones de ley (IHSS, RAP, ISR, ISSS, AFP, IGSS) y comprobantes digitales.',
  },
  {
    question: '¿Qué recibo al desbloquear el secreto?',
    answer:
      'El truco en pantalla al instante, el mismo contenido en tu correo, y una serie breve de misiones (emails) sobre por qué delegar lo repetitivo — sin venta agresiva.',
  },
  {
    question: '¿Esto activa un trial o me cobra algo?',
    answer:
      'No. Este formulario solo solicita información. No activamos trial ni generamos cotización automática hasta que tú lo pidas en /activar o /ventas.',
  },
  {
    question: '¿Puedo validar mi sueldo antes de contratar?',
    answer:
      'Sí. Usa nuestras calculadoras gratuitas de deducciones, aguinaldo, catorceavo y prestaciones — con el mismo motor legal que el software.',
  },
]

export default function InfoPage() {
  const pageTitle = getPageTitle('info')
  const pageDescription = getPageDescription('info')

  const webPageSchema = generateWebPageSchema({
    url: INFO_FUNNEL_PUBLIC_PATH,
    title: pageTitle,
    description: pageDescription,
    inLanguage: 'es',
  })
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Inicio', url: '/' },
    { name: 'El Secreto', url: INFO_FUNNEL_PUBLIC_PATH },
  ])
  const faqSchema = generateFAQPageSchema(FAQS)

  useEffect(() => {
    initGoogleAdsTracking()
  }, [])

  return (
    <PublicPageShell showSpotlight loginAlwaysVisible>
      <PublicPageHead title={pageTitle} description={pageDescription} canonicalPath={INFO_FUNNEL_PUBLIC_PATH} />
      <SchemaMarkup schema={[webPageSchema, breadcrumbSchema, faqSchema]} />

      <section id="info-lead" className="py-10 sm:py-14 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <SealedEnvelopeLead />

          <div className="glass-modern rounded-2xl p-5 sm:p-6 border border-white/10 mb-8 mt-12">
            <h2 className="text-lg font-semibold text-white mb-2">¿Ya validaste tu sueldo con nuestras calculadoras?</h2>
            <p className="text-sm text-brand-200/90 mb-4">
              Prueba gratis el motor legal antes de automatizar toda la planilla.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <Link
                href="/calculadora?utm_source=info&utm_medium=cta&utm_campaign=calculators"
                className="inline-flex justify-center py-2.5 px-4 text-sm text-brand-300 hover:text-white underline"
              >
                Ver calculadoras laborales
              </Link>
              <Link
                href="/activar?utm_source=info&utm_medium=cta&utm_campaign=trial"
                className="inline-flex justify-center py-2.5 px-5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm"
              >
                Probar software gratis
              </Link>
              <Link
                href="/ventas?utm_source=info&utm_medium=cta&utm_campaign=pricing"
                className="inline-flex justify-center py-2.5 px-5 border border-white/20 hover:bg-white/10 text-white font-semibold rounded-xl text-sm"
              >
                Cotización y precios
              </Link>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Preguntas frecuentes</h2>
            <div className="space-y-3">
              {FAQS.map((faq) => (
                <div key={faq.question} className="glass rounded-xl p-4 border border-white/10">
                  <h3 className="font-medium text-white text-sm mb-2">{faq.question}</h3>
                  <p className="text-sm text-brand-200/90 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
