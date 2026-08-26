import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { useScrollThreshold, useScrollY } from '../../lib/hooks/useScrollThreshold'
import { getNavCopy } from '../../lib/i18n/landings/nav'
import { useLandingPreferences } from './LandingPreferencesProvider'
import type { LandingTone } from '../../lib/landing/theme'

interface DockNavbarProps {
  loginAlwaysVisible?: boolean
  /** Extra top offset in px when a fixed banner sits above the dock (e.g. home announcement). */
  topOffsetPx?: number
  tone?: LandingTone
  /** When true (e.g. /paz toneLock), hide theme toggle — DOM is forced by shell. */
  toneLocked?: boolean
}

export default function DockNavbar({
  loginAlwaysVisible = false,
  topOffsetPx = 0,
  tone: toneProp,
  toneLocked = false,
}: DockNavbarProps) {
  const { tone: prefTone, toggleTone, locale, href, switchLocaleHref, enabled } = useLandingPreferences()
  const tone = toneProp ?? prefTone
  const showThemeToggle = enabled && !toneLocked
  const nav = getNavCopy(locale)
  const isScrolled = useScrollY(50)
  const showLoginOnScroll = useScrollThreshold(0.2)
  const showLogin = loginAlwaysVisible || showLoginOnScroll
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCalculatorMenuOpen, setIsCalculatorMenuOpen] = useState(false)
  const [isCalculatorMobileOpen, setIsCalculatorMobileOpen] = useState(false)
  const calculatorMenuRef = useRef<HTMLDivElement | null>(null)
  const isLight = tone === 'light'

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

  const navSurface = isLight
    ? 'bg-white border border-slate-200/80 shadow-sm isolate'
    : 'glass-modern border border-white/10'
  const linkClass = isLight
    ? 'text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap'
    : 'text-slate-400 hover:text-white px-2.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap'
  const menuSurface = isLight
    ? 'bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden'
    : 'glass-modern rounded-2xl shadow-2xl border border-white/10 overflow-hidden'
  const menuItemClass = isLight
    ? 'block px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors'
    : 'block px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors'
  const menuTitleClass = isLight ? 'font-medium text-slate-900 text-sm' : 'font-medium text-white text-sm'
  const menuSubClass = isLight ? 'text-xs text-slate-500 mt-0.5' : 'text-xs text-slate-400 mt-0.5'
  const dividerClass = isLight ? 'h-px bg-slate-200' : 'h-px bg-white/10'
  const mobileLinkClass = isLight
    ? 'block px-3 py-2.5 text-sm text-slate-600 hover:text-slate-900 rounded-xl transition-colors'
    : 'block px-3 py-2.5 text-sm text-slate-400 hover:text-white rounded-xl transition-colors'
  const iconBtnClass = isLight
    ? 'p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors'
    : 'p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors'
  const chromeBtnClass = isLight
    ? 'px-2.5 py-1.5 rounded-full text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors'
    : 'px-2.5 py-1.5 rounded-full text-xs sm:text-sm font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors'

  return (
    <header
      className="fixed left-0 right-0 z-[100] px-4 pointer-events-none isolate"
      style={topStyle}
    >
      <motion.nav
        layout
        className={`pointer-events-auto mx-auto rounded-full transition-all duration-300 ${navSurface} ${
          isScrolled ? 'max-w-3xl py-1.5 px-3' : 'max-w-5xl py-2 px-4'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 h-11 sm:h-12">
          <Link prefetch={false} href={href('/')} className="shrink-0">
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
            {nav.links.map((link) => (
              <Link
                prefetch={false}
                key={link.href}
                href={href(link.href)}
                className={linkClass}
              >
                {link.label}
              </Link>
            ))}
            <div className="relative" ref={calculatorMenuRef}>
              <button
                type="button"
                className={`${linkClass} inline-flex items-center gap-1`}
                aria-haspopup="menu"
                aria-expanded={isCalculatorMenuOpen}
                aria-controls={calculatorMenuId}
                onClick={() => setIsCalculatorMenuOpen((v) => !v)}
              >
                {nav.calculator}
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
                    className={`absolute left-1/2 -translate-x-1/2 mt-2 w-[320px] ${menuSurface}`}
                  >
                    {nav.calculatorMenu.map((item, i) => (
                      <div key={item.href}>
                        {i === 1 && <div className={dividerClass} />}
                        <Link
                          prefetch={false}
                          href={href(item.href)}
                          role="menuitem"
                          className={menuItemClass}
                          onClick={() => setIsCalculatorMenuOpen(false)}
                        >
                          <div className={menuTitleClass}>{item.title}</div>
                          <div className={menuSubClass}>{item.subtitle}</div>
                        </Link>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 ml-auto shrink-0">
            {showThemeToggle && (
              <button
                type="button"
                onClick={toggleTone}
                className={iconBtnClass}
                aria-label={isLight ? nav.themeToDark : nav.themeToLight}
                title={isLight ? nav.themeToDark : nav.themeToLight}
              >
                {isLight ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
              </button>
            )}
            {enabled && (
              <Link prefetch={false} href={switchLocaleHref} className={chromeBtnClass} hrefLang={locale === 'es' ? 'en' : 'es'}>
                {locale === 'es' ? nav.switchToEn : nav.switchToEs}
              </Link>
            )}
            <Link
              prefetch={false}
              href={href('/activar')}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors shadow-[0_0_20px_rgba(34,197,94,0.25)] min-h-[36px] inline-flex items-center"
            >
              {nav.activate}
            </Link>
            <AnimatePresence>
              {showLogin && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    prefetch={false}
                    href="/app/login"
                    className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap block min-h-[36px] leading-[36px]"
                  >
                    {nav.login}
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile chrome + menu toggle */}
          <div className="flex md:hidden items-center gap-0.5 ml-auto">
            {showThemeToggle && (
              <button
                type="button"
                onClick={toggleTone}
                className={iconBtnClass}
                aria-label={isLight ? nav.themeToDark : nav.themeToLight}
              >
                {isLight ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
              </button>
            )}
            {enabled && (
              <Link prefetch={false} href={switchLocaleHref} className={chromeBtnClass}>
                {locale === 'es' ? 'EN' : 'ES'}
              </Link>
            )}
            <button
              type="button"
              className={iconBtnClass}
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-label={isMobileMenuOpen ? nav.closeMenu : nav.openMenu}
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
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`pointer-events-auto md:hidden mt-2 mx-auto max-w-sm rounded-2xl p-3 ${
              isLight
                ? 'bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg'
                : 'glass-modern border border-white/10'
            }`}
          >
            {nav.links.map((link) => (
              <Link
                prefetch={false}
                key={link.href}
                href={href(link.href)}
                className={mobileLinkClass}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              prefetch={false}
              href={href('/calculadora')}
              className={mobileLinkClass}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {nav.calculator}
            </Link>
            <button
              type="button"
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-xl ${
                isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setIsCalculatorMobileOpen((v) => !v)}
            >
              {nav.calculatorPick}
              <svg className={`h-4 w-4 transition-transform ${isCalculatorMobileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isCalculatorMobileOpen && (
              <div className="pl-2 pb-1 space-y-0.5">
                {nav.calculatorMobile.map((link) => (
                  <Link
                    prefetch={false}
                    key={link.href}
                    href={href(link.href)}
                    className={`block px-3 py-2 text-xs rounded-lg ${
                      isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                    }`}
                    onClick={() => {
                      setIsCalculatorMobileOpen(false)
                      setIsMobileMenuOpen(false)
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
            <Link
              prefetch={false}
              href={href('/activar')}
              className="block w-full mt-2 text-center bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-medium min-h-[48px]"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {nav.activateMobile}
            </Link>
            <Link
              prefetch={false}
              href="/app/login"
              className="block w-full mt-2 text-center bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl text-sm font-medium min-h-[48px]"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {nav.login}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
