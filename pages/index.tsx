import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
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
    title: 'Talento real. No más CV basura.',
    subtitle: 'Tu robot reclutador filtra y certifica por vos.',
    description: 'Publicamos, filtramos, verificamos y entregamos un pool listo para contratar. Pagás solo si contratás.',
    features: ['Publicación', 'Pre-filtro', 'Verificación', 'Scoring', 'Entrega de pool'],
    benefits: [
      '🎯 Talento real, cero hojas inútiles',
      '⏱️ 80% menos tiempo reclutando',
      '💼 Contratación sin riesgo'
    ],
    cta: 'Activar reclutador inteligente',
    icon: UserGroupIcon,
  },
  {
    title: 'Control de asistencia. Cero excusas.',
    subtitle: 'Tu sistema antifraude que no perdona ni improvisa.',
    description: 'Solo 5 dígitos de DNI. Detecta tarde, temprano, ausente. Reportes en tiempo real.',
    features: ['Registro DNI', 'Detección tardías', 'Horas extras', 'Reportes automáticos'],
    benefits: [
      '🔍 Control en tiempo real',
      '🔒 100% antifraude',
      '📊 Reportes en un clic'
    ],
    cta: 'Activar control de asistencia',
    icon: ClockIcon,
  },
  {
    title: 'Planillas sin errores. Cero estrés.',
    subtitle: 'Tu robot de nómina 100% legal y automático.',
    description: 'Calcula IHSS, RAP, ISR, genera comprobantes y los envía por correo o WhatsApp. Pagás sin errores. Dormís tranquilo.',
    features: ['IHSS', 'RAP', 'ISR', 'Vacaciones', 'Vouchers PDF', 'Envío automático'],
    benefits: [
      '⚡ De 4 horas a 4 minutos',
      '�️ Cumplimiento legal total',
      '� Vouchers automáticos por email o WhatsApp'
    ],
    cta: 'Activar generación de planilla',
    icon: CurrencyDollarIcon,
  },
]

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
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <div className="min-h-screen bg-app">
      <Head>
        <title>Humano SISU - Automatiza tu RH</title>
        <meta
          name="description"
          content="Asistencia, planilla y reportes listos para firmar. 100% legal y automático."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </Head>

      {/* Header */}
      <header className="relative z-50">
        {/* Sticky Header */}
        <div className={`sticky-header ${isScrolled ? 'visible' : ''} sticky top-0 z-40 transition-all duration-500 ${
          isScrolled 
            ? 'glass-strong' 
            : 'bg-transparent backdrop-blur-sm border-b border-transparent'
        }`}>
          <nav className="px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <span className="text-2xl font-bold text-white">HUMANO <span className="text-brand-400">SISU</span> <span className="text-brand-300 text-lg">- La Agencia de Empleo Privada</span></span>
              </div>
              
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <a
                    href="#certificacion"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    onClick={scrollToSection}
                  >
                    La Universidad del Trabajo
                  </a>
                  <a
                    href="#libro-rojo"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    onClick={scrollToSection}
                  >
                    El Libro Rojo
                  </a>
                  <a
                    href="#planillero"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    onClick={scrollToSection}
                  >
                    El Planillero
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
                    Solicitar Prueba
                  </Link>
                  <Link
                    href="/app/login"
                    className="bg-brand-900 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Iniciar Sesión
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
                    <XMarkIcon className="block h-6 w-6" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" />
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
                  href="#certificacion" 
                  className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-translation-key="nav.certification"
                >
                  La Universidad del Trabajo
                </a>
                <a 
                  href="#libro-rojo" 
                  className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-translation-key="nav.attendance"
                >
                  El Libro Rojo
                </a>
                <a 
                  href="#planillero" 
                  className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-translation-key="nav.payroll"
                >
                  El Planillero
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
                    Solicitar Prueba
                  </Link>
                  <Link
                    href="/app/login"
                    className="bg-brand-900 hover:bg-brand-800 text-white w-full text-center block py-2 px-4 rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-translation-key="nav.automate"
                  >
                    Iniciar Sesión
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Hero - Productivity Focus */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
              Mantente productivo y administra tu personal sin salir del dashboard
            </h1>
            <p className="text-2xl text-brand-200/90 mb-16 max-w-4xl mx-auto font-medium">
              Accede a todas las funciones de gestión humana desde una interfaz intuitiva y moderna
            </p>
            
            {/* Horizontal Layout with Large Text */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-16 mb-16 max-w-6xl mx-auto">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-brand-900 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <ClockIcon className="w-10 h-10 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">Control de Asistencia</h3>
                  <p className="text-xl text-brand-200/90 font-medium">
                    Registro automático con geolocalización
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-brand-900 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <CurrencyDollarIcon className="w-10 h-10 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">Gestión de Nóminas</h3>
                  <p className="text-xl text-brand-200/90 font-medium">
                    Cálculos automáticos y recibos digitales
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-brand-900 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <ChartBarIcon className="w-10 h-10 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">Reportes Avanzados</h3>
                  <p className="text-xl text-brand-200/90 font-medium">
                    Analytics para optimizar tu gestión
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Link 
                href="/activar" 
                className="px-12 py-5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg font-bold text-2xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Quiero Automatizar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white" data-translation-key="services.title">
            Los Robots de Humano SISU
          </h2>
          <p className="text-xl text-brand-400 font-medium mb-2">
            Tus nuevos asistentes de RRHH
          </p>
          <p className="text-brand-200">
            Adiós al Excel. Hola a la eficiencia.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const sectionIds = ['certificacion', 'libro-rojo', 'planillero'];
            
            return (
              <Card
                key={service.title}
                id={sectionIds[index]}
                variant="glass"
                className="hover:border-brand-500/50 transition-all duration-300"
              >
                <CardHeader className="text-center pb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-500/10 border border-brand-500/20 mb-6 mx-auto">
                    <service.icon
                      className="h-12 w-12 text-brand-400"
                      aria-hidden="true"
                    />
                  </div>
                  <CardTitle className="text-3xl md:text-4xl font-bold text-white mb-4" data-translation-key={`services.service${index + 1}.title`}>
                    {service.title}
                  </CardTitle>
                  <CardDescription className="text-brand-300 font-medium text-xl" data-translation-key={`services.service${index + 1}.subtitle`}>
                    {service.subtitle}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <p className="text-brand-200 leading-relaxed text-lg" data-translation-key={`services.service${index + 1}.description`}>
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
            );
          })}
        </div>
      </section>

      {/* Secondary Hero Section - Brand Focus */}
      <section className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl">
            <CurrencyDollarIcon className="h-10 w-10 text-brand-900" />
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-tight" data-translation-key="hero.title">
            Hacer planilla ya no duele
          </h2>
          <p className="mb-8 text-xl md:text-2xl max-w-3xl mx-auto text-brand-200/90 leading-relaxed font-medium" data-translation-key="hero.subtitle">
            Tu robot de RH hace todo: marca entradas, calcula planilla y envía comprobantes.<br />
            Vos solo aprobás con un clic.
          </p>
          
          {/* Hero CTA Buttons */}
          <div className="flex justify-center">
            <Link
              href="/activar"
              className="bg-brand-900 hover:bg-brand-800 text-white px-12 py-5 rounded-lg font-bold shadow-2xl transition-all duration-300 text-2xl inline-flex items-center gap-3 transform hover:-translate-y-1"
              aria-label="Quiero Automatizar"
              data-translation-key="hero.cta_primary"
            >
              Quiero Automatizar
              <ArrowRightIcon className="w-6 h-6" />
            </Link>
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
                Todo incluido
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
              <p className="text-brand-200 mb-6 leading-relaxed" data-translation-key="pricing.plan.description">
                Sin configuración inicial. Sin límites de uso. Soporte incluido.
              </p>
              <Link
                href="/activar"
                className="w-full bg-brand-900 hover:bg-brand-800 text-white py-4 px-4 rounded-lg font-bold transition-colors inline-flex items-center justify-center gap-2 text-lg"
              >
                Quiero Automatizar
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
