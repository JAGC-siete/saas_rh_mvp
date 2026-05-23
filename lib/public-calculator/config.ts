import type { CountryCode } from '../country/supported'
import type { FAQItem } from '../seo/schema'

export type PublicCalculatorDeductionKey = 'ihss' | 'rap' | 'afp' | 'infop' | 'isr'

export type PublicCalculatorDeductionOption = {
  key: PublicCalculatorDeductionKey
  title: string
  subtitle: string
  hint: string
  showInSelector: boolean
  showInResults: boolean
}

export type PublicCalculatorConfig = {
  countryCode: CountryCode
  path: string
  canonicalUrl: string
  contactStorageKey: string
  locale: string
  currency: 'HNL' | 'USD' | 'GTQ'
  currencyPrefix: string
  phonePlaceholder: string
  seo: {
    title: string
    description: string
    keywords: string
    inLanguage: string
  }
  hero: {
    badges: string[]
    headlineLead: string
    headlineAccent: string
    subheadline: string
  }
  defaultDeductions: Record<PublicCalculatorDeductionKey, boolean>
  deductionOptions: PublicCalculatorDeductionOption[]
  resultLabels: {
    socialPrimary: string
    socialPrimaryLong: string
    socialPrimaryTooltip: string
    socialSecondary?: string
    socialSecondaryLong?: string
    socialSecondaryTooltip?: string
    afp?: string
    afpLong?: string
    afpTooltip?: string
    infop?: string
    infopLong?: string
    infopTooltip?: string
    isrLong: string
    isrTooltip: string
  }
  trust: {
    line: string
    minimumWageLabel: string
    ceilingLabel: string
  }
  conversion: {
    inlineTitle: string
    inlineBody: string
    inlineButton: string
    inlineHref: string
    footerTitle: string
    footerBody: string
    footerButton: string
    footerHref: string
  }
  faqs: FAQItem[]
  relatedCalculators: Array<{ href: string; label: string }>
}

const BASE = 'https://humanosisu.net'

export const PUBLIC_CALCULATOR_CONFIGS: Record<CountryCode, PublicCalculatorConfig> = {
  HND: {
    countryCode: 'HND',
    path: '/calculadora-deducciones',
    canonicalUrl: `${BASE}/calculadora-deducciones`,
    contactStorageKey: 'public_deducciones_contact_hnd_v1',
    locale: 'es-HN',
    currency: 'HNL',
    currencyPrefix: 'Lps.',
    phonePlaceholder: 'Ej: +504 9999-9999',
    seo: {
      title: 'Calculadora IHSS, RAP, ISR (Honduras) | Sin cálculos manuales | Humano SISU',
      description:
        'Valida IHSS, RAP e ISR sin cálculos manuales. Herramienta gratuita según leyes de Honduras. ¿Automatizamos tu nómina? Activar gratis hoy.',
      keywords:
        'calculadora IHSS RAP ISR, deducciones nómina Honduras, sueldo neto Honduras, planilla Honduras, INFOP, nómina regional',
      inLanguage: 'es-HN'
    },
    hero: {
      badges: ['Valida deducciones de ley', 'Honduras · ISR · IHSS · RAP', 'Gratis y en 30 segundos'],
      headlineLead: '¿Te están deduciendo lo justo?',
      headlineAccent: 'Sal de dudas en 30 segundos.',
      subheadline:
        'Esta calculadora te ayuda a validar si tus deducciones de ley (ISR, IHSS, RAP) en Honduras son correctas, de forma gratuita y sin errores.'
    },
    defaultDeductions: { ihss: true, rap: true, afp: false, infop: false, isr: true },
    deductionOptions: [
      { key: 'ihss', title: 'IHSS', subtitle: 'Seguridad social', hint: 'Instituto Hondureño de Seguridad Social. 5% hasta el tope.', showInSelector: true, showInResults: true },
      { key: 'rap', title: 'RAP', subtitle: 'Ahorro pensiones', hint: 'Régimen de Ahorro para Pensiones. 1.5% sobre excedente del salario mínimo.', showInSelector: true, showInResults: true },
      { key: 'afp', title: 'AFP', subtitle: 'Fondo de pensiones', hint: 'En Honduras esta calculadora pública muestra AFP como opción; el cálculo obrero va en 0.', showInSelector: true, showInResults: true },
      { key: 'infop', title: 'INFOP', subtitle: 'Formación (1%)', hint: 'Normalmente aporte patronal. Si lo activas, lo incluimos como 1% del salario.', showInSelector: true, showInResults: true },
      { key: 'isr', title: 'ISR', subtitle: 'Impuesto renta', hint: 'Impuesto progresivo según tablas vigentes.', showInSelector: true, showInResults: true }
    ],
    resultLabels: {
      socialPrimary: 'IHSS',
      socialPrimaryLong: '(Instituto Hondureño de Seguridad Social)',
      socialPrimaryTooltip: 'Se calcula como el 5% del salario hasta el tope máximo establecido por ley.',
      socialSecondary: 'RAP',
      socialSecondaryLong: '(Régimen de Ahorro para Pensiones)',
      socialSecondaryTooltip: 'Se calcula como el 1.5% sobre el excedente del salario sobre el salario mínimo.',
      afp: 'AFP',
      afpLong: '(Fondo de pensiones)',
      afpTooltip: 'En esta calculadora pública para Honduras se muestra como opción pero actualmente retorna 0.',
      infop: 'INFOP',
      infopLong: '(Formación profesional)',
      infopTooltip: 'Usualmente es aporte patronal. Si lo activas aquí, lo incluimos como 1% del salario.',
      isrLong: '(Impuesto sobre la Renta)',
      isrTooltip: 'Impuesto progresivo según los rangos de ingresos establecidos por la ley.'
    },
    trust: {
      line: '✓ Cálculos basados en leyes vigentes de Honduras',
      minimumWageLabel: 'Salario mínimo',
      ceilingLabel: 'Tope IHSS'
    },
    conversion: {
      inlineTitle: 'Control de asistencia y nómina en un solo lugar: Sin cálculos manuales, sin errores.',
      inlineBody:
        'Integra tus biométricos con Humano SISU en Honduras. Del cálculo al comprobante en segundos. Automatiza IHSS, RAP e ISR.',
      inlineButton: 'Activar gratis hoy — Sin tarjeta de crédito',
      inlineHref: '/activar?country=HND',
      footerTitle: '¿Automatizamos tu nómina en Honduras?',
      footerBody:
        'Software de RH regional que integra biométrico, nómina y deducciones de ley. Activación inmediata, soporte local.',
      footerButton: 'Activar gratis hoy — Sin tarjeta',
      footerHref: '/activar?country=HND'
    },
    faqs: [
      { question: '¿Cómo calcular IHSS en Honduras?', answer: 'El aporte obrero de IHSS es el 5% del salario hasta el tope legal vigente. Esta calculadora usa el mismo motor de nómina de Humano SISU.' },
      { question: '¿Qué deducciones incluye la calculadora?', answer: 'Puedes incluir IHSS, RAP, ISR y opcionalmente INFOP según tu caso. Los resultados reflejan las leyes vigentes para Honduras.' }
    ],
    relatedCalculators: [
      { href: '/calculadora-deducciones-el-salvador', label: 'Calculadora El Salvador' },
      { href: '/calculadora-deducciones-guatemala', label: 'Calculadora Guatemala' }
    ]
  },
  SLV: {
    countryCode: 'SLV',
    path: '/calculadora-deducciones-el-salvador',
    canonicalUrl: `${BASE}/calculadora-deducciones-el-salvador`,
    contactStorageKey: 'public_deducciones_contact_slv_v1',
    locale: 'es-SV',
    currency: 'USD',
    currencyPrefix: '$',
    phonePlaceholder: 'Ej: +503 7777-7777',
    seo: {
      title: 'Calculadora ISR El Salvador | ISSS, AFP y sueldo neto | Humano SISU',
      description:
        'Calculadora ISR El Salvador gratis: ISSS, AFP y sueldo neto en USD. Mismo motor de nómina Humano SISU. Automatiza planilla en El Salvador.',
      keywords:
        'Calculadora ISR El Salvador, sueldo neto El Salvador, ISSS, AFP El Salvador, deducciones planilla SV, retención renta El Salvador, nómina El Salvador',
      inLanguage: 'es-SV'
    },
    hero: {
      badges: ['ISSS · AFP · ISR', 'El Salvador · USD', 'Gratis en 30 segundos'],
      headlineLead: '¿Cuánto te queda neto en El Salvador?',
      headlineAccent: 'Calcula ISSS, AFP e ISR al instante.',
      subheadline:
        'Calculadora ISR El Salvador con el motor profesional de Humano SISU. Valida tu sueldo neto en dólares antes de firmar o reclamar.'
    },
    defaultDeductions: { ihss: true, rap: true, afp: true, infop: false, isr: true },
    deductionOptions: [
      { key: 'ihss', title: 'ISSS', subtitle: 'Seguro social', hint: 'Instituto Salvadoreño del Seguro Social. 3% con tope mensual.', showInSelector: true, showInResults: true },
      { key: 'rap', title: 'AFP', subtitle: 'Pensiones', hint: 'Administradora de Fondos de Pensiones. 7.25% sobre salario.', showInSelector: true, showInResults: true },
      { key: 'afp', title: 'AFP', subtitle: 'Alias pensiones', hint: 'Misma deducción que AFP/rap en planilla salvadoreña.', showInSelector: false, showInResults: false },
      { key: 'infop', title: 'INFOP', subtitle: 'No aplica', hint: 'No se incluye en esta calculadora para El Salvador.', showInSelector: false, showInResults: false },
      { key: 'isr', title: 'ISR', subtitle: 'Retención renta', hint: 'Retención mensual según tablas del Ministerio de Hacienda.', showInSelector: true, showInResults: true }
    ],
    resultLabels: {
      socialPrimary: 'ISSS',
      socialPrimaryLong: '(Instituto Salvadoreño del Seguro Social)',
      socialPrimaryTooltip: 'Aporte obrero con tope mensual según parámetros legales vigentes.',
      socialSecondary: 'AFP',
      socialSecondaryLong: '(Administradora de Fondos de Pensiones)',
      socialSecondaryTooltip: 'Aporte obrero de pensiones calculado sobre el salario mensual.',
      isrLong: '(Impuesto sobre la Renta)',
      isrTooltip: 'Retención mensual en USD según tramos vigentes en El Salvador.'
    },
    trust: {
      line: '✓ Cálculos basados en leyes vigentes de El Salvador',
      minimumWageLabel: 'Salario mínimo ref.',
      ceilingLabel: 'Tope ISSS'
    },
    conversion: {
      inlineTitle: 'Automatiza planilla en El Salvador con Humano SISU',
      inlineBody:
        'Del reloj biométrico al comprobante en USD. ISSS, AFP e ISR sin Excel. Prueba gratis y activa tu empresa en minutos.',
      inlineButton: 'Probar SISU en El Salvador — Gratis',
      inlineHref: '/activar?country=SLV',
      footerTitle: '¿Tu empresa aún calcula planilla a mano?',
      footerBody:
        'Humano SISU automatiza asistencia, ISSS, AFP e ISR para equipos en El Salvador. Soporte regional en español.',
      footerButton: 'Activar cuenta gratis — El Salvador',
      footerHref: '/activar?country=SLV'
    },
    faqs: [
      { question: '¿Cómo usar la calculadora ISR El Salvador?', answer: 'Ingresa tu salario mensual o quincenal en USD, elige las deducciones y obtén ISSS, AFP e ISR con el mismo motor de nómina de Humano SISU.' },
      { question: '¿El sueldo neto incluye ISSS y AFP?', answer: 'Sí. Puedes activar o desactivar cada rubro. El neto es salario bruto menos ISSS, AFP e ISR seleccionados.' }
    ],
    relatedCalculators: [
      { href: '/calculadora-deducciones', label: 'Calculadora Honduras' },
      { href: '/calculadora-deducciones-guatemala', label: 'Calculadora Guatemala' }
    ]
  },
  GTM: {
    countryCode: 'GTM',
    path: '/calculadora-deducciones-guatemala',
    canonicalUrl: `${BASE}/calculadora-deducciones-guatemala`,
    contactStorageKey: 'public_deducciones_contact_gtm_v1',
    locale: 'es-GT',
    currency: 'GTQ',
    currencyPrefix: 'Q',
    phonePlaceholder: 'Ej: +502 5555-5555',
    seo: {
      title: 'Calculadora sueldo neto Guatemala | IGSS e ISR | Humano SISU',
      description:
        'Calculadora sueldo neto Guatemala: IGSS e ISR en quetzales. Motor de nómina Humano SISU. Automatiza planilla en Guatemala gratis.',
      keywords:
        'Sueldo Neto Guatemala, calculadora IGSS Guatemala, ISR Guatemala, deducciones planilla GT, sueldo neto quetzales, nómina Guatemala',
      inLanguage: 'es-GT'
    },
    hero: {
      badges: ['IGSS · ISR', 'Guatemala · GTQ', 'Gratis en 30 segundos'],
      headlineLead: '¿Cuánto recibes neto en Guatemala?',
      headlineAccent: 'Calcula IGSS e ISR en quetzales.',
      subheadline:
        'Calculadora de sueldo neto Guatemala con parámetros legales vigentes. Misma lógica que la planilla profesional de Humano SISU.'
    },
    defaultDeductions: { ihss: true, rap: false, afp: false, infop: false, isr: true },
    deductionOptions: [
      { key: 'ihss', title: 'IGSS', subtitle: 'Seguro social', hint: 'Instituto Guatemalteco de Seguridad Social. Aporte obrero según tasa vigente.', showInSelector: true, showInResults: true },
      { key: 'rap', title: 'RAP', subtitle: 'No aplica', hint: 'No aplica en Guatemala para esta calculadora.', showInSelector: false, showInResults: false },
      { key: 'afp', title: 'AFP', subtitle: 'No aplica', hint: 'No aplica en Guatemala.', showInSelector: false, showInResults: false },
      { key: 'infop', title: 'INFOP', subtitle: 'No aplica', hint: 'No se incluye en esta calculadora para Guatemala.', showInSelector: false, showInResults: false },
      { key: 'isr', title: 'ISR', subtitle: 'Impuesto renta', hint: 'Retención según modelo anual simplificado vigente.', showInSelector: true, showInResults: true }
    ],
    resultLabels: {
      socialPrimary: 'IGSS',
      socialPrimaryLong: '(Instituto Guatemalteco de Seguridad Social)',
      socialPrimaryTooltip: 'Aporte obrero de IGSS calculado sobre la base mensual.',
      isrLong: '(Impuesto sobre la Renta)',
      isrTooltip: 'Retención mensual en quetzales según parámetros legales configurados.'
    },
    trust: {
      line: '✓ Cálculos basados en leyes vigentes de Guatemala',
      minimumWageLabel: 'Salario mínimo ref.',
      ceilingLabel: 'Referencia IGSS'
    },
    conversion: {
      inlineTitle: 'Automatiza nómina en Guatemala con Humano SISU',
      inlineBody:
        'Integra asistencia biométrica y planilla en quetzales. IGSS e ISR sin hojas de cálculo. Activa tu prueba gratis hoy.',
      inlineButton: 'Probar SISU en Guatemala — Gratis',
      inlineHref: '/activar?country=GTM',
      footerTitle: '¿Listo para dejar Excel en Guatemala?',
      footerBody:
        'Humano SISU centraliza asistencia, IGSS, ISR y comprobantes para empresas guatemaltecas. Implementación express.',
      footerButton: 'Activar cuenta gratis — Guatemala',
      footerHref: '/activar?country=GTM'
    },
    faqs: [
      { question: '¿Cómo calcular sueldo neto en Guatemala?', answer: 'Ingresa tu salario en quetzales, selecciona IGSS e ISR y obtén el neto del período con el motor de nómina de Humano SISU.' },
      { question: '¿La calculadora incluye IGSS?', answer: 'Sí. El rubro IGSS usa la tasa obrero configurada en los parámetros legales del SaaS para Guatemala.' }
    ],
    relatedCalculators: [
      { href: '/calculadora-deducciones', label: 'Calculadora Honduras' },
      { href: '/calculadora-deducciones-el-salvador', label: 'Calculadora El Salvador' }
    ]
  }
}
