import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })
const HeroCarousel = dynamic(() => import('../components/HeroCarousel'), { ssr: false })
import LanguageToggle from '../components/LanguageToggle'
import { useLanguage } from '../lib/hooks/useLanguage'
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
      '⚖️ Cumplimiento legal total',
      '📧 Vouchers automáticos por email o WhatsApp'
    ],
    cta: 'Activar generación de planilla',
    icon: CurrencyDollarIcon,
  },
]

export default function LandingPage() {
  const { t } = useLanguage()
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
        <div className={`sticky-header ${isScrolled ? 'visible' : ''} sticky top-0 z-40 transition-all duration-300 ${
          isScrolled 
            ? 'bg-slate-900/90 backdrop-blur-sm border-b border-white/20 shadow-lg' 
            : 'bg-transparent border-b border-white/10'
        }`}>
          <nav className="px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-white">
                  <span className="text-white">Humano SISU</span>{' '}
                  <span className="text-brand-300">presenta Los Robots de RRHH</span>
                </h1>
              </div>
              
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
                  <LanguageToggle />
                  <Link
                    href="/activar"
                    className="text-brand-200/90 hover:text-brand-400 hover:-translate-y-0.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 border-b-2 border-transparent hover:border-brand-400"
                  >
                    {t('landing.hero.cta')}
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
                    href="/activar"
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

      {/* Hero Carousel Section - IMPACTO MÁXIMO */}
      <section className="pt-24">
        <HeroCarousel />
      </section>

      {/* Hero Section - Título principal y CTA */}
      <section className="landing-section text-center glass-strong pt-16 border-b border-white/10">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white leading-tight">
          {t('landing.hero.title')}
        </h1>
        <p className="mb-8 text-xl max-w-4xl mx-auto text-brand-200/90 leading-relaxed">
          {t('landing.hero.subtitle')}
        </p>
        
        {/* Hero CTA Buttons - Más prominentes */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
          <Link
            href="/activar"
            className="bg-brand-900 hover:bg-orange-500 hover:-translate-y-1 hover:shadow-xl text-white px-10 py-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-300 focus-visible:outline-none focus-visible:focus-ring transform"
            aria-label="Quiero automatizar mi RH"
          >
            🚀 {t('landing.hero.cta')}
          </Link>
          <Link
            href="/activar"
            className="bg-white/10 border-2 border-white/20 text-white px-10 py-4 rounded-xl font-bold text-lg backdrop-blur hover:bg-white/20 hover:-translate-y-1 hover:shadow-xl hover:border-brand-400 transition-all duration-300 focus-visible:outline-none focus-visible:focus-ring transform"
            aria-label="Quiero ver cómo funciona"
          >
            🎯 {t('landing.hero.ctaDemo')}
          </Link>
        </div>
        
        {/* Hero Features - 3 bloques horizontales mejorados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Control antifraude */}
          <div className="flex flex-col items-center text-center p-8 rounded-2xl border border-white/10 hover:-translate-y-3 hover:shadow-2xl hover:border-brand-400 hover:bg-white/5 transition-all duration-500 transform cursor-pointer group">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-500/20 border-2 border-brand-500/30 mb-6 group-hover:bg-brand-500/30 group-hover:scale-110 transition-all duration-300">
              <ClockIcon className="h-10 w-10 text-brand-400" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-white">Control antifraude</h3>
            <p className="text-brand-200/90 text-base leading-relaxed">
              Solo 5 dígitos de DNI. Detecta tarde, temprano, ausente. 
              <span className="text-brand-300 font-medium">Cero trucos, 100% confiable.</span>
            </p>
          </div>

          {/* De 4h a 4min */}
          <div className="flex flex-col items-center text-center p-8 rounded-2xl border border-white/10 hover:-translate-y-3 hover:shadow-2xl hover:border-brand-400 hover:bg-white/5 transition-all duration-500 transform cursor-pointer group">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-500/20 border-2 border-brand-500/30 mb-6 group-hover:bg-brand-500/30 group-hover:scale-110 transition-all duration-300">
              <CurrencyDollarIcon className="h-10 w-10 text-brand-400" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-white">De 4h a 4min</h3>
            <p className="text-brand-200/90 text-base leading-relaxed">
              Calcula IHSS, RAP, ISR automáticamente. 
              <span className="text-brand-300 font-medium">Genera vouchers y los envía solo.</span>
            </p>
          </div>

          {/* Gestión de empleados */}
          <div className="flex flex-col items-center text-center p-8 rounded-2xl border border-white/10 hover:-translate-y-3 hover:shadow-2xl hover:border-brand-400 hover:bg-white/5 transition-all duration-500 transform cursor-pointer group">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-500/20 border-2 border-brand-500/30 mb-6 group-hover:bg-brand-500/30 group-hover:scale-110 transition-all duration-300">
              <UserGroupIcon className="h-10 w-10 text-brand-400" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-white">Gestión completa</h3>
            <p className="text-brand-200/90 text-base leading-relaxed">
              Administra personal, horarios y permisos. 
              <span className="text-brand-300 font-medium">Todo desde un solo lugar.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Services Section - Los Robots de SISU */}
      <section id="servicios" className="landing-section">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Los <span className="text-brand-400">Robots</span> de Humano SISU
          </h2>
          <p className="text-xl text-brand-300 font-medium mb-4">
            Tus nuevos asistentes de RRHH que nunca se cansan
          </p>
          <p className="text-lg text-brand-200/75 max-w-3xl mx-auto">
            Adiós al Excel manual. Hola a la eficiencia automatizada con inteligencia artificial.
          </p>
        </div>
        
        <div className="space-y-12">
          {services.map((service, index) => {
            const sectionIds = ['libro-rojo', 'planillero'];
            const isReversed = index % 2 === 1;
            
            return (
              <div
                key={`service-${index}`}
                id={sectionIds[index]}
                className={`glass p-8 md:p-12 hover:glass-strong transition-all duration-500 flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 rounded-3xl`}
              >
                {/* Icon and Title Section - Mejorada */}
                <div className="flex-shrink-0 text-center lg:text-left lg:w-2/5">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-brand-500/20 border-2 border-brand-500/30 mb-6">
                    <service.icon
                      className="h-12 w-12 text-brand-400"
                      aria-hidden="true"
                    />
                  </div>
                  
                  {/* Título principal más impactante */}
                  <h3 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
                    {service.title}
                  </h3>
                  
                  {/* Subtítulo emocional */}
                  <p className="text-xl md:text-2xl text-brand-400 font-semibold mb-8 leading-relaxed">
                    {service.subtitle}
                  </p>
                </div>

                {/* Content Section - Estructura mejorada */}
                <div className="flex-grow lg:w-3/5">
                  {/* Descripción funcional */}
                  <p className="text-lg text-brand-200/90 mb-8 leading-relaxed">
                    {service.description}
                  </p>
                  
                  {/* Características técnicas */}
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-white mb-4">✨ Características incluidas:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {service.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-brand-400 rounded-full"></div>
                          <span className="text-brand-200/90">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Beneficios clave */}
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-white mb-4">🚀 Beneficios principales:</h4>
                    <div className="space-y-3">
                      {service.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-start space-x-3">
                          <span className="text-2xl">{benefit.split(' ')[0]}</span>
                          <span className="text-brand-200/90">{benefit.split(' ').slice(1).join(' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* CTA mejorado */}
                  <div className="text-center lg:text-left">
                    <Link
                      href="/activar"
                      className="bg-brand-900 hover:bg-brand-800 text-white px-8 py-4 text-lg rounded-xl inline-flex items-center font-bold transition-all duration-300 focus-visible:outline-none focus-visible:focus-ring hover:-translate-y-1 hover:shadow-xl"
                    >
                      {service.cta}
                      <svg className="ml-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Productivity Banner - Diseño mejorado */}
      <section className="landing-section py-20">
        <div className="glass-strong p-10 md:p-16 rounded-3xl relative overflow-hidden">
          {/* Grid Background Pattern mejorado */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.2) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59, 130, 246, 0.2) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px'
            }}></div>
          </div>
          
          <div className="relative text-center max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 leading-tight">
              Mantente productivo y administra tu personal
              <br />
              <span className="text-brand-300 font-bold">sin salir del dashboard</span>
            </h2>
            
            <p className="text-xl text-brand-200/90 mb-12 max-w-3xl mx-auto leading-relaxed">
              Todo lo que necesitas en un solo lugar: asistencia, nómina, reportes y más. 
              <span className="text-brand-300 font-medium">Interfaz intuitiva que se adapta a tu flujo de trabajo.</span>
            </p>
            
            {/* Feature Pills mejoradas */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="flex items-center space-x-3 bg-brand-500/20 border-2 border-brand-500/30 px-6 py-3 rounded-full hover:bg-brand-500/30 transition-all duration-300">
                <span className="w-3 h-3 bg-brand-400 rounded-full"></span>
                <span className="text-white font-semibold">Registro de Asistencia</span>
              </div>
              <div className="flex items-center space-x-3 bg-brand-500/20 border-2 border-brand-500/30 px-6 py-3 rounded-full hover:bg-brand-500/30 transition-all duration-300">
                <span className="w-3 h-3 bg-brand-400 rounded-full"></span>
                <span className="text-white font-semibold">Cálculo de Nómina</span>
              </div>
              <div className="flex items-center space-x-3 bg-brand-500/20 border-2 border-brand-500/30 px-6 py-3 rounded-full hover:bg-brand-500/30 transition-all duration-300">
                <span className="w-3 h-3 bg-brand-400 rounded-full"></span>
                <span className="text-white font-semibold">Reportes Automáticos</span>
              </div>
              <div className="flex items-center space-x-3 bg-brand-500/20 border-2 border-brand-500/30 px-6 py-3 rounded-full hover:bg-brand-500/30 transition-all duration-300">
                <span className="w-3 h-3 bg-brand-400 rounded-full"></span>
                <span className="text-white font-semibold">Gestión de Empleados</span>
              </div>
            </div>
            
            {/* CTA principal */}
            <Link
              href="/activar"
              className="bg-brand-900 hover:bg-orange-500 hover:-translate-y-2 hover:shadow-2xl text-white px-12 py-5 text-xl font-bold rounded-2xl inline-flex items-center transition-all duration-500 focus-visible:outline-none focus-visible:focus-ring transform"
            >
              🚀 Comenzar ahora
              <svg className="ml-3 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section - Diseño mejorado */}
      <section id="pricing" className="landing-section">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Planes simples, <span className="text-brand-400">precios transparentes</span>
          </h2>
          <p className="text-xl text-brand-200/90 max-w-3xl mx-auto">
            Sin sorpresas, sin costos ocultos, sin letra pequeña. 
            <span className="text-brand-300 font-medium"> Solo pagas por lo que usas.</span>
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="glass-strong p-10 md:p-12 hover:glass transition-all duration-500 rounded-3xl border-2 border-brand-500/20 hover:border-brand-500/40">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-white mb-4">
                🎯 Todo incluido
              </h3>
              <p className="text-lg text-brand-200/90 mb-6">
                Acceso completo a todas las funcionalidades sin restricciones
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 items-center mb-8">
              {/* Precio en Lempiras */}
              <div className="text-center p-6 rounded-2xl bg-brand-500/10 border border-brand-500/20">
                <div className="text-5xl font-bold text-brand-400 mb-2">
                  L300
                </div>
                <div className="text-lg text-brand-200/90">
                  por empleado/mes
                </div>
                <div className="text-sm text-brand-300 mt-2">
                  Precio en Lempiras
                </div>
              </div>
              
              {/* Precio en USD */}
              <div className="text-center p-6 rounded-2xl bg-brand-500/10 border border-brand-500/20">
                <div className="text-5xl font-bold text-brand-400 mb-2">
                  $12.50
                </div>
                <div className="text-lg text-brand-200/90">
                  por empleado/mes
                </div>
                <div className="text-sm text-brand-300 mt-2">
                  Precio en USD
                </div>
              </div>
            </div>
            
            {/* Características del plan */}
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-4 text-center">✨ Lo que incluye:</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <span className="text-brand-200/90">Sin configuración inicial</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <span className="text-brand-200/90">Sin límites de uso</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <span className="text-brand-200/90">Soporte técnico incluido</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <span className="text-brand-200/90">Actualizaciones automáticas</span>
                </div>
              </div>
            </div>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/activar"
                className="bg-brand-900 hover:bg-orange-500 hover:-translate-y-1 hover:shadow-xl text-white px-8 py-4 text-lg font-bold rounded-xl transition-all duration-300 focus-visible:outline-none focus-visible:focus-ring transform flex-1 text-center"
              >
                🚀 Activar ahora
              </Link>
              <Link
                href="/activar"
                className="bg-white/10 border-2 border-white/20 text-white px-8 py-4 text-lg font-bold rounded-xl backdrop-blur hover:bg-white/20 hover:border-brand-400 transition-all duration-300 focus-visible:outline-none focus-visible:focus-ring flex-1 text-center"
              >
                🎯 Solicitar Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-slate-400 mb-4">
              {t('landing.footer.protection')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-sm">
              <Link 
                href="/politicadeprivacidad" 
                className="text-brand-300 hover:text-brand-400 transition-colors underline decoration-brand-400/30 hover:decoration-brand-400"
              >
                {t('landing.footer.privacy')}
              </Link>
              <span className="text-slate-500">•</span>
              <span className="text-slate-500">{t('landing.footer.copyright')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
