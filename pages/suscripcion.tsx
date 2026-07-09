import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import PublicPageShell from '../components/landing/PublicPageShell'
import ReciboAlertasLead from '../components/suscripcion-game/ReciboAlertasLead'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import { generateBreadcrumbListSchema, generateFAQPageSchema, generateWebPageSchema } from '../lib/seo/schema'
import { generateTitle } from '../lib/seo/title'
import { generateDescription } from '../lib/seo/description'
import { CALCULATOR_HUB_LINKS } from '../lib/public-calculator/hub-links'
import {
  getCalculatorUtmContext,
  readUtmSourceFromQuery,
} from '../lib/suscripcion-game/calculator-utm-context'

const FAQS = [
  {
    question: '¿Qué recibo al activar alertas?',
    answer:
      'Recordatorios de fechas legales (aguinaldo, catorceavo), explicaciones cuando cambian deducciones y guías para entender tu recibo — el mismo motor que alimenta las calculadoras gratuitas.',
  },
  {
    question: '¿Es gratis?',
    answer:
      'Sí. Las alertas son gratuitas. Las calculadoras también siguen siendo gratis, las uses con alertas o no.',
  },
  {
    question: '¿Puedo usar las calculadoras sin activar alertas?',
    answer:
      'Sí. Todas las calculadoras laborales de Humano SISU son gratuitas: deducciones por país, aguinaldo, catorceavo y prestaciones.',
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
  const router = useRouter()
  const utmContext = useMemo(
    () => getCalculatorUtmContext(readUtmSourceFromQuery(router.query)),
    [router.query]
  )

  const pageTitle = generateTitle({
    primaryKeyword: 'Alertas legales sobre tu sueldo',
    secondaryKeywords: 'Calculadoras laborales Honduras El Salvador Guatemala',
  })
  const pageDescription = generateDescription({
    valueProposition:
      'Alertas gratis de aguinaldo, catorceavo y cambios en deducciones — para quien revisa su recibo en Honduras, El Salvador y Guatemala',
    cta: 'Activar alertas gratis',
    additionalBenefit: 'Mismo motor legal que las calculadoras de Humano SISU',
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
    { name: 'Alertas de sueldo', url: '/suscripcion' },
  ])
  const faqSchema = generateFAQPageSchema(FAQS)

  return (
    <PublicPageShell showSpotlight>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content="alertas sueldo, calculadoras laborales, IHSS RAP ISR, aguinaldo Honduras, deducciones recibo, Humano SISU"
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
          <ReciboAlertasLead utmContext={utmContext} source="suscripcion-page" />

          <div className="mt-14 mb-10">
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

          <details className="group mb-4">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 glass rounded-xl p-4 border border-white/10 hover:border-cyan-400/30 transition-colors">
              <div>
                <h2 className="text-lg font-semibold text-white">Calculadoras gratuitas</h2>
                <p className="text-sm text-brand-300/80 mt-1">
                  Validá sueldo neto, aguinaldo o finiquito — siempre gratis.
                </p>
              </div>
              <span
                className="text-brand-300 text-sm shrink-0 group-open:rotate-180 transition-transform"
                aria-hidden
              >
                ▼
              </span>
            </summary>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </details>
        </div>
      </section>
    </PublicPageShell>
  )
}
