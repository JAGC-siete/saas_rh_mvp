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
    question: '¿Qué recibo al dejar mi correo?',
    answer:
      'La historia completa en pantalla al instante, el mismo contenido en tu correo, y una serie breve de emails sobre por qué delegar lo repetitivo — sin venta agresiva.',
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
    { name: 'Cerrar planilla en paz', url: INFO_FUNNEL_PUBLIC_PATH },
  ])
  const faqSchema = generateFAQPageSchema(FAQS)

  useEffect(() => {
    initGoogleAdsTracking()
  }, [])

  return (
    <PublicPageShell showSpotlight loginAlwaysVisible>
      <PublicPageHead title={pageTitle} description={pageDescription} canonicalPath={INFO_FUNNEL_PUBLIC_PATH} />
      <SchemaMarkup schema={[webPageSchema, breadcrumbSchema, faqSchema]} />

      <div className="viernes-page" id="info-lead">
        <SealedEnvelopeLead />

        <hr className="viernes-divider" />

        <section className="viernes-section">
          <h2 className="viernes-serif viernes-section-title">
            ¿Ya validaste tu sueldo con nuestras calculadoras?
          </h2>
          <p className="viernes-lead mb-8">
            Prueba gratis el motor legal antes de automatizar toda la planilla.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <Link
              href="/activar?utm_source=info&utm_medium=cta&utm_campaign=trial"
              className="viernes-btn viernes-btn-primary"
            >
              Probar software gratis
            </Link>
            <Link
              href="/calculadora?utm_source=info&utm_medium=cta&utm_campaign=calculators"
              className="viernes-btn viernes-btn-ghost"
            >
              Ver calculadoras laborales
            </Link>
            <Link
              href="/ventas?utm_source=info&utm_medium=cta&utm_campaign=pricing"
              className="viernes-btn viernes-btn-ghost"
            >
              Cotización y precios
            </Link>
          </div>
        </section>

        <hr className="viernes-divider" />

        <section className="viernes-section">
          <h2 className="viernes-serif viernes-section-title">Preguntas frecuentes</h2>
          <div>
            {FAQS.map((faq) => (
              <details key={faq.question} className="viernes-faq-item group">
                <summary className="viernes-faq-summary">{faq.question}</summary>
                <p className="viernes-faq-answer">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </PublicPageShell>
  )
}
