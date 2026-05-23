/** Enlaces del cluster de calculadoras — hub & spoke para SEO interno. */
export const CALCULATOR_HUB_LINKS = {
  hub: { href: '/calculadora', label: 'Todas las calculadoras laborales' },
  landing: { href: '/#como-funciona', label: 'Automatizar nómina con Humano SISU' },
  deductions: [
    {
      href: '/calculadora-deducciones',
      country: 'Honduras',
      title: 'IHSS, RAP e ISR',
      subtitle: 'Deducciones en lempiras (HNL)',
      badge: 'Motor orgánico principal'
    },
    {
      href: '/calculadora-deducciones-el-salvador',
      country: 'El Salvador',
      title: 'ISSS, AFP e ISR',
      subtitle: 'Sueldo neto en dólares (USD)'
    },
    {
      href: '/calculadora-deducciones-guatemala',
      country: 'Guatemala',
      title: 'IGSS e ISR',
      subtitle: 'Sueldo neto en quetzales (GTQ)'
    }
  ],
  prestaciones: {
    href: '/calculadora-prestaciones',
    title: 'Prestaciones y finiquito',
    subtitle: 'Cesantía, preaviso, vacaciones, 13vo y 14vo'
  }
} as const
