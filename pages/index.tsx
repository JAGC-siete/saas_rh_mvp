import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import DemoFooter from '../components/DemoFooter'
import ServicesSection from '../components/ServicesSection'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Bars3Icon,
  XMarkIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  // Mini ROI calculator state
  const [roiEmployees, setRoiEmployees] = useState<number>(20)
  const ahorroPorEmpleado = 350
  const ahorroTotal = Math.max(0, (Number.isFinite(roiEmployees) ? roiEmployees : 0) * ahorroPorEmpleado)

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-900 to-indigo-900">
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
      <header className="relative z-50">
        {/* Sticky Header */}
        <div
          className={`sticky-header ${isScrolled ? 'visible' : ''} sticky top-0 z-40 transition-all duration-500 ${
            isScrolled ? 'glass-strong' : 'bg-transparent backdrop-blur-sm border-b border-transparent'
          }`}
        >
          <nav className="px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <span className="text-2xl font-bold text-white">
                  HUMANO <span className="text-brand-400">SISU</span>{' '}
                  <span className="text-brand-300 text-lg">- La Agencia de Empleo Privada</span>
                </span>
              </div>

              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <a
                    href="#certificacion"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0"
                    onClick={scrollToSection}
                  >
                    Certificación
                  </a>
                  <a
                    href="#libro-rojo"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0"
                    onClick={scrollToSection}
                  >
                    Asistencia
                  </a>
                  <a
                    href="#planillero"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0"
                    onClick={scrollToSection}
                  >
                    Nómina
                  </a>
                  <a
                    href="#pricing"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0"
                    onClick={scrollToSection}
                  >
                    Precios
                  </a>
                  <Link
                    href="/demo"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Ver demo
                  </Link>
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
                  href="#certificacion"
                  className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-translation-key="nav.certification"
                >
                  Certificación
                </a>
                <a
                  href="#libro-rojo"
                  className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-translation-key="nav.attendance"
                >
                  Asistencia
                </a>
                <a
                  href="#planillero"
                  className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-translation-key="nav.payroll"
                >
                  Nómina
                </a>
                <a
                  href="#pricing"
                  className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-translation-key="nav.pricing"
                >
                  Precios
                </a>
                <div className="px-3 py-2 space-y-2">
                  <Link
                    href="/demo"
                    className="text-brand-200/90 hover:text-white block w-full text-center py-2 px-4 font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Ver demo
                  </Link>
                  <Link
                    href="/app/login"
                    className="bg-brand-900 hover:bg-brand-800 text-white w-full text-center block py-2 px-4 rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-translation-key="nav.automate"
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
            <span className="text-sm bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full border border-orange-500/20 hover:bg-orange-500/20 transition-all duration-300 hover:-translate-y-0.5 animate-delay-300">🔥 37 empresas activas</span>
            <span className="text-sm bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5 animate-delay-500">0 errores de cálculo</span>
          </div>

          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
              De 4 horas de planilla
              <span className="block text-brand-400">a 4 minutos</span>
            </h1>

            <p className="text-xl text-brand-200/90 mb-8">
              + Control antifraude en tiempo real. Sin errores, sin pasivo laboral.
              <strong className="text-white"> Actívalo HOY.</strong>
            </p>

            {/* CTA group */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-8">
              <Link
                href="/activar"
                className="px-6 md:px-8 py-3 md:py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-base md:text-lg transition-all duration-300 shadow-lg shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-xl hover:shadow-brand-900/50 animate-pulse-glow"
              >
                Empezar mi prueba gratuita
              </Link>
              <Link
                href="/demo"
                className="px-6 md:px-8 py-3 md:py-4 border border-white/20 bg-white/10 text-white rounded-lg font-semibold text-base md:text-lg hover:bg-white/20 hover:border-brand-400/40 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
              >
                Ver demo en 5 min
              </Link>
              <a
                href="#roi"
                onClick={scrollToSection}
                className="px-6 md:px-8 py-3 md:py-4 text-brand-300 hover:text-white rounded-lg font-semibold text-base md:text-lg hover:bg-white/10 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
              >
                Calcular mi ahorro
              </a>
            </div>

            {/* ROI Calculator mini */}
            <div id="roi" className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 max-w-md mx-auto hover:bg-white/10 transition-all duration-300 hover:border-brand-400/30">
              <h3 className="text-white font-semibold mb-3">Calculá tu ahorro</h3>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  value={roiEmployees}
                  onChange={(e) => setRoiEmployees(Number(e.target.value))}
                  placeholder="# empleados"
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-brand-200/60 w-28 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all duration-200"
                />
                <span className="text-brand-200">×</span>
                <span className="text-brand-400 font-bold">L{ahorroPorEmpleado}/mes</span>
                <span className="text-brand-200">=</span>
                <span className="text-green-400 font-bold text-xl">L{ahorroTotal.toLocaleString('es-HN')}</span>
              </div>
              <p className="text-xs text-brand-200/80 mt-2">Ahorro promedio vs planilla manual</p>
            </div>
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
              { name: 'Carlos Mendoza', company: 'Distribuidora La Ceiba', employees: '23 empleados', saving: 'L12,500/mes', quote: 'Ya no pierdo domingos haciendo planilla. 4 horas ahora son 4 minutos.' },
              { name: 'Ana Rodríguez', company: 'Textiles Honduras', employees: '45 empleados', saving: 'L18,000/mes', quote: 'El control antifraude me devolvió 15% de productividad perdida.' },
              { name: 'Miguel Santos', company: 'Agroexport SAC', employees: '67 empleados', saving: 'L25,500/mes', quote: 'Cero errores en IHSS desde que lo uso. Mi contador está feliz.' }
            ].map((testimonial, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6">
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
                  <span className="text-green-400 font-medium">Ahorra {testimonial.saving}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-white" data-translation-key="pricing.title">
          Planes simples, precios sin letra pequeña
        </h2>
        <div className="text-center max-w-lg mx-auto">
          <Card variant="glass" className="hover:border-brand-500/50 transition-all duration-300">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold text-white mb-4" data-translation-key="pricing.plan.title">
                RH 100% Digital
              </CardTitle>
              <div className="space-y-2">
                <div className="text-5xl font-bold text-brand-400">
                  L420 <span className="text-xl text-brand-200">/empleado/mes</span>
                </div>
                <div className="text-2xl text-brand-300">
                  $17.77 <span className="text-base text-brand-200">USD/empleado/mes</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-left text-brand-200/90 mb-6 space-y-1">
                <li>🔥 Ahorra L15,000/mes vs planilla manual</li>
                <li>💰 Solo L420/empleado (vs L800 costo fraude)</li>
                <li>⚡ ROI del 300% el primer mes</li>
              </ul>
              <p className="text-brand-200 mb-6 leading-relaxed" data-translation-key="pricing.plan.description">
                US$17.77/empleado/mes. Todo incluido, soporte, sin instalación. Cancelá cuando quieras. 30 días gratis.
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

            <DemoFooter />
        </div>
  )
}
