import Head from 'next/head'
import Link from 'next/link'
import PublicPageShell from '../components/landing/PublicPageShell'
import MailListSubscription from '../components/MailListSubscription'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import { generateBreadcrumbListSchema, generateFAQPageSchema, generateWebPageSchema } from '../lib/seo/schema'
import { generateTitle } from '../lib/seo/title'
import { generateDescription } from '../lib/seo/description'
import { CALCULATOR_HUB_LINKS } from '../lib/public-calculator/hub-links'

const FAQS = [
  {
    question: '¿Qué recibo al suscribirme?',
    answer:
      'Actualizaciones sobre nómina y RRHH en Centroamérica, recordatorios legales (aguinaldo, catorceavo, deducciones), acceso a nuevas calculadoras gratuitas y novedades del software Humano SISU.',
  },
  {
    question: '¿La suscripción es gratis?',
    answer:
      'Sí. El newsletter es gratuito. Si más adelante quieres automatizar planilla completa, puedes activar la prueba del software o solicitar una cotización en la página de ventas.',
  },
  {
    question: '¿Puedo seguir usando las calculadoras sin suscribirme?',
    answer:
      'Sí. Todas las calculadoras laborales de Humano SISU son gratuitas: deducciones por país, aguinaldo, catorceavo y prestaciones en Honduras.',
  },
  {
    question: '¿Humano SISU sirve para mi país?',
    answer:
      'Humano SISU opera nómina y asistencia para Honduras, El Salvador y Guatemala, con deducciones de ley locales (IHSS/RAP/ISR, ISSS/AFP, IGSS, etc.).',
  },
]

const ALL_CALCULATOR_LINKS = [
  ...CALCULATOR_HUB_LINKS.deductions.map((item) => ({
    href: item.href,
    label: `${item.title} (${item.country})`,
    subtitle: item.subtitle,
  })),
  ...CALCULATOR_HUB_LINKS.benefits.map((item) => ({
    href: item.href,
    label: `${item.title} (${item.country})`,
    subtitle: item.subtitle,
  })),
  {
    href: CALCULATOR_HUB_LINKS.prestaciones.href,
    label: CALCULATOR_HUB_LINKS.prestaciones.title,
    subtitle: CALCULATOR_HUB_LINKS.prestaciones.subtitle,
  },
]

export default function SuscripcionPage() {
  const pageTitle = generateTitle({
    primaryKeyword: 'Suscripción newsletter nómina y RRHH',
    secondaryKeywords: 'Calculadoras laborales Honduras El Salvador Guatemala',
  })
  const pageDescription = generateDescription({
    valueProposition:
      'Suscríbete al newsletter de Humano SISU: guías de nómina, alertas legales y novedades tras usar nuestras calculadoras gratuitas de deducciones, aguinaldo y prestaciones',
    cta: 'Suscríbete gratis',
    additionalBenefit: 'PyMEs en Honduras, El Salvador y Guatemala',
  })

  const webPageSchema = generateWebPageSchema({
    url: '/suscripcion',
    title: pageTitle,
    description: pageDescription,
    inLanguage: 'es',
  })
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Inicio', url: '/' },
    { name: 'Calculadoras', url: '/calculadora' },
    { name: 'Suscripción', url: '/suscripcion' },
  ])
  const faqSchema = generateFAQPageSchema(FAQS)

  return (
    <PublicPageShell showSpotlight>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content="suscripción Humano SISU, newsletter nómina, calculadoras laborales, IHSS RAP ISR, aguinaldo Honduras, software RRHH Centroamérica"
        />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content="https://humanosisu.net/suscripcion" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://humanosisu.net/suscripcion" />
      </Head>
      <SchemaMarkup schema={[webPageSchema, breadcrumbSchema, faqSchema]} />

      <section id="mail-list" className="py-10 sm:py-14 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-8 sm:mb-10">
            <span className="inline-block px-3 py-1 mb-4 text-xs rounded-full bg-brand-500/20 text-brand-200 border border-brand-500/30">
              Newsletter · Nómina regional
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              Suscríbete después de validar tu sueldo con nuestras calculadoras
            </h1>
            <p className="text-base sm:text-lg text-brand-200/90 max-w-2xl mx-auto leading-relaxed">
              Si ya usaste una calculadora de deducciones, aguinaldo, catorceavo o prestaciones, recibe por correo
              guías prácticas, alertas legales y novedades de Humano SISU — el mismo motor que alimenta esas
              herramientas gratuitas.
            </p>
          </div>

          <div className="max-w-md mx-auto mb-10">
            <MailListSubscription source="suscripcion-page" />
          </div>

          <div className="glass-modern rounded-2xl p-5 sm:p-6 border border-white/10 mb-8">
            <h2 className="text-lg font-semibold text-white mb-2">¿Prefieres automatizar la planilla?</h2>
            <p className="text-sm text-brand-200/90 mb-4">
              Activa la prueba gratuita del software o solicita una cotización con precios según empleados y país.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/activar?utm_source=suscripcion&utm_medium=cta&utm_campaign=post-newsletter"
                className="inline-flex justify-center py-3 px-5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm"
              >
                Probar Humano SISU gratis
              </Link>
              <Link
                href="/ventas?utm_source=suscripcion&utm_medium=cta&utm_campaign=pricing"
                className="inline-flex justify-center py-3 px-5 border border-white/20 hover:bg-white/10 text-white font-semibold rounded-xl text-sm"
              >
                Ver planes y cotización
              </Link>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4">Calculadoras gratuitas relacionadas</h2>
            <p className="text-sm text-brand-300/80 mb-4">
              Vuelve cuando quieras a validar sueldo neto, aguinaldo o finiquito — siempre gratis.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_CALCULATOR_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="glass rounded-xl p-4 border border-white/10 hover:border-cyan-400/40 transition-all"
                >
                  <div className="font-medium text-white text-sm">{item.label}</div>
                  <div className="text-xs text-brand-300/70 mt-1">{item.subtitle}</div>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-center">
              <Link href="/calculadora" className="text-brand-300 hover:text-white underline text-sm">
                Ver todas las calculadoras laborales
              </Link>
            </p>
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
