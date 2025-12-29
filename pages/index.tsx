import Head from 'next/head'
import Link from 'next/link'
import DemoFooter from '../components/DemoFooter'
import ServicesSection from '../components/ServicesSection'
import HowItWorks from '../components/HowItWorks'
import AWSCertificationsSection from '../components/AWSCertificationsSection'
import LandingHero from '../components/LandingHero'
import MainHeader from '../components/MainHeader'
import dynamic from 'next/dynamic'
import MailListSection from '../components/MailListSection'

const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })

export default function LandingPage() {

  return (
    <div className="min-h-screen bg-app pt-16 sm:pt-20 md:pt-24 relative">
      <Head>
        <title>Digitaliza la Asistencia y Olvídate de la Nómina | Humano SISU</title>
        <link rel="icon" href="/logo-humano-sisu.png" />
        <meta
          name="description"
          content="Digitaliza el registro de asistencia y olvídate de la nómina para siempre. Sistema que calcula IHSS, RAP e ISR y genera planilla automáticamente sin Excel, sin errores."
        />
        <meta name="keywords" content="planilla Honduras, IHSS, RAP, ISR, automatización RH, STSS, Humano SISU, innovación" />
        <meta name="author" content="Humano SISU" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Digitaliza la Asistencia y Olvídate de la Nómina | Humano SISU" />
        <meta property="og:description" content="Digitaliza el registro de asistencia y olvídate de la nómina para siempre. Sistema que calcula IHSS, RAP e ISR y genera planilla automáticamente sin Excel, sin errores." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://humano-sisu.com" />
        <meta property="og:image" content="/logo-humano-sisu.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Digitaliza la Asistencia y Olvídate de la Nómina | Humano SISU" />
        <meta name="twitter:description" content="Digitaliza el registro de asistencia y olvídate de la nómina para siempre. Sistema que calcula IHSS, RAP e ISR y genera planilla automáticamente sin Excel, sin errores." />
        <link rel="canonical" href="https://humano-sisu.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </Head>

      {/* Header */}
      <MainHeader enableScrollEffect={true} fixed={true} />

      {/* Main Hero - LandingHero enfocado en conversión */}
      <section className="py-4 sm:py-6 md:py-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Hero Title - Centrado */}
          <div className="text-center mb-6 sm:mb-8 px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight sm:leading-tight">
              <span className="text-white block sm:inline">Digitaliza el registro de asistencia</span>
              <span className="hidden sm:inline"> </span>
              <span className="text-brand-300 block sm:inline mt-1 sm:mt-0">y olvídate de la nómina para siempre</span>
            </h1>
          </div>

          {/* LandingHero Section - Reemplaza completamente al carrusel */}
          <div className="text-center max-w-6xl mx-auto mb-6">
            <LandingHero />
          </div>
        </div>
      </section>

      {/* SECCIÓN 1 — DOLOR */}
      <section className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-8 sm:mb-12 px-2">
            Lo que hoy te está pasando
          </h2>
          
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10">
            <ul className="space-y-4 sm:space-y-5">
              <li className="flex items-start gap-3 sm:gap-4">
                <span className="text-red-400 text-xl sm:text-2xl mt-1">•</span>
                <p className="text-base sm:text-lg text-red-100/90 flex-1">
                  Cada quincena repites el mismo infierno.
                </p>
              </li>
              <li className="flex items-start gap-3 sm:gap-4">
                <span className="text-red-400 text-xl sm:text-2xl mt-1">•</span>
                <p className="text-base sm:text-lg text-red-100/90 flex-1">
                  Excel roto, fórmulas dudosas, horas perdidas.
                </p>
              </li>
              <li className="flex items-start gap-3 sm:gap-4">
                <span className="text-red-400 text-xl sm:text-2xl mt-1">•</span>
                <p className="text-base sm:text-lg text-red-100/90 flex-1">
                  Miedo constante a errores, reclamos o multas.
                </p>
              </li>
              <li className="flex items-start gap-3 sm:gap-4">
                <span className="text-red-400 text-xl sm:text-2xl mt-1">•</span>
                <p className="text-base sm:text-lg text-red-100/90 flex-1">
                  El domingo se va en planilla, no en descanso.
                </p>
              </li>
            </ul>
            
            <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-red-500/30">
              <p className="text-lg sm:text-xl font-semibold text-red-200 text-center">
                Resultado actual: <span className="text-white">Tiempo perdido. Estrés innecesario. Riesgo legal permanente.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 2 — CAMBIO CLARO */}
      <HowItWorks />

      {/* Services Section - Rediseñada */}
      <div className="mt-4">
        <ServicesSection />
      </div>

      {/* AWS Certifications Section */}
      <AWSCertificationsSection />

      {/* SECCIÓN 7 — CTA FINAL */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-sky-900/50 to-brand-900/50 border border-sky-400/30 rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 px-2 leading-tight">
              Digitaliza la asistencia.<br className="hidden sm:block" />
              <span className="text-brand-300"> Olvídate de la nómina para siempre.</span>
            </h2>
            <button
              onClick={() => window.location.href = '/activar'}
              className="mt-6 sm:mt-8 inline-flex items-center justify-center rounded-xl px-8 sm:px-12 py-4 sm:py-5 text-lg sm:text-xl md:text-2xl font-bold shadow-xl bg-sky-600 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-300 hover:-translate-y-1"
              data-analytics="cta_final_click"
            >
              Activar ahora — Gratis 30 días
            </button>
            <p className="mt-4 text-sm sm:text-base text-brand-200/70">
              Sin tarjeta. Sin compromiso.
            </p>
          </div>
        </div>
      </section>

      {/* Mail List Subscription Section - Comentada temporalmente */}
      {/* <MailListSection /> */}

      {/* SECCIÓN 3 — BENEFICIO CENTRAL (emocional) */}
      <section className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="mx-auto h-72 w-72 blur-3xl rounded-full opacity-20 bg-brand-600/40 translate-y-8" />
        </div>
        
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-6 sm:mb-8 px-2">
            No compras software. Compras esto:
          </h2>
          
          <div className="bg-gradient-to-br from-brand-900/50 to-sky-900/50 border border-brand-400/30 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10">
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl sm:text-3xl">✓</span>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Domingos libres</h3>
                  <p className="text-brand-200/80 text-sm sm:text-base">Tu tiempo de vuelta. Sin planilla manual.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl sm:text-3xl">✓</span>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Tranquilidad quincenal</h3>
                  <p className="text-brand-200/80 text-sm sm:text-base">Cero estrés. Cero errores. Cero multas.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl sm:text-3xl">✓</span>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Confianza en cada cálculo</h3>
                  <p className="text-brand-200/80 text-sm sm:text-base">Cada número verificado. Cada deducción correcta.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl sm:text-3xl">✓</span>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Control total</h3>
                  <p className="text-brand-200/80 text-sm sm:text-base">Sin depender de Excel ni de terceros.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 4 — PRUEBA SOCIAL */}
      <section id="prueba-social" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-white mb-6 sm:mb-8 px-2">
            Ya funciona en empresas reales
          </h2>

          {/* Números */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-12">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-brand-300 mb-2">+150</div>
              <div className="text-sm sm:text-base text-brand-200/80">empresas usando el sistema</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-brand-300 mb-2">6</div>
              <div className="text-sm sm:text-base text-brand-200/80">horas ahorradas por quincena</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-green-400 mb-2">0</div>
              <div className="text-sm sm:text-base text-brand-200/80">multas por errores de cálculo</div>
            </div>
          </div>

          {/* Testimonios */}
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { name: 'Felix Garcia', company: 'Tony\'s Mar Restaurant', employees: '40 empleados', quote: 'Ya no pierdo domingos haciendo planilla. 4 horas ahora son 4 minutos.' },
              { name: 'Gustavo Argueta', company: 'Humano SISU', employees: '37 empleados', quote: 'Antes llevábamos la asistencia en un libro rojo, ahora tenemos dashboard interactivo.' },
              { name: 'Luis Diego Maradiaga', company: 'AFI & Asociados', employees: '15 empleados', quote: 'Cero errores en IHSS desde que lo uso. Mi contador está feliz.' }
            ].map((testimonial, i) => (
              <div key={`testimonial-${i}`} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <p className="text-white font-medium">{testimonial.name}</p>
                    <p className="text-brand-200/80 text-sm">{testimonial.company}</p>
                  </div>
                </div>
                <blockquote className="text-brand-200/90 italic mb-4">&ldquo;{testimonial.quote}&rdquo;</blockquote>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-400">{testimonial.employees}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shared Cloud Background */}
      <CloudBackground />

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12 sm:mt-16 md:mt-20">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 md:py-12">
          <div className="text-center">
            <p className="text-sm sm:text-base text-slate-400 mb-3 sm:mb-4 px-2">
              Protegemos tu información. <strong>Solo será utilizada para contactarte</strong>.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center items-center text-xs sm:text-sm px-2">
              <Link 
                href="/politicadeprivacidad" 
                className="text-brand-300 hover:text-brand-400 transition-colors underline decoration-brand-400/30 hover:decoration-brand-400"
              >
                Política de Privacidad
              </Link>
              <span className="text-slate-500">•</span>
              <span className="text-slate-500">© 2025 Humano SISU. Todos los derechos reservados.</span>
            </div>
          </div>
        </div>
      </footer>

      <DemoFooter />
    </div>
  )
}
