import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import MainHeader from '../components/MainHeader'
import DemoFooter from '../components/DemoFooter'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import { generateWebPageSchema } from '../lib/seo/schema'
import { generateTitle } from '../lib/seo/title'
import { generateDescription } from '../lib/seo/description'

const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })

export default function CalculadoraHubPage() {
  const pageTitle = generateTitle({
    primaryKeyword: 'Calculadoras laborales gratis Honduras',
    secondaryKeywords: 'Deducciones e indemnización',
  })
  const pageDescription = generateDescription({
    valueProposition: 'Calcula deducciones del salario (IHSS, RAP, ISR) y prestaciones laborales (cesantía, preaviso, vacaciones, 13vo y 14vo) en Honduras',
    cta: 'Usa la calculadora gratis',
    additionalBenefit: 'sin hojas de cálculo, sin cálculos manuales',
  })

  const webPageSchema = generateWebPageSchema({
    url: '/calculadora',
    title: pageTitle,
    description: pageDescription,
  })

  return (
    <div className="min-h-screen bg-app pt-16 sm:pt-20 md:pt-24 relative">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content="calculadora deducciones Honduras, IHSS RAP ISR, calculadora prestaciones Honduras, cesantía preaviso vacaciones, 13vo 14vo"
        />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content="https://humanosisu.net/calculadora" />
        <link rel="canonical" href="https://humanosisu.net/calculadora" />
      </Head>
      <SchemaMarkup schema={webPageSchema} />

      <MainHeader enableScrollEffect={true} fixed={true} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        <div className="text-center mb-10 sm:mb-14">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-6 animate-fade-up-subtle">
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-200 text-xs rounded-full border border-cyan-500/30">
              Herramientas gratuitas
            </span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-200 text-xs rounded-full border border-blue-500/30">
              Honduras · Leyes vigentes
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-200 text-xs rounded-full border border-purple-500/30">
              Sin hojas de cálculo
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            <span className="text-white block">Calculadoras laborales gratuitas de Honduras</span>
            <span className="text-brand-300 block mt-2">Deducciones de salario y liquidación por finiquito</span>
          </h1>
          <p className="text-lg sm:text-xl text-brand-200/90 max-w-2xl mx-auto">
            Elige la calculadora que necesitas. Resultados claros, rápidos y basados en normativa vigente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-strong rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/15 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-purple-500/15 opacity-60 blur-xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-start gap-3 mb-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-400/20">
                  <svg className="h-6 w-6 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c1.657 0 3-1.343 3-3S13.657 2 12 2 9 3.343 9 5s1.343 3 3 3zm0 0v14m-4-4h8" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-2xl font-bold text-white">Deducciones del salario</h2>
                  <p className="text-brand-200/90 mt-1">ISR · IHSS · RAP</p>
                </div>
              </div>
              <p className="text-sm text-brand-200/90 mb-5">
                Ideal si quieres validar cuánto te descuentan cada mes (mensual o quincenal) y conocer tu salario neto.
              </p>
              <Link
                href="/calculadora-deducciones"
                className="inline-flex w-full items-center justify-center py-3.5 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
              >
                Calcular deducciones
              </Link>
            </div>
          </div>

          <div className="glass-strong rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/15 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/15 via-emerald-500/15 to-cyan-500/10 opacity-60 blur-xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-start gap-3 mb-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/15 border border-green-400/20">
                  <svg className="h-6 w-6 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m-7 6h8a2 2 0 002-2V6a2 2 0 00-2-2H10l-2 2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-2xl font-bold text-white">Prestaciones laborales</h2>
                  <p className="text-brand-200/90 mt-1">Cesantía · Preaviso · Vacaciones · 13vo · 14vo</p>
                </div>
              </div>
              <p className="text-sm text-brand-200/90 mb-5">
                Útil si vas a renunciar o te despidieron y quieres una estimación clara del finiquito.
              </p>
              <Link
                href="/calculadora-prestaciones"
                className="inline-flex w-full items-center justify-center py-3.5 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
              >
                Calcular prestaciones
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/activar"
            className="text-sm text-brand-200/90 hover:text-white underline decoration-white/20 hover:decoration-white/40 transition-colors"
          >
            ¿Eres empresa? Usa la versión completa con tus empleados →
          </Link>
        </div>
      </main>

      <CloudBackground />
      <DemoFooter />
    </div>
  )
}

