import Head from 'next/head'
import Link from 'next/link'
import { useEffect } from 'react'
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
  useEffect(() => {
    // Manejar scroll automático cuando se navega con hash
    const handleHashScroll = () => {
      if (window.location.hash) {
        const hash = window.location.hash
        const element = document.querySelector(hash)
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 100)
        }
      }
    }

    // Ejecutar al montar el componente
    handleHashScroll()

    // También escuchar cambios en el hash
    window.addEventListener('hashchange', handleHashScroll)
    return () => window.removeEventListener('hashchange', handleHashScroll)
  }, [])

  return (
    <div className="min-h-screen bg-app pt-16 sm:pt-20 md:pt-24 relative">
      <Head>
        <title>Servicio Hondureño de Recursos Humanos | Digital & Automatizado</title>
        <link rel="icon" href="/logo-humano-sisu.png" />
        <meta
          name="description"
          content="RH en automático y digital: asistencia, nómina con deducciones IHSS, RAP, ISR exactas, comprobantes de pago enviados directo a tus empleados."
        />
        <meta name="keywords" content="planilla Honduras, IHSS, RAP, ISR, automatización RH, STSS, Humano SISU, innovación" />
        <meta name="author" content="Humano SISU" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Servicio Hondureño de Recursos Humanos | Digital & Automatizado" />
        <meta property="og:description" content="RH en automático y digital: asistencia, nómina con deducciones IHSS, RAP, ISR exactas, comprobantes de pago enviados directo a tus empleados." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://humano-sisu.com" />
        <meta property="og:image" content="/logo-humano-sisu.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Servicio Hondureño de Recursos Humanos | Digital & Automatizado" />
        <meta name="twitter:description" content="RH en automático y digital: asistencia, nómina con deducciones IHSS, RAP, ISR exactas, comprobantes de pago enviados directo a tus empleados." />
        <link rel="canonical" href="https://humano-sisu.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </Head>

      {/* Header */}
      <MainHeader enableScrollEffect={true} fixed={true} />

      {/* Main Hero - LandingHero enfocado en conversión */}
      <section className="py-4 sm:py-6 md:py-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-6 mb-6 sm:mb-8 animate-fade-up-subtle">
            <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
              Cumplí STSS Honduras
            </span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
              Setup inicial en instantaneo
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
              30 días gratis
            </span>
            <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-500/30">
              Licencia anual
            </span>
          </div>

          {/* Hero Title - Centrado */}
          <div className="text-center mb-6 sm:mb-8 px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight sm:leading-tight">
              <span className="text-white block sm:inline">Digitalización de registro asistencia y nómina para MIPYMES</span>
              <span className="hidden sm:inline"> </span>
              <span className="text-brand-300 block sm:inline mt-1 sm:mt-0">Biométrico y Software</span>
            </h1>
          </div>

          {/* LandingHero Section - Reemplaza completamente al carrusel */}
          <div className="text-center max-w-6xl mx-auto mb-6">
            <LandingHero />
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section id="prueba-social" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center text-white leading-relaxed sm:leading-relaxed mb-6 sm:mb-8 px-2 max-w-5xl mx-auto">
            <span className="text-white block sm:inline">Lo dicen nuestros clientes: </span>
            <span className="text-brand-300 block sm:inline mt-1 sm:mt-0">la ventaja competitiva es que integra el biometrico con el software</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { name: 'Felix Garcia', company: 'Tony\'s Mar Restaurant', employees: '40 empleados', quote: 'Ya no pierdo domingos haciendo planilla. 4 horas ahora son 4 minutos.' },
              { name: 'Nancy Urrutia', company: 'PROHALCA', employees: '37 empleados', quote: 'Habiamos contratado un sistema de asistencia que no hacia planilla, ahora tenemos dashboard interactivo.' },
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

      {/* How It Works Section */}
      <HowItWorks />

      {/* Services Section - Rediseñada */}
      <div className="mt-4">
        <ServicesSection />
      </div>

      {/* AWS Certifications Section */}
      <AWSCertificationsSection />

      {/* Mail List Subscription Section */}
      <MailListSection />

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
