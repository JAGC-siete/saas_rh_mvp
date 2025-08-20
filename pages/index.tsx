import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import DemoFooter from '../components/DemoFooter'
import ServicesSection from '../components/ServicesSection'
import LandingHero from '../components/LandingHero'
import CountdownTimer from '../components/CountdownTimer'
import dynamic from 'next/dynamic'

const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      setIsScrolled(scrollTop > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const href = e.currentTarget.getAttribute('href')
    if (href && href.startsWith('#')) {
      const element = document.querySelector(href)
      if (element) element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-app pt-20 relative">
      <Head>
        <title>¿Otra quincena corriendo detrás de la planilla? | Humano SISU</title>
        <meta
          name="description"
          content="Generá planilla en 5 minutos con IHSS, RAP e ISR listos y vouchers enviados por WhatsApp. Cumplimiento STSS, de Excel caótico a PDF impecable."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </Head>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* Fixed Header with Glass Effect */}
        <div
          className={`w-full transition-all duration-300 ${
            isScrolled 
              ? 'bg-slate-900/90 backdrop-blur-sm border-b border-white/20 shadow-lg' 
              : 'bg-transparent border-b border-white/10'
          }`}
        >
          <nav className="px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold text-white">
                  <span className="text-white">IHSS, RAP e ISR en automático</span>{' '}
                  <span className="text-brand-300">activa, cumplí y ahorrá horas cada quincena</span>
                </h1>
              </div>

              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <a
                    href="#servicios"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0"
                    onClick={scrollToSection}
                  >
                    Servicios
                  </a>
                  <Link
                    href="/app/login"
                    className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg shadow-black/20 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Iniciar sesión
                  </Link>
                </div>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="glass inline-flex items-center justify-center p-2 rounded-md text-brand-200 hover:text-white hover:bg-brand-700/20 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                >
                  <span className="sr-only">Open main menu</span>
                  {isMobileMenuOpen ? (
                    <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* Mobile menu */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isMobileMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 glass-strong rounded-lg shadow-lg mt-2">
                <a
                  href="#servicios"
                  className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Servicios
                </a>
                <Link
                  href="/app/login"
                  className="bg-brand-900 hover:bg-brand-800 text-white w-full text-center block py-2 px-4 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Iniciar sesión
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Hero - LandingHero enfocado en conversión */}
      <section className="py-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-6 mb-8 animate-fade-up-subtle">
            <span className="text-sm bg-green-500/10 text-green-400 px-3 py-1 rounded-full border border-green-500/20 hover:bg-green-500/20 transition-all duration-300 hover:-translate-y-0.5 animate-delay-100">Cumple STSS Honduras</span>
            <span className="text-sm bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 hover:bg-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 animate-delay-200">Setup en 24 horas</span>
            <span className="text-sm bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full border border-orange-500/20 hover:bg-orange-500/20 transition-all duration-300 hover:-translate-y-0.5 animate-delay-300">02 empresas activas</span>
          </div>

          {/* Countdown Timer - Centrado debajo de los trust badges */}
          <CountdownTimer />

          {/* LandingHero Section - Reemplaza completamente al carrusel */}
          <div className="text-center max-w-6xl mx-auto mb-12">
            <LandingHero />
          </div>
        </div>
      </section>

      {/* Services Section - Rediseñada */}
      <ServicesSection />

      {/* Social Proof Section - Simplificada */}
      <section id="servicios" className="py-16 bg-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Empresas que ya automatizaron su RH
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Felix Garcia', company: 'Tony\'s Mar Restaurant', employees: '40 empleados', quote: 'Ya no pierdo domingos haciendo planilla. 4 horas ahora son 4 minutos.' },
              { name: 'Gustavo Argueta', company: 'Paragon Honduras', employees: '37 empleados', quote: 'Antes llevavamos la asistencia en un libro rojo, ahora tneemos dashboard interactivo.' },
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
      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-slate-400 mb-4">
              Protegemos tu información. Sin spam, sin venta de datos. <strong>Solo para contactarte</strong>.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-sm">
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
