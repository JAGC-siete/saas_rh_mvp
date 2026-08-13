import type { LandingLocale } from '../locale'
import { deductionCalculatorPublicPath } from '../../marketing/calculator-public-paths'

export type NavCopy = {
  links: { href: string; label: string }[]
  calculator: string
  calculatorPick: string
  activate: string
  activateMobile: string
  login: string
  openMenu: string
  closeMenu: string
  calculatorMenu: {
    href: string
    title: string
    subtitle: string
    featured: false | 'hn' | 'prestaciones'
  }[]
  calculatorMobile: { href: string; label: string }[]
  themeToLight: string
  themeToDark: string
  switchToEn: string
  switchToEs: string
}

const navByLocale: Record<LandingLocale, NavCopy> = {
  es: {
    links: [
      { href: '/#como-funciona', label: 'Cómo funciona' },
      { href: '/suscripcion', label: 'Alertas de sueldo' },
      { href: '/afiliados', label: 'Afiliados' },
    ],
    calculator: 'Calculadora',
    calculatorPick: 'Elige una calculadora',
    activate: 'Activar',
    activateMobile: 'Activación inmediata',
    login: 'Iniciar sesión',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    calculatorMenu: [
      {
        href: '/calculadora',
        title: 'Ver calculadoras',
        subtitle: 'Elige entre deducciones o prestaciones',
        featured: false,
      },
      {
        href: deductionCalculatorPublicPath('HND'),
        title: 'Honduras · Seguro Social · RAP · ISR',
        subtitle: 'Calculadora deducciones (HNL)',
        featured: 'hn',
      },
      {
        href: deductionCalculatorPublicPath('SLV'),
        title: 'El Salvador · Seguro Social · AFP · ISR',
        subtitle: 'Calculadora sueldo neto (USD)',
        featured: false,
      },
      {
        href: deductionCalculatorPublicPath('GTM'),
        title: 'Guatemala · Seguro Social · ISR',
        subtitle: 'Calculadora sueldo neto (GTQ)',
        featured: false,
      },
      {
        href: '/calculadora-prestaciones',
        title: 'Prestaciones laborales',
        subtitle: 'Cesantía · Preaviso · Vacaciones · 13vo · 14vo',
        featured: 'prestaciones',
      },
    ],
    calculatorMobile: [
      { href: deductionCalculatorPublicPath('HND'), label: 'Honduras · Seguro Social / RAP / ISR' },
      { href: deductionCalculatorPublicPath('SLV'), label: 'El Salvador · Seguro Social / AFP / ISR' },
      { href: deductionCalculatorPublicPath('GTM'), label: 'Guatemala · Seguro Social / ISR' },
      { href: '/calculadora-prestaciones', label: 'Prestaciones laborales (cesantía, preaviso, vacaciones…)' },
    ],
    themeToLight: 'Cambiar a modo claro',
    themeToDark: 'Cambiar a modo oscuro',
    switchToEn: 'English',
    switchToEs: 'Español',
  },
  en: {
    links: [
      { href: '/#como-funciona', label: 'How it works' },
      { href: '/suscripcion', label: 'Pay alerts' },
      { href: '/afiliados', label: 'Affiliates' },
    ],
    calculator: 'Calculator',
    calculatorPick: 'Choose a calculator',
    activate: 'Activate',
    activateMobile: 'Instant activation',
    login: 'Log in',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    calculatorMenu: [
      {
        href: '/calculadora',
        title: 'Browse calculators',
        subtitle: 'Deductions or labor benefits',
        featured: false,
      },
      {
        href: deductionCalculatorPublicPath('HND'),
        title: 'Honduras · Social security · RAP · Income tax',
        subtitle: 'Payroll deductions calculator (HNL)',
        featured: 'hn',
      },
      {
        href: deductionCalculatorPublicPath('SLV'),
        title: 'El Salvador · Social security · AFP · Income tax',
        subtitle: 'Net pay calculator (USD)',
        featured: false,
      },
      {
        href: deductionCalculatorPublicPath('GTM'),
        title: 'Guatemala · Social security · Income tax',
        subtitle: 'Net pay calculator (GTQ)',
        featured: false,
      },
      {
        href: '/calculadora-prestaciones',
        title: 'Labor benefits',
        subtitle: 'Severance · Notice · Vacation · 13th · 14th',
        featured: 'prestaciones',
      },
    ],
    calculatorMobile: [
      { href: deductionCalculatorPublicPath('HND'), label: 'Honduras · Social security / RAP / Income tax' },
      { href: deductionCalculatorPublicPath('SLV'), label: 'El Salvador · Social security / AFP / Income tax' },
      { href: deductionCalculatorPublicPath('GTM'), label: 'Guatemala · Social security / Income tax' },
      { href: '/calculadora-prestaciones', label: 'Labor benefits (severance, notice, vacation…)' },
    ],
    themeToLight: 'Switch to light mode',
    themeToDark: 'Switch to dark mode',
    switchToEn: 'English',
    switchToEs: 'Español',
  },
}

export function getNavCopy(locale: LandingLocale): NavCopy {
  return navByLocale[locale] ?? navByLocale.es
}
