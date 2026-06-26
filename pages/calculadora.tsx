import Head from 'next/head'
import Link from 'next/link'
import PublicPageShell from '../components/landing/PublicPageShell'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import { generateWebPageSchema, generateBreadcrumbListSchema } from '../lib/seo/schema'
import { generateTitle } from '../lib/seo/title'
import { generateDescription } from '../lib/seo/description'
import { CALCULATOR_HUB_LINKS } from '../lib/public-calculator/hub-links'

export default function CalculadoraHubPage() {
  const pageTitle = generateTitle({
    primaryKeyword: 'Calculadoras laborales gratis (norma local)',
    secondaryKeywords: 'Deducciones e indemnización SV GT HN'
  })
  const pageDescription = generateDescription({
    valueProposition:
      'Calculadoras de deducciones (Seguro Social, ISR) y prestaciones para Honduras, El Salvador y Guatemala',
    cta: 'Usa la calculadora gratis',
    additionalBenefit: 'mismo motor legal que Humano SISU'
  })

  const webPageSchema = generateWebPageSchema({
    url: '/calculadora',
    title: pageTitle,
    description: pageDescription
  })
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Inicio', url: '/' },
    { name: 'Calculadoras laborales', url: '/calculadora' }
  ])

  return (
    <PublicPageShell>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content="calculadora deducciones, IHSS RAP ISR Honduras, ISSS AFP El Salvador, IGSS Guatemala, sueldo neto, nómina regional, Humano SISU"
        />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content="https://humanosisu.net/calculadora" />
        <link rel="canonical" href="https://humanosisu.net/calculadora" />
      </Head>
      <SchemaMarkup schema={[webPageSchema, breadcrumbSchema]} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        <div className="text-center mb-10 sm:mb-14">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-6">
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-200 text-xs rounded-full border border-cyan-500/30">
              Herramientas gratuitas
            </span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-200 text-xs rounded-full border border-blue-500/30">
              Honduras · El Salvador · Guatemala
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Calculadoras laborales gratuitas
          </h1>
          <p className="text-lg sm:text-xl text-brand-200/90 max-w-2xl mx-auto">
            Elige tu país y valida deducciones o prestaciones. Misma lógica legal que el software de nómina Humano SISU.
          </p>
        </div>

        <h2 className="text-xl font-semibold text-white mb-4">Deducciones de salario por país</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {CALCULATOR_HUB_LINKS.deductions.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="glass-modern rounded-2xl p-5 border border-white/15 hover:border-cyan-400/40 transition-all hover:-translate-y-0.5"
            >
              <div className="text-xs text-brand-300 mb-1">{item.country}</div>
              <div className="text-lg font-bold text-white">{item.title}</div>
              <div className="text-sm text-brand-200/80 mt-2">{item.subtitle}</div>
              {'badge' in item && typeof item.badge === 'string' && (
                <div className="mt-3 text-xs text-cyan-300">{item.badge}</div>
              )}
            </Link>
          ))}
        </div>

        <h2 className="text-xl font-semibold text-white mb-4">Aguinaldo y catorceavo (Honduras)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {CALCULATOR_HUB_LINKS.benefits.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="glass-modern rounded-2xl p-5 border border-white/15 hover:border-green-400/40 transition-all hover:-translate-y-0.5"
            >
              <div className="text-xs text-brand-300 mb-1">{item.country}</div>
              <div className="text-lg font-bold text-white">{item.title}</div>
              <div className="text-sm text-brand-200/80 mt-2">{item.subtitle}</div>
            </Link>
          ))}
        </div>

        <h2 className="text-xl font-semibold text-white mb-4">Otras herramientas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href={CALCULATOR_HUB_LINKS.prestaciones.href}
            className="glass-modern rounded-2xl p-6 border border-white/15 hover:border-green-400/40 transition-all"
          >
            <h3 className="text-xl font-bold text-white">{CALCULATOR_HUB_LINKS.prestaciones.title}</h3>
            <p className="text-brand-200/90 mt-2 text-sm">{CALCULATOR_HUB_LINKS.prestaciones.subtitle}</p>
          </Link>
          <Link
            href={CALCULATOR_HUB_LINKS.landing.href}
            className="glass-modern rounded-2xl p-6 border border-brand-500/30 hover:border-brand-400/50 transition-all bg-brand-600/10"
          >
            <h3 className="text-xl font-bold text-white">Software de nómina regional</h3>
            <p className="text-brand-200/90 mt-2 text-sm">
              {CALCULATOR_HUB_LINKS.landing.label} — biometría, planilla y deducciones de ley en un solo lugar.
            </p>
          </Link>
        </div>

        <div className="mt-10 text-center glass-modern rounded-xl p-6 border border-white/10">
          <p className="text-brand-200/90 mb-4">
            ¿Validaste tu sueldo y quieres eliminar Excel en tu empresa?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
            <Link
              href="/activar"
              className="inline-flex justify-center py-3 px-6 btn-shiny bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl"
            >
              Probar Humano SISU gratis
            </Link>
            <Link
              href="/suscripcion?utm_source=calculadora-hub&utm_medium=cta&utm_campaign=footer"
              className="inline-flex justify-center py-3 px-6 glass-modern hover:bg-white/10 text-white font-semibold rounded-xl border border-brand-500/40"
            >
              Suscribirme al newsletter
            </Link>
            <Link
              href="/ventas?utm_source=calculadora-hub&utm_medium=cta&utm_campaign=pricing"
              className="inline-flex justify-center py-3 px-6 glass-modern hover:bg-white/10 text-white font-semibold rounded-xl border border-white/20"
            >
              Ver planes y cotización
            </Link>
          </div>
        </div>
      </div>
    </PublicPageShell>
  )
}
