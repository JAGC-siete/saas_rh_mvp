import type { LandingLocale } from '../locale'

export type CalculatorsCopy = {
  metaPrimary: string
  metaSecondary: string
  metaDescription: string
  metaCta: string
  metaBenefit: string
  metaKeywords: string
  breadcrumbHome: string
  breadcrumbHub: string
  badgeFree: string
  badgeCountries: string
  title: string
  lead: string
  sectionDeductions: string
  sectionBenefits: string
  sectionOther: string
  deductions: {
    country: string
    title: string
    subtitle: string
  }[]
  benefits: {
    country: string
    title: string
    subtitle: string
  }[]
  prestacionesTitle: string
  prestacionesSubtitle: string
  softwareTitle: string
  softwareLead: string
  ctaPrompt: string
  ctaTrial: string
  ctaAlerts: string
  ctaInfo: string
  ctaViernes: string
  ctaPricing: string
}

const byLocale: Record<LandingLocale, CalculatorsCopy> = {
  es: {
    metaPrimary: 'Calculadoras laborales gratis (norma local)',
    metaSecondary: 'Deducciones e indemnización SV GT HN',
    metaDescription:
      'Calculadoras de deducciones (Seguro Social, ISR) y prestaciones para Honduras, El Salvador y Guatemala',
    metaCta: 'Usa la calculadora gratis',
    metaBenefit: 'mismo motor legal que Humano SISU',
    metaKeywords:
      'calculadora deducciones, IHSS RAP ISR Honduras, ISSS AFP El Salvador, IGSS Guatemala, sueldo neto, nómina regional, Humano SISU',
    breadcrumbHome: 'Inicio',
    breadcrumbHub: 'Calculadoras laborales',
    badgeFree: 'Herramientas gratuitas',
    badgeCountries: 'Honduras · El Salvador · Guatemala',
    title: 'Calculadoras laborales gratuitas',
    lead: 'Elige tu país y valida deducciones o prestaciones. Misma lógica legal que el software de nómina Humano SISU.',
    sectionDeductions: 'Deducciones de salario por país',
    sectionBenefits: 'Aguinaldo y catorceavo (Honduras)',
    sectionOther: 'Otras herramientas',
    deductions: [
      {
        country: 'Honduras',
        title: 'Seguro Social, RAP e ISR',
        subtitle: 'Deducciones en lempiras (HNL)',
      },
      {
        country: 'El Salvador',
        title: 'Seguro Social, AFP e ISR',
        subtitle: 'Sueldo neto en dólares (USD)',
      },
      {
        country: 'Guatemala',
        title: 'Seguro Social e ISR',
        subtitle: 'Sueldo neto en quetzales (GTQ)',
      },
    ],
    benefits: [
      {
        country: 'Honduras',
        title: 'Aguinaldo (13vo)',
        subtitle: 'Décimo tercer mes en lempiras',
      },
      {
        country: 'Honduras',
        title: 'Catorceavo (14vo)',
        subtitle: 'Décimo cuarto mes jul–jun',
      },
    ],
    prestacionesTitle: 'Prestaciones y finiquito',
    prestacionesSubtitle: 'Cesantía, preaviso, vacaciones, 13vo y 14vo',
    softwareTitle: 'Software de nómina regional',
    softwareLead: 'Automatizar nómina con Humano SISU — biometría, planilla y deducciones de ley en un solo lugar.',
    ctaPrompt: '¿Validaste tu sueldo y quieres eliminar Excel en tu empresa?',
    ctaTrial: 'Probar Humano SISU gratis',
    ctaAlerts: 'Alertas de sueldo',
    ctaInfo: 'Cerrar planilla en paz',
    ctaViernes: 'Domingos sin planilla',
    ctaPricing: 'Ver planes y cotización',
  },
  en: {
    metaPrimary: 'Free labor calculators (local rules)',
    metaSecondary: 'Deductions & severance SV GT HN',
    metaDescription:
      'Payroll deduction calculators (social security, income tax) and benefits for Honduras, El Salvador, and Guatemala',
    metaCta: 'Use the free calculator',
    metaBenefit: 'same legal engine as Humano SISU',
    metaKeywords:
      'payroll calculator, IHSS RAP ISR Honduras, ISSS AFP El Salvador, IGSS Guatemala, net pay, regional payroll, Humano SISU',
    breadcrumbHome: 'Home',
    breadcrumbHub: 'Labor calculators',
    badgeFree: 'Free tools',
    badgeCountries: 'Honduras · El Salvador · Guatemala',
    title: 'Free labor calculators',
    lead: 'Pick your country and validate deductions or benefits. Same legal logic as Humano SISU payroll software.',
    sectionDeductions: 'Salary deductions by country',
    sectionBenefits: '13th & 14th month (Honduras)',
    sectionOther: 'Other tools',
    deductions: [
      {
        country: 'Honduras',
        title: 'Social security, RAP & income tax',
        subtitle: 'Deductions in lempiras (HNL)',
      },
      {
        country: 'El Salvador',
        title: 'Social security, AFP & income tax',
        subtitle: 'Net pay in dollars (USD)',
      },
      {
        country: 'Guatemala',
        title: 'Social security & income tax',
        subtitle: 'Net pay in quetzales (GTQ)',
      },
    ],
    benefits: [
      {
        country: 'Honduras',
        title: 'Aguinaldo (13th month)',
        subtitle: 'Thirteenth month in lempiras',
      },
      {
        country: 'Honduras',
        title: 'Fourteenth month (14th)',
        subtitle: 'Fourteenth month Jul–Jun',
      },
    ],
    prestacionesTitle: 'Benefits & settlement',
    prestacionesSubtitle: 'Severance, notice, vacation, 13th & 14th',
    softwareTitle: 'Regional payroll software',
    softwareLead: 'Automate payroll with Humano SISU — biometrics, payroll, and statutory deductions in one place.',
    ctaPrompt: 'Validated your pay and ready to drop Excel at your company?',
    ctaTrial: 'Try Humano SISU free',
    ctaAlerts: 'Pay alerts',
    ctaInfo: 'Close payroll in peace',
    ctaViernes: 'Sundays without payroll',
    ctaPricing: 'View plans & get a quote',
  },
}

export function getCalculatorsCopy(locale: LandingLocale): CalculatorsCopy {
  return byLocale[locale] ?? byLocale.es
}
