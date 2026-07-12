import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { LANDING_NAV_LINKS, CALCULATOR_MENU_ITEMS, CALCULATOR_MOBILE_LINKS } from '../../lib/landing/nav-links'
import { useScrollThreshold, useScrollY } from '../../lib/hooks/useScrollThreshold'

interface DockNavbarProps {
  loginAlwaysVisible?: boolean
  /** Extra top offset in px when a fixed banner sits above the dock (e.g. home announcement). */
  topOffsetPx?: number
}

export default function DockNavbar({
  loginAlwaysVisible = false,
  topOffsetPx = 0,
}: DockNavbarProps) {
  const isScrolled = useScrollY(50)
  const showLoginOnScroll = useScrollThreshold(0.2)
  const showLogin = loginAlwaysVisible || showLoginOnScroll
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCalculatorMenuOpen, setIsCalculatorMenuOpen] = useState(false)
  const [isCalculatorMobileOpen, setIsCalculatorMobileOpen] = useState(false)
  const calculatorMenuRef = useRef<HTMLDivElement | null>(null)

  const calculatorMenuId = useMemo(
    () => `calculator-menu-${Math.random().toString(36).slice(2)}`,
    []
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCalculatorMenuOpen(false)
        setIsCalculatorMobileOpen(false)
        setIsMobileMenuOpen(false)
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

  const topStyle = { top: `${16 + topOffsetPx}px` }

  return (
    <header
      className="fixed left-0 right-0 z-50 px-4 pointer-events-none"
      style={topStyle}
    >
      <motion.nav
        layout
        className={`pointer-events-auto mx-auto glass-modern rounded-full border border-white/10 transition-all duration-300 ${
          isScrolled ? 'max-w-3xl backdrop-blur-md py-1.5 px-3' : 'max-w-5xl py-2 px-4'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 h-11 sm:h-12">
          <Link prefetch={false} href="/" className="shrink-0">
            <Image
              src="/brand/logo-humano-sisu-sm.png"
              alt="Humano SISU"
              width={64}
              height={36}
              priority
              className="rounded-md h-8 w-auto"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {LANDING_NAV_LINKS.map((link) => (
              <Link
                prefetch={false}
                key={link.href}
                href={link.href}
                className="text-slate-400 hover:text-white px-2.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
            <div className="relative" ref={calculatorMenuRef}>
              <button
                type="button"
                className="text-slate-400 hover:text-white px-2.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors inline-flex items-center gap-1"
                aria-haspopup="menu"
                aria-expanded={isCalculatorMenuOpen}
                aria-controls={calculatorMenuId}
                onClick={() => setIsCalculatorMenuOpen((v) => !v)}
              >
                Calculadora
                <svg
                  className={`h-3.5 w-3.5 transition-transform ${isCalculatorMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <AnimatePresence>
                {isCalculatorMenuOpen && (
                  <motion.div
                    id={calculatorMenuId}
                    role="menu"
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-1/2 -translate-x-1/2 mt-2 w-[320px] glass-modern rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
                  >
                    {CALCULATOR_MENU_ITEMS.map((item, i) => (
                      <div key={item.href}>
                        {i === 1 && <div className="h-px bg-white/10" />}
                        <Link prefetch={false}
                          href={item.href}
                          role="menuitem"
                          className="block px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                          onClick={() => setIsCalculatorMenuOpen(false)}
                        >
                          <div className="font-medium text-white text-sm">{item.title}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{item.subtitle}</div>
                        </Link>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 ml-auto shrink-0">
            <button
              type="button"
              onClick={() => { window.location.href = '/activar' }}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors shadow-[0_0_20px_rgba(34,197,94,0.25)] min-h-[36px]"
            >
              Activar
            </button>
            <AnimatePresence>
              {showLogin && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link prefetch={false}
                    href="/app/login"
                    className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap block min-h-[36px] leading-[36px]"
                  >
                    Iniciar sesión
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            className="md:hidden ml-auto p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {isMobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="pointer-events-auto md:hidden mt-2 mx-auto max-w-sm glass-modern rounded-2xl p-3 border border-white/10"
          >
            {LANDING_NAV_LINKS.map((link) => (
              <Link prefetch={false}
                key={link.href}
                href={link.href}
                className="block px-3 py-2.5 text-sm text-slate-400 hover:text-white rounded-xl transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link prefetch={false}
              href="/calculadora"
              className="block px-3 py-2.5 text-sm text-slate-400 hover:text-white rounded-xl transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Calculadora
            </Link>
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-slate-400 hover:text-white rounded-xl"
              onClick={() => setIsCalculatorMobileOpen((v) => !v)}
            >
              Elige una calculadora
              <svg className={`h-4 w-4 transition-transform ${isCalculatorMobileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isCalculatorMobileOpen && (
              <div className="pl-2 pb-1 space-y-0.5">
                {CALCULATOR_MOBILE_LINKS.map((link) => (
                  <Link prefetch={false}
                    key={link.href}
                    href={link.href}
                    className="block px-3 py-2 text-xs text-slate-400 hover:text-white rounded-lg"
                    onClick={() => { setIsCalculatorMobileOpen(false); setIsMobileMenuOpen(false) }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => { setIsMobileMenuOpen(false); window.location.href = '/activar' }}
              className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-medium min-h-[48px]"
            >
              Activación inmediata
            </button>
            <Link prefetch={false}
              href="/app/login"
              className="block w-full mt-2 text-center bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl text-sm font-medium min-h-[48px]"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Iniciar sesión
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
