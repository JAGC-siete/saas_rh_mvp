import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import DemoFooter from '../components/DemoFooter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import {
  UserGroupIcon,
  ClockIcon,
  CurrencyDollarIcon,
  Bars3Icon,
  XMarkIcon,
  CheckIcon,
  ArrowRightIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

const services = [
  {
    title: 'Candidatos listos. Sin perder tiempo.',
    subtitle: 'Tu robot reclutador publica, filtra y certifica por vos.',
    description:
      'Encontrá talento real sin leer CV basura. Publica, pre-filtra, verifica y entrega candidatos listos para contratar en tiempo récord: hasta 80% menos tiempo de reclutamiento.',
    features: ['Publicación automática', 'Pre-filtro inteligente', 'Verificación de datos', 'Scoring por competencias', 'Entrega de pool listo'],
    benefits: [
      '🎯 Solo perfiles que cumplen',
      '⏱️ Reclutamiento hasta 80% más rápido',
      '💼 Contrataciones seguras y sin sorpresas'
    ],
    cta: 'Activar reclutador inteligente',
    icon: UserGroupIcon,
  },
  {
    title: 'Asistencia en tiempo real. Sin excusas.',
    subtitle: 'Sistema antifraude que detecta todo.',
    description:
      'Registro con últimos 5 dígitos del DNI y geolocalización. Detecta llegadas tarde, temprano o ausencias al instante. Cero fraude, reportes claros on-demand.',
    features: ['Registro por DNI', 'Detección de tardanzas', 'Control de horas extras', 'Reportes automáticos'],
    benefits: [
      '🔍 Control total en tiempo real',
      '🔒 100% antifraude',
      '📊 Dashboards y reportes en 1 clic'
    ],
    cta: 'Activar control de asistencia',
    icon: ClockIcon,
  },
  {
    title: 'Nómina sin errores. En minutos.',
    subtitle: 'Tu robot de planilla, legal y automático.',
    description:
      'Calcula IHSS, RAP, ISR y vacaciones. Genera vouchers PDF y envíalos por email o WhatsApp. De 4 horas de trabajo a solo 4 minutos.',
    features: ['Cálculo IHSS', 'Cálculo RAP', 'Cálculo ISR', 'Vacaciones', 'Vouchers PDF', 'Envío automático'],
    benefits: [
      '⚡ De horas a minutos',
      '⚖️ Compliance legal total',
      '📱 Vouchers enviados al instante'
    ],
    cta: 'Activar generación de planilla',
    icon: CurrencyDollarIcon,
  },
]

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
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    onClick={scrollToSection}
                  >
                    Certificación
                  </a>
                  <a
                    href="#libro-rojo"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    onClick={scrollToSection}
                  >
                    Asistencia
                  </a>
                  <a
                    href="#planillero"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    onClick={scrollToSection}
                  >
                    Nómina
                  </a>
                  <a
                    href="#pricing"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    onClick={scrollToSection}
                  >
                    Precios
                  </a>
                  <Link
                    href="/demo"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Ver demo
                  </Link>
                  <Link
                    href="/app/login"
                    className="bg-brand-900 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
          <div className="flex flex-wrap justify-center gap-3 md:gap-6 mb-8">
            <span className="text-sm bg-green-500/10 text-green-400 px-3 py-1 rounded-full">✓ Cumple STSS Honduras</span>
            <span className="text-sm bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full">⚡ Setup en 24 horas</span>
            <span className="text-sm bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full">🔥 37 empresas activas</span>
            <span className="text-sm bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full">0 errores de cálculo</span>
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
                className="px-6 md:px-8 py-3 md:py-4 bg-brand-900 hover:bg-brand-800 text-white rounded-lg font-semibold text-base md:text-lg transition-all duration-300 shadow-lg"
              >
                Empezar mi prueba gratuita
              </Link>
              <Link
                href="/demo"
                className="px-6 md:px-8 py-3 md:py-4 border border-white/20 bg-white/10 text-white rounded-lg font-semibold text-base md:text-lg hover:bg-white/20 transition-all"
              >
                Ver demo en 5 min
              </Link>
              <a
                href="#roi"
                onClick={scrollToSection}
                className="px-6 md:px-8 py-3 md:py-4 text-brand-300 hover:text-white rounded-lg font-semibold text-base md:text-lg hover:bg-white/10 transition-all"
              >
                Calcular mi ahorro
              </a>
            </div>

            {/* ROI Calculator mini */}
            <div id="roi" className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 max-w-md mx-auto">
              <h3 className="text-white font-semibold mb-3">Calculá tu ahorro</h3>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  value={roiEmployees}
                  onChange={(e) => setRoiEmployees(Number(e.target.value))}
                  placeholder="# empleados"
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-brand-200/60 w-28"
                />
                <span className="text-brand-200">×</span>
                <span className="text-brand-400 font-bold">L{ahorroPorEmpleado}/mes</span>
                <span className="text-brand-200">=</span>
                <span className="text-green-400 font-bold">L{ahorroTotal.toLocaleString('es-HN')}</span>
              </div>
              <p className="text-xs text-brand-200/80 mt-2">Ahorro promedio vs planilla manual</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white" data-translation-key="services.title">
            Robots de RH de Humano SISU
          </h2>
          <p className="text-xl text-brand-400 font-medium mb-2">Tus nuevos Robots de RH</p>
          <p className="text-brand-200">Adiós al Excel. Hola a la eficiencia.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const sectionIds = ['certificacion', 'libro-rojo', 'planillero']
            return (
              <Card
                key={service.title}
                id={sectionIds[index]}
                variant="glass"
                className="hover:border-brand-500/50 transition-all duration-300"
              >
                <CardHeader className="text-center pb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-500/10 border border-brand-500/20 mb-6 mx-auto">
                    <service.icon className="h-12 w-12 text-brand-400" aria-hidden="true" />
                  </div>
                  <CardTitle
                    className="text-3xl md:text-4xl font-bold text-white mb-4"
                    data-translation-key={`services.service${index + 1}.title`}
                  >
                    {service.title}
                  </CardTitle>
                  <CardDescription
                    className="text-brand-300 font-medium text-xl"
                    data-translation-key={`services.service${index + 1}.subtitle`}
                  >
                    {service.subtitle}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <p
                    className="text-brand-200 leading-relaxed text-lg"
                    data-translation-key={`services.service${index + 1}.description`}
                  >
                    {service.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-white text-lg">Incluye:</h4>
                    <div className="flex flex-wrap gap-2">
                      {service.features.map((feature, featureIndex) => (
                        <span
                          key={featureIndex}
                          className="px-4 py-2 bg-brand-700/20 border border-brand-600/30 rounded-full text-sm text-brand-200"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-white text-lg">Beneficios:</h4>
                    <ul className="space-y-2">
                      {service.benefits.map((benefit, benefitIndex) => (
                        <li key={benefitIndex} className="flex items-center gap-3 text-brand-200">
                          <CheckIcon className="w-5 h-5 text-brand-400 flex-shrink-0" />
                          <span className="text-base">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <Link
                    href="/activar"
                    className="w-full bg-brand-900 hover:bg-brand-800 text-white py-4 px-6 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 text-lg"
                  >
                    {service.cta}
                    <ArrowRightIcon className="w-5 h-5" />
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

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
                <blockquote className="text-brand-200/90 italic mb-4">"{testimonial.quote}"</blockquote>
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
                className="w-full bg-brand-900 hover:bg-brand-800 text-white py-4 px-4 rounded-lg font-bold transition-colors inline-flex items-center justify-center gap-2 text-lg"
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
