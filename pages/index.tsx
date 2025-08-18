import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import DemoFooter from '../components/DemoFooter'
import ServicesSection from '../components/ServicesSection'
import dynamic from 'next/dynamic'

const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })
const HeroCarousel = dynamic(() => import('../components/HeroCarousel'), { ssr: false })
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Bars3Icon,
  XMarkIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'



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
        <title>Humano SISU - Automatiza tu RH</title>
        <meta
          name="description"
          content="Automatiza HOY el 80% de RH en 24 horas: Asistencia, Nómina y Vouchers de pago en 1 solo clic. Paga por empleados. Sin pasivo laboral, sin errores."
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
                  <span className="text-white">Humano SISU</span>{' '}
                  <span className="text-brand-300">presenta Los Robots de RRHH</span>
                </h1>
              </div>

              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <a
                    href="#libro-rojo"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0"
                    onClick={scrollToSection}
                  >
                    El Libro Rojo
                  </a>
                  <a
                    href="#planillero"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0"
                    onClick={scrollToSection}
                  >
                    El Planillero
                  </a>
                  <a
                    href="#pricing"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0"
                    onClick={scrollToSection}
                  >
                    Precios
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
                  {isMobileMenuOpen ? <XMarkIcon className="block h-6 w-6" /> : <Bars3Icon className="block h-6 w-6" />}
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
                  href="#libro-rojo"
                  className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}

                >
                  Asistencia
                </a>
                <a
                  href="#planillero"
                  className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}

                >
                  Nómina
                </a>
                <a
                  href="#pricing"
                  className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}

                >
                  Precios
                </a>
                <div className="px-3 py-2 space-y-2">
                  <Link
                    href="/activar"
                    className="text-brand-200/90 hover:text-white block w-full text-center py-2 px-4 font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Ver demo
                  </Link>
                  <Link
                    href="/app/login"
                    className="bg-brand-900 hover:bg-brand-800 text-white w-full text-center block py-2 px-4 rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}

                  >
                    Iniciar sesión
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Hero - Results-Focused */}
      <section className="py-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-6 mb-8 animate-fade-up-subtle">
            <span className="text-sm bg-green-500/10 text-green-400 px-3 py-1 rounded-full border border-green-500/20 hover:bg-green-500/20 transition-all duration-300 hover:-translate-y-0.5 animate-delay-100">✓ Cumple STSS Honduras</span>
            <span className="text-sm bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 hover:bg-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 animate-delay-200">⚡ Setup en 24 horas</span>
            <span className="text-sm bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full border border-orange-500/20 hover:bg-orange-500/20 transition-all duration-300 hover:-translate-y-0.5 animate-delay-300">🔥 02 empresas activas</span>
            <span className="text-sm bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5 animate-delay-500">0 errores de cálculo</span>
            <span className="text-sm bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full border border-purple-500/20 hover:bg-purple-500/20 transition-all duration-300 hover:-translate-y-0.5 animate-delay-600">📊 IHSS, RAP, ISR 2025</span>
          </div>

          {/* Hero Carousel Section */}
          <div className="text-center max-w-6xl mx-auto mb-12">
            <HeroCarousel />
          </div>

        </div>
      </section>

      {/* Services Section - Rediseñada */}
      <ServicesSection />

      {/* Social Proof Section */}
      <section className="py-16 bg-white/5">
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

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-white">
          Planes simples, precios sin letra pequeña
        </h2>
        <div className="text-center max-w-lg mx-auto">
          <Card variant="glass" className="hover:border-brand-500/50 transition-all duration-300">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold text-white mb-4">
                RH 100% Digital
              </CardTitle>
              <div className="space-y-2">
                <div className="text-5xl font-bold text-brand-400">
                  L300 <span className="text-xl text-brand-200">/empleado/mes</span>
                </div>
                <div className="text-2xl text-brand-300">
                  $12.50 <span className="text-base text-brand-200">USD/empleado/mes</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-left text-brand-200/90 mb-6 space-y-1">
                <li>🔥 Reducí los costos de RH, automatiza hoy.</li>
                <li>💰 Costo L300 / empleado </li>
                <li>⚡ Listo en 24 horas. Cancela cuando quieras.</li>
              </ul>
              <p className="text-brand-200 mb-6 leading-relaxed">
                L300/empleado/mes. Todo incluido: Asistencia, Nómina, Vouchers, Dashboard.
              </p>
              <Link
                href="/activar"
                className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 px-4 rounded-lg font-bold transition-all duration-300 inline-flex items-center justify-center gap-2 text-lg shadow-lg shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-xl hover:shadow-brand-900/50"
              >
                Automatizar mi RH hoy
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>
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
