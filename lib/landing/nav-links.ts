import { deductionCalculatorPublicPath } from '../marketing/calculator-public-paths'

export const LANDING_NAV_LINKS = [
  { href: '/#como-funciona', label: 'Cómo funciona' },
  { href: '/#servicios', label: 'Servicios' },
  { href: '/suscripcion', label: 'Suscríbete' },
  { href: '/afiliados', label: 'Afiliados' },
] as const

export const CALCULATOR_MENU_ITEMS = [
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
    featured: 'hn' as const,
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
    featured: 'prestaciones' as const,
  },
] as const

export const CALCULATOR_MOBILE_LINKS = [
  { href: deductionCalculatorPublicPath('HND'), label: 'Honduras · Seguro Social / RAP / ISR' },
  { href: deductionCalculatorPublicPath('SLV'), label: 'El Salvador · Seguro Social / AFP / ISR' },
  { href: deductionCalculatorPublicPath('GTM'), label: 'Guatemala · Seguro Social / ISR' },
  { href: '/calculadora-prestaciones', label: 'Prestaciones laborales (cesantía, preaviso, vacaciones…)' },
] as const
