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
    href: '/calculadora-deducciones',
    title: 'Honduras · Seguro Social · RAP · ISR',
    subtitle: 'Calculadora deducciones (HNL)',
    featured: 'hn' as const,
  },
  {
    href: '/calculadora-deducciones-el-salvador',
    title: 'El Salvador · Seguro Social · AFP · ISR',
    subtitle: 'Calculadora sueldo neto (USD)',
    featured: false,
  },
  {
    href: '/calculadora-deducciones-guatemala',
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
  { href: '/calculadora-deducciones', label: 'Honduras · Seguro Social / RAP / ISR' },
  { href: '/calculadora-deducciones-el-salvador', label: 'El Salvador · Seguro Social / AFP / ISR' },
  { href: '/calculadora-deducciones-guatemala', label: 'Guatemala · Seguro Social / ISR' },
  { href: '/calculadora-prestaciones', label: 'Prestaciones laborales (cesantía, preaviso, vacaciones…)' },
] as const
