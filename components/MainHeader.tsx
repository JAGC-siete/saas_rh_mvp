import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [isCalculatorMenuOpen, setIsCalculatorMenuOpen] = useState(false)
  const [isCalculatorMobileOpen, setIsCalculatorMobileOpen] = useState(false)
  const calculatorMenuRef = useRef<HTMLDivElement | null>(null)

  const calculatorMenuId = useMemo(
    () => `calculator-menu-${Math.random().toString(36).slice(2)}`,
    []
  )

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCalculatorMenuOpen(false)
        setIsCalculatorMobileOpen(false)
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!isCalculatorMenuOpen) return
      const target = e.target as Node | null
      if (target && calculatorMenuRef.current && !calculatorMenuRef.current.contains(target)) {
        setIsCalculatorMenuOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [isCalculatorMenuOpen])

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
      {/* Main Header with Glass Effect */}
      <div className={`w-full transition-all duration-300 ${backgroundClasses}`}>
          <nav className="px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="flex items-center h-14 sm:h-16">
            {/* Logo SISU */}
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <div className="bg-white/10 px-2 py-1 rounded-lg border border-white/20 backdrop-blur-sm transition-all">
                  <Image
                    src="/logo-humano-sisu.png"
                    alt="Humano SISU Logo"
                    width={40}
                    height={40}
                    className="rounded-lg w-10 h-10"
                  />
                </div>
              </div>
            </Link>

            {/* Navigation Links - Desktop */}
            <div className="hidden md:flex ml-auto">
              <div className="ml-6 flex items-center space-x-4">
                <Link
                  href="/#como-funciona"
                  className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
                >
                  Cómo funciona
                </Link>
                <Link
                  href="/#servicios"
                  className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
                >
                  Servicios
                </Link>
                <Link
                  href="/suscripcion"
                  className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
                >
                  Suscríbete
                </Link>
                <Link
                  href="/afiliados"
                  className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
                >
                  Programa de Afiliados
                </Link>
                <div className="relative" ref={calculatorMenuRef}>
                  <button
                    type="button"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap inline-flex items-center gap-2"
                    aria-haspopup="menu"
                    aria-expanded={isCalculatorMenuOpen}
                    aria-controls={calculatorMenuId}
                    onClick={() => setIsCalculatorMenuOpen((v) => !v)}
                  >
                    Calculadora
                    <svg
                      className={`h-4 w-4 transition-transform ${isCalculatorMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isCalculatorMenuOpen && (
                    <div
                      id={calculatorMenuId}
                      role="menu"
                      className="absolute right-0 mt-2 w-[340px] glass-strong bg-slate-950/80 rounded-xl shadow-2xl border border-white/15 backdrop-blur-xl overflow-hidden ring-1 ring-white/10"
                    >
                      <Link
                        href="/calculadora"
                        role="menuitem"
                        className="block px-4 py-3 text-sm text-brand-100 hover:bg-white/10 transition-colors"
                        onClick={() => setIsCalculatorMenuOpen(false)}
                      >
                        <div className="font-semibold text-white">Ver calculadoras</div>
                        <div className="text-xs text-brand-200/80 mt-0.5">Elige entre deducciones o prestaciones</div>
                      </Link>
                      <div className="h-px bg-white/10" />
                      <Link
                        href="/calculadora-deducciones"
                        role="menuitem"
                        className="block px-4 py-3 text-sm text-brand-100 hover:bg-white/10 transition-colors"
                        onClick={() => setIsCalculatorMenuOpen(false)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-400/25">
                            <svg className="h-4 w-4 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c1.657 0 3-1.343 3-3S13.657 2 12 2 9 3.343 9 5s1.343 3 3 3zm0 0v14m-4-4h8" />
                            </svg>
                          </span>
                          <div>
                            <div className="font-semibold text-white">Deducciones del salario</div>
                            <div className="text-xs text-brand-200/80 mt-0.5">ISR · IHSS · RAP</div>
                          </div>
                        </div>
                      </Link>
                      <Link
                        href="/calculadora-prestaciones"
                        role="menuitem"
                        className="block px-4 py-3 text-sm text-brand-100 hover:bg-white/10 transition-colors"
                        onClick={() => setIsCalculatorMenuOpen(false)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/15 border border-green-400/25">
                            <svg className="h-4 w-4 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m-7 6h8a2 2 0 002-2V6a2 2 0 00-2-2H10l-2 2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </span>
                          <div>
                            <div className="font-semibold text-white">Prestaciones laborales</div>
                            <div className="text-xs text-brand-200/80 mt-0.5">Cesantía · Preaviso · Vacaciones · 13vo · 14vo</div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    window.location.href = '/activar'
                    setIsMobileMenuOpen(false)
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap min-w-[160px] text-center"
                >
                  Activación inmediata
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
              <Link
                href="/#como-funciona"
                className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Cómo funciona
              </Link>
              <Link
                href="/#servicios"
                className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Servicios
              </Link>
              <Link
                href="/suscripcion"
                className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Suscríbete
              </Link>
              <Link
                href="/afiliados"
                className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Programa de Afiliados
              </Link>
              <Link
                href="/calculadora"
                className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Calculadora
              </Link>
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                aria-expanded={isCalculatorMobileOpen}
                onClick={() => setIsCalculatorMobileOpen((v) => !v)}
              >
                <span>Elige una calculadora</span>
                <svg
                  className={`h-5 w-5 transition-transform ${isCalculatorMobileOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isCalculatorMobileOpen && (
                <div className="pl-3 pr-2 pb-2 space-y-1">
                  <Link
                    href="/calculadora-deducciones"
                    className="block px-3 py-2 text-sm font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                    onClick={() => {
                      setIsCalculatorMobileOpen(false)
                      setIsMobileMenuOpen(false)
                    }}
                  >
                    Deducciones del salario (ISR / IHSS / RAP)
                  </Link>
                  <Link
                    href="/calculadora-prestaciones"
                    className="block px-3 py-2 text-sm font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                    onClick={() => {
                      setIsCalculatorMobileOpen(false)
                      setIsMobileMenuOpen(false)
                    }}
                  >
                    Prestaciones laborales (cesantía, preaviso, vacaciones…)
                  </Link>
                </div>
              )}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  window.location.href = '/activar'
                }}
                className="bg-green-600 hover:bg-green-700 text-white w-full text-center block py-2 px-4 rounded-lg transition-colors mb-2"
              >
                Activación inmediata
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

