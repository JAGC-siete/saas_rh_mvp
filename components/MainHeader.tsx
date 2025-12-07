import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface MainHeaderProps {
  /** Si es true, el header tendrá efecto de scroll (transparente -> sólido) */
  enableScrollEffect?: boolean
  /** Si es true, el header será fixed. Por defecto true */
  fixed?: boolean
}

export default function MainHeader({ enableScrollEffect = false, fixed = true }: MainHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (enableScrollEffect) {
      const handleScroll = () => {
        const scrollTop = window.scrollY
        setIsScrolled(scrollTop > 50)
      }
      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    }
  }, [enableScrollEffect])

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const href = e.currentTarget.getAttribute('href')
    if (href && href.startsWith('#')) {
      const element = document.querySelector(href)
      if (element) element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMobileMenuOpen(false)
  }

  const headerClasses = fixed ? 'fixed top-0 left-0 right-0 z-50' : 'relative z-50'
  const backgroundClasses = enableScrollEffect
    ? isScrolled
      ? 'bg-slate-900/90 backdrop-blur-sm border-b border-white/20 shadow-lg'
      : 'bg-transparent border-b border-white/10'
    : 'bg-slate-900/90 backdrop-blur-sm border-b border-white/20 shadow-lg'

  return (
    <header className={headerClasses}>
      {/* Dark golden-brown strip at the top */}
      <div className="h-1 bg-amber-900/80 w-full"></div>

      {/* Main Header with Glass Effect */}
      <div className={`w-full transition-all duration-300 ${backgroundClasses}`}>
        <nav className="px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* Logo SISU */}
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <div className="bg-white/10 px-6 py-4 rounded-lg border border-white/20 backdrop-blur-sm">
                  <Image
                    src="/logo-humano-sisu.png"
                    alt="Humano SISU Logo"
                    width={128}
                    height={128}
                    className="rounded-lg"
                  />
                </div>
              </div>
            </Link>

            {/* Navigation Links - Desktop */}
            <div className="hidden md:flex ml-auto">
              <div className="ml-6 flex items-center space-x-4">
                <a
                  href="#como-funciona"
                  className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
                  onClick={scrollToSection}
                >
                  Cómo funciona
                </a>
                <a
                  href="#servicios"
                  className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
                  onClick={scrollToSection}
                >
                  Servicios
                </a>
                <Link
                  href="/afiliados"
                  className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
                >
                  Programa de Afiliados
                </Link>
                <button
                  onClick={() => {
                    window.location.href = '/activar'
                    setIsMobileMenuOpen(false)
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap min-w-[160px] text-center"
                >
                  Activar demostración gratuita
                </button>
                <Link
                  href="/app/login"
                  className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap min-w-[140px] text-center"
                >
                  Iniciar sesión
                </Link>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden ml-auto">
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
                href="#como-funciona"
                className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                onClick={scrollToSection}
              >
                Cómo funciona
              </a>
              <a
                href="#servicios"
                className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                onClick={scrollToSection}
              >
                Servicios
              </a>
              <Link
                href="/afiliados"
                className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Programa de Afiliados
              </Link>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  window.location.href = '/activar'
                }}
                className="bg-green-600 hover:bg-green-700 text-white w-full text-center block py-2 px-4 rounded-lg transition-colors mb-2"
              >
                Activar demostración gratuita
              </button>
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
  )
}

