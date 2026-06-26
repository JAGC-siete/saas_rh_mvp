/** Enlaces del cluster de calculadoras — hub & spoke para SEO interno. */
export const CALCULATOR_HUB_LINKS = {
  hub: { href: '/calculadora', label: 'Todas las calculadoras laborales' },
  landing: { href: '/#como-funciona', label: 'Automatizar nómina con Humano SISU' },
  deductions: [
    {
      href: '/calculadora-deducciones',
      country: 'Honduras',
      title: 'Seguro Social, RAP e ISR',
      subtitle: 'Deducciones en lempiras (HNL)',
    },
    {
      href: '/calculadora-deducciones-el-salvador',
      country: 'El Salvador',
      title: 'Seguro Social, AFP e ISR',
      subtitle: 'Sueldo neto en dólares (USD)'
    },
    {
      href: '/calculadora-deducciones-guatemala',
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
