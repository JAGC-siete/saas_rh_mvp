import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })
const HeroCarousel = dynamic(() => import('../components/HeroCarousel'), { ssr: false })
import {
  UserGroupIcon,
  ClockIcon,
  CurrencyDollarIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'

const services = [
  {
    title: 'El libro Rojo de Asistencia.',
    subtitle: 'Un control de asistencia que no perdona ni improvisa.',
    description: 'Solo 5 dígitos de DNI. Detecta tarde, temprano, ausente. Reportes en tiempo real.',
    features: ['Registro DNI', 'Detección tardías', 'Horas extras', 'Reportes automáticos'],
    benefits: [
      '🔍 Control en tiempo real',
      '🔒 100% automatizado',
      '📊 Reportes en un clic'
    ],
    cta: 'Activar Control de Asistencia',
    icon: ClockIcon,
  },
  {
    title: 'El Planillero.',
    subtitle: 'Tu robot de nómina 100% legal y automático.',
    description: 'Calcula IHSS, RAP, ISR, genera comprobantes y los envía por correo o WhatsApp. Planilla sin errores.',
    features: ['IHSS', 'RAP', 'ISR', 'Vacaciones', 'Vouchers PDF', 'Envío automático'],
    benefits: [
      '⚡ De 4 horas a 4 minutos',
      '⚖️ Cumplimiento legal total',
      '📧 Vouchers automáticos por email o WhatsApp'
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
    <div className="min-h-screen bg-app relative">
      {/* Shared dynamic background */}
      <CloudBackground />
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
        <div className={`sticky-header ${isScrolled ? 'visible' : ''} sticky top-0 z-40 glass border-b border-white/10 transition-all duration-300`}>
          <nav className="px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center" />
              
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <a
                    href="#libro-rojo"
                    className="text-brand-200/90 hover:text-brand-400 hover:-translate-y-0.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 border-b-2 border-transparent hover:border-brand-400"
                    onClick={scrollToSection}
                  >
                    El Libro Rojo
                  </a>
                  <a
                    href="#planillero"
                    className="text-brand-200/90 hover:text-brand-400 hover:-translate-y-0.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 border-b-2 border-transparent hover:border-brand-400"
                    onClick={scrollToSection}
                  >
                    El Planillero
                  </a>
                  <a
                    href="#pricing"
                    className="text-brand-200/90 hover:text-brand-400 hover:-translate-y-0.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 border-b-2 border-transparent hover:border-brand-400"
                    onClick={scrollToSection}
                  >
                    Precios
                  </a>
                  <Link
                    href="/demo"
                    className="text-brand-200/90 hover:text-brand-400 hover:-translate-y-0.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 border-b-2 border-transparent hover:border-brand-400"
                  >
                    Solicitar Prueba
                  </Link>
                  <Link
                    href="/login"
                    className="bg-brand-900 hover:bg-orange-500 hover:-translate-y-1 hover:shadow-lg text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:focus-ring transform"
                  >
                    Iniciar Sesión
                  </Link>
                </div>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="glass inline-flex items-center justify-center p-2 rounded-md text-brand-200/90 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
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
              <div className="glass-strong px-2 pt-2 pb-3 space-y-1 rounded-lg shadow-lg mt-2">
                <a 
                  href="#libro-rojo" 
                  className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-brand-400 hover:bg-white/5 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}

                >
                  El Libro Rojo
                </a>
                <a 
                  href="#planillero" 
                  className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-brand-400 hover:bg-white/5 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}

                >
                  El Planillero
                </a>
                <a 
                  href="#pricing" 
                  className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-brand-400 hover:bg-white/5 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}

                >
                  Precios
                </a>
                <div className="px-3 py-2 space-y-2">
                  <Link
                    href="/demo"
                    className="text-brand-200/90 hover:text-brand-400 block w-full text-center py-2 px-4 font-medium transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Solicitar Prueba
                  </Link>
                  <Link
                    href="/login"
                    className="bg-brand-900 hover:bg-brand-800 text-white w-full text-center block py-2 px-4 rounded-lg transition-colors focus-visible:outline-none focus-visible:focus-ring"
                    onClick={() => setIsMobileMenuOpen(false)}

                  >
                    Iniciar Sesión
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section with proper padding for fixed header */}
      <section className="landing-section text-center glass-strong pt-20 border-b border-white/10">
        <h1 className="text-4xl font-bold mb-4 text-white">
          Automatiza el 80% del trabajo de RH en 24 horas: asistencia, nómina y vouchers en 1 click
        </h1>
        <p className="mb-8 text-lg max-w-3xl mx-auto text-brand-200/90">
          Actívalo hoy. Sin errores, sin pasivo laboral. Pago por empleado. Sin letras pequeñas
        </p>
        
        {/* Hero Features - 3 bloques horizontales */}
        <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Control antifraude */}
          <div className="flex flex-col items-center text-center p-6 rounded-xl border border-white/10 hover:-translate-y-2 hover:shadow-xl hover:border-brand-400 hover:bg-white/5 transition-all duration-300 transform cursor-pointer">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 group-hover:bg-brand-500/20 transition-all duration-300">
              <ClockIcon className="h-8 w-8 text-brand-400" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white">Control antifraude</h3>
            <p className="text-brand-200/80 text-sm">
              Solo 5 dígitos de DNI. Detecta tarde, temprano, ausente. Cero trucos.
            </p>
          </div>

          {/* De 4h a 4min */}
          <div className="flex flex-col items-center text-center p-6 rounded-xl border border-white/10 hover:-translate-y-2 hover:shadow-xl hover:border-brand-400 hover:bg-white/5 transition-all duration-300 transform cursor-pointer">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 group-hover:bg-brand-500/20 transition-all duration-300">
              <CurrencyDollarIcon className="h-8 w-8 text-brand-400" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white">De 4h a 4min</h3>
            <p className="text-brand-200/80 text-sm">
              Calcula IHSS, RAP, ISR. Genera vouchers y los envía automático.
            </p>
          </div>

          {/* Gestión de empleados */}
          <div className="flex flex-col items-center text-center p-6 rounded-xl border border-white/10 hover:-translate-y-2 hover:shadow-xl hover:border-brand-400 hover:bg-white/5 transition-all duration-300 transform cursor-pointer">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 group-hover:bg-brand-500/20 transition-all duration-300">
              <UserGroupIcon className="h-8 w-8 text-brand-400" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white">Gestión de empleados</h3>
            <p className="text-brand-200/80 text-sm">
              Administra tu personal, horarios y permisos desde un solo lugar.
            </p>
          </div>
        </div>
        
        {/* Hero CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/activar"
            className="bg-brand-900 hover:bg-orange-500 hover:-translate-y-1 hover:shadow-lg text-white px-8 py-3 rounded-lg font-semibold shadow text-base transition-all duration-300 focus-visible:outline-none focus-visible:focus-ring transform"
            aria-label="Quiero automatizar mi RH"

          >
            Quiero automatizar mi RH
          </Link>
          <Link
            href="/demo"
            className="bg-white/10 border border-white/20 text-white px-8 py-3 rounded-lg font-semibold text-base backdrop-blur hover:bg-white/20 hover:-translate-y-1 hover:shadow-lg hover:border-brand-400 transition-all duration-300 focus-visible:outline-none focus-visible:focus-ring transform"
            aria-label="Quiero ver cómo funciona"

          >
            Quiero ver cómo funciona
          </Link>
        </div>
      </section>

      {/* Benefits Carousel Section */}
      <section className="landing-section py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold mb-4 text-white">
            ¿Por qué elegir Humano SISU?
          </h2>
          <p className="text-xl text-brand-400 font-medium mb-2">
            Beneficios que transforman tu gestión de RH
          </p>
        </div>
        <HeroCarousel />
      </section>

      {/* Services Section */}
      <section id="servicios" className="landing-section">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold mb-4 text-white">
            Los Robots de Humano SISU
          </h2>
          <p className="text-xl text-brand-400 font-medium mb-2">
            Tus nuevos asistentes de RRHH
          </p>
          <p className="text-brand-200/75">
            Adiós al Excel. Hola a la eficiencia.
          </p>
        </div>
        <div className="space-y-8">
          {services.map((service, index) => {
            const sectionIds = ['libro-rojo', 'planillero'];
            const isReversed = index % 2 === 1;
            
            return (
              <div
                key={`service-${index}`}
                id={sectionIds[index]}
                className={`glass p-6 hover:glass-strong transition-all duration-300 flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-8`}
              >
                {/* Icon and Title Section - Improved Typography Hierarchy */}
                <div className="flex-shrink-0 text-center lg:text-left lg:w-1/3">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4">
                    <service.icon
                      className="h-10 w-10 text-brand-400"
                      aria-hidden="true"
                    />
                  </div>
                  {/* 1. Título principal (3-4xl, benefit claro) */}
                  <h3 
                    className="text-3xl md:text-4xl font-bold mb-4 text-white leading-tight"
                  >
                    {service.title}
                  </h3>
                  {/* 2. Subtítulo emocional (lg-xl, brand-400) */}
                  <p 
                    className="text-lg md:text-xl text-brand-400 font-medium mb-6"
                  >
                    {service.subtitle}
                  </p>
                </div>

                {/* Content Section - Compact 6-Block Structure */}
                <div className="flex-grow lg:w-2/3">
                  {/* 1. Título y 2. Subtítulo ya están en la sección izquierda */}
                  
                  {/* 3. ¿Qué hace? (funcional y directo) */}
                  <p 
                    className="text-base text-brand-200/90 mb-6 leading-relaxed"
                  >
                    {service.description}
                  </p>

                  {/* 4. Beneficios (máximo 3 bullets con emojis) */}
                  <div className="mb-6">
                    <ul className="space-y-2">
                      {service.benefits.map((benefit, benefitIndex) => (
                        <li 
                          key={`benefit-${benefitIndex}`}
                          className="flex items-start space-x-3"
                        >
                          <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-400 mt-2.5"></div>
                          <span 
                            className="text-sm text-brand-200/90 font-medium"
                          >
                            {benefit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 5. Incluye (tags visuales tipo badges) */}
                  <div className="mb-6">
                    <p className="text-xs text-brand-400 uppercase tracking-wide mb-3 font-semibold">Incluye</p>
                    <div className="flex flex-wrap gap-2">
                      {service.features.map((feature, featureIndex) => (
                        <span 
                          key={`feature-${featureIndex}`}
                          className="text-xs px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 font-medium backdrop-blur-sm"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 6. CTA botón con verbo claro */}
                  <div className="mt-6">
                    <Link
                      href="/activar"
                      className="bg-brand-900 hover:bg-brand-800 text-white px-6 py-3 text-sm rounded-lg inline-flex items-center font-semibold transition-colors focus-visible:outline-none focus-visible:focus-ring"
                    >
                      {service.cta}
                      <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Productivity Banner - Supabase Style */}
      <section className="landing-section py-16">
        <div className="glass-strong p-8 md:p-10">
          {/* Grid Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}></div>
          </div>
          
          <div className="relative text-center max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Mantente productivo y administra tu personal
              <br />
              <span className="text-brand-200/90">sin salir del dashboard</span>
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12 mb-8">
              {/* Feature Pills */}
              <div className="flex items-center space-x-4 text-sm text-brand-200/90">
                <div className="flex items-center space-x-2 bg-brand-500/10 border border-brand-500/20 px-4 py-2 rounded-full">
                  <span className="w-2 h-2 bg-brand-400 rounded-full"></span>
                  <span>Registro de Asistencia</span>
                </div>
                <div className="flex items-center space-x-2 bg-brand-500/10 border border-brand-500/20 px-4 py-2 rounded-full">
                  <span className="w-2 h-2 bg-brand-400 rounded-full"></span>
                  <span>Cálculo de Nómina</span>
                </div>
                <div className="flex items-center space-x-2 bg-brand-500/10 border border-brand-500/20 px-4 py-2 rounded-full">
                  <span className="w-2 h-2 bg-brand-400 rounded-full"></span>
                  <span>Reportes Automáticos</span>
                </div>
              </div>
            </div>
            
            <Link
              href="/activar"
              className="bg-brand-900 hover:bg-brand-800 text-white px-8 py-4 text-lg font-semibold rounded-lg inline-flex items-center transition-colors focus-visible:outline-none focus-visible:focus-ring"
            >
              Comenzar ahora
              <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="landing-section">
        <h2 className="text-3xl font-semibold mb-8 text-center text-white">
          Planes simples, precios sin letra pequeña
        </h2>
        <div className="text-center max-w-2xl mx-auto">
          <div className="glass-strong p-8 hover:glass transition-all duration-300">
            <h3 className="text-2xl font-bold text-white mb-4">
              Todo incluido
            </h3>
            <div className="text-4xl font-bold text-brand-400 mb-4">
              L300 <span className="text-lg text-brand-200/75">/empleado/mes</span>
            </div>
            <div className="text-2xl text-brand-300 mb-4">
              $12.50 <span className="text-sm text-brand-200/75">USD/empleado/mes</span>
            </div>
            <p className="text-brand-200/90 mb-6">
              Sin configuración inicial. Sin límites de uso. Soporte incluido.
            </p>
            <Link
              href="/demo"
              className="bg-brand-900 hover:bg-brand-800 text-white w-full py-3 text-center block rounded-lg transition-colors focus-visible:outline-none focus-visible:focus-ring"
            >
              Solicitar Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
