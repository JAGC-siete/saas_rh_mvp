/** Enlaces del cluster de calculadoras — hub & spoke para SEO interno. */
import { INFO_FUNNEL_PUBLIC_PATH } from '../marketing/info-funnel-path'
import { deductionCalculatorPublicPath } from '../marketing/calculator-public-paths'

export const CALCULATOR_HUB_LINKS = {
  hub: { href: '/calculadora', label: 'Todas las calculadoras laborales' },
  suscripcion: {
    href: '/suscripcion',
    label: 'Newsletter nómina y RRHH',
    subtitle: 'Guías y alertas legales tras usar las calculadoras',
  },
  info: {
    href: INFO_FUNNEL_PUBLIC_PATH,
    label: 'El Secreto',
    subtitle: 'Archivo reservado: truco y misiones sobre nómina',
  },
  landing: { href: '/#como-funciona', label: 'Automatizar nómina con Humano SISU' },
  deductions: [
    {
      href: deductionCalculatorPublicPath('HND'),
      country: 'Honduras',
      title: 'Seguro Social, RAP e ISR',
      subtitle: 'Deducciones en lempiras (HNL)',
    },
    {
      href: deductionCalculatorPublicPath('SLV'),
      country: 'El Salvador',
      title: 'Seguro Social, AFP e ISR',
      subtitle: 'Sueldo neto en dólares (USD)'
    },
    {
      href: deductionCalculatorPublicPath('GTM'),
      country: 'Guatemala',
      title: 'Seguro Social e ISR',
      subtitle: 'Sueldo neto en quetzales (GTQ)'
    }
  ],
  prestaciones: {
    href: '/calculadora-prestaciones',
    title: 'Prestaciones y finiquito',
    subtitle: 'Cesantía, preaviso, vacaciones, 13vo y 14vo'
  },
  benefits: [
    {
      href: '/calculadora-aguinaldo-honduras',
      country: 'Honduras',
      title: 'Aguinaldo (13vo)',
      subtitle: 'Décimo tercer mes en lempiras',
    },
    {
      href: '/calculadora-catorceavo-honduras',
      country: 'Honduras',
      title: 'Catorceavo (14vo)',
      subtitle: 'Décimo cuarto mes jul–jun',
    },
  ],
} as const
