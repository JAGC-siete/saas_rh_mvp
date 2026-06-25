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
    demoButton: string
    footerTitle: string
    footerBody: string
    footerButton: string
    footerHref: string
  }
  faqs: FAQItem[]
  relatedCalculators: Array<{ href: string; label: string }>
  breadcrumbLabel: string
  landingBridge: {
    title: string
    body: string
    href: string
    cta: string
  }
  /** Bloque editorial SEO (opcional). Alineado a queries de Search Console. */
  seoGuide?: {
    title: string
    intro: string
    sections: Array<{ heading: string; body: string }>
  }
  /** Embudo B2B Hormozi/Suby (opcional; solo HND en v1). */
  b2bFunnel?: {
    hero: {
      headlineLead: string
      headlineAccent: string
      subheadline: string
      authorityLine: string
    }
    digitalHealth: {
      title: string
      cavemanLabel: string
      proLabel: string
      timeLeakHoursPerMonth: number
      constanciaDaysCaveman: string
      constanciaSecondsPro: number
    }
    trojanHorse: {
      headline: string
      subheadline: string
      rrhh: { label: string; whatsappScript: string }
      boss: { label: string; whatsappScript: string }
    }
    audience: {
      employeeTitle: string
      bossTitle: string
      employeeBody: string
      bossBody: string
    }
    stickyConstancia: { text: string; ctaLabel: string }
    godfatherKeyword: string
  }
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
      title: 'Calculadora ISR Honduras y Calculadora RAP | IHSS · Sueldo neto | Humano SISU',
      description:
        'Calculadora ISR Honduras y calculadora RAP gratis. Calcula IHSS, deducciones de ley y salario neto en lempiras con el mismo motor de nómina Humano SISU.',
      keywords:
        'calculadora isr honduras, calculadora rap, calculadora ihss honduras, sueldo neto honduras, deducciones planilla Honduras, IHSS RAP ISR',
      inLanguage: 'es-HN'
    },
    hero: {
      badges: ['Calculadora ISR Honduras', 'Calculadora RAP · IHSS', 'Gratis en 30 segundos'],
      headlineLead: 'Deja de adivinar tu sueldo. Obtén el desglose legal exacto que RR.HH. no te explica.',
      headlineAccent: 'Calculado con el motor de Humano SISU — cumplimiento legal 2026.',
      subheadline:
        'Ingresa tu salario mensual o quincenal y valida al instante cuánto te descuentan de ISR, RAP e IHSS según las leyes vigentes en Honduras.'
    },
    b2bFunnel: {
      hero: {
        headlineLead: 'Deja de adivinar tu sueldo. Obtén el desglose legal exacto que RR.HH. no te explica.',
        headlineAccent: 'Calculado con el motor de Humano SISU — cumplimiento legal 2026.',
        subheadline:
          'Ingresa tu salario mensual o quincenal y valida al instante cuánto te descuentan de ISR, RAP e IHSS según las leyes vigentes en Honduras.',
        authorityLine: 'Cumplimiento 100% legal 2026'
      },
      digitalHealth: {
        title: 'Diagnóstico de tu oficina',
        cavemanLabel: 'Modo Cavernícola',
        proLabel: 'Modo Pro',
        timeLeakHoursPerMonth: 15,
        constanciaDaysCaveman: '3-5 días',
        constanciaSecondsPro: 2
      },
      trojanHorse: {
        headline: '¿Quieres que tu jefe te quiera un poquito más (y te dé tus constancias rápido)?',
        subheadline:
          'Dale el regalo de la automatización. Hazle saber que puede ahorrar 20 horas de estrés al mes. Nosotros le explicamos cómo, tú solo pasas el link.',
        rrhh: {
          label: 'Enviar recomendación al Lic. (RRHH)',
          whatsappScript:
            'Hola Lic., estaba validando mis deducciones en una calculadora de Humano SISU y vi que tienen una herramienta para automatizar toda la planilla y que nosotros mismos bajemos las constancias y vouchers desde el cel. Me acordé de cuánto tiempo pasan ustedes revisando esos excels y pensé que esto les ahorraría un mundo de trabajo. Les dejo el link por si les sirve el dato:'
        },
        boss: {
          label: 'Enviar recomendación al Jefe (Dueño)',
          whatsappScript:
            'Hola, estaba validando mis deducciones en una calculadora de Humano SISU y vi que tienen una herramienta para automatizar toda la planilla y que nosotros mismos bajemos las constancias y vouchers desde el cel. Me acordé de cuánto tiempo pasan ustedes revisando esos excels y pensé que esto les ahorraría un mundo de trabajo. Les dejo el link por si les sirve el dato:'
        }
      },
      audience: {
        employeeTitle: 'Soy empleado',
        bossTitle: 'Soy jefe / RR.HH.',
        employeeBody: 'Conviértete en el héroe de la eficiencia — comparte Humano SISU con quien decide en tu empresa.',
        bossBody: 'Deja de quemar dinero en Excel. Activa el mismo motor legal que acabas de probar.'
      },
      stickyConstancia: {
        text: '¿Harto de esperar por tu constancia?',
        ctaLabel: 'Haz clic aquí'
      },
      godfatherKeyword: 'MI CONSTANCIA TARDA UNA ETERNIDAD'
    },
    defaultDeductions: { ihss: true, rap: true, afp: false, infop: false, isr: true },
    deductionOptions: [
      { key: 'ihss', title: 'IHSS', subtitle: 'Seguridad social', hint: 'Instituto Hondureño de Seguridad Social. 5% hasta el tope.', showInSelector: true, showInResults: true },
      { key: 'rap', title: 'RAP', subtitle: 'Ahorro pensiones', hint: 'FOVIIF: 1.5% sobre el excedente del techo IHSS IVM.', showInSelector: true, showInResults: true },
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
      socialSecondaryTooltip: 'Se calcula como el 1.5% sobre el excedente del salario respecto al techo IHSS IVM.',
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
      inlineTitle: 'Deja de calcular en Excel. Automatiza toda tu nómina.',
      inlineBody:
        'Acabas de usar el mismo motor legal que Humano SISU. Del biométrico al comprobante en segundos — IHSS, RAP e ISR sin errores manuales.',
      inlineButton: 'Activar gratis — Sin tarjeta',
      inlineHref: '/activar?country=HND',
      demoButton: 'Agendar demo',
      footerTitle: '¿Tu empresa aún calcula planilla a mano?',
      footerBody:
        'Humano SISU integra asistencia biométrica y nómina en Honduras. Mismo motor que esta calculadora — activación inmediata.',
      footerButton: 'Activar gratis',
      footerHref: '/activar?country=HND'
    },
    faqs: [
      {
        question: '¿Cómo funciona la calculadora ISR Honduras?',
        answer:
          'Ingresas tu salario bruto (mensual o quincenal), seleccionas ISR en las deducciones y la herramienta aplica la tabla progresiva vigente en Honduras. El resultado muestra cuánto se retiene de impuesto sobre la renta y tu salario neto estimado.'
      },
      {
        question: '¿Qué es la calculadora RAP y cómo se calcula?',
        answer:
          'La calculadora RAP estima el aporte obrero al FOVIIF: 1.5% sobre el excedente del techo IHSS IVM. Puedes activar o desactivar RAP junto con IHSS e ISR para ver el total de deducciones.'
      },
      {
        question: '¿Cómo calcular IHSS en Honduras con esta herramienta?',
        answer:
          'El IHSS obrero es el 5% del salario hasta el tope legal del año. La calculadora usa los mismos parámetros que el motor de nómina profesional de Humano SISU.'
      },
      {
        question: '¿Sirve para planilla quincenal y mensual?',
        answer:
          'Sí. Elige modalidad quincenal o mensual; la herramienta prorratea las deducciones de ley para mostrarte el monto del período que estás revisando.'
      }
    ],
    relatedCalculators: [
      { href: '/calculadora-deducciones-el-salvador', label: 'Calculadora El Salvador' },
      { href: '/calculadora-deducciones-guatemala', label: 'Calculadora Guatemala' }
    ],
    breadcrumbLabel: 'Deducciones Honduras',
    landingBridge: {
      title: '¿Tu empresa calcula planilla en Excel?',
      body: 'Humano SISU conecta asistencia biométrica y nómina automatizada para Honduras — mismo motor que esta calculadora.',
      href: '/#como-funciona',
      cta: 'Ver cómo automatizar nómina en Humano SISU'
    },
    seoGuide: {
      title: 'Guía rápida: calculadora ISR Honduras y calculadora RAP',
      intro:
        'Esta página concentra las búsquedas más frecuentes sobre deducciones de salario en Honduras. Usa el formulario arriba para obtener cifras exactas; aquí el contexto legal en lenguaje claro.',
      sections: [
        {
          heading: 'Calculadora ISR Honduras: ¿qué calcula?',
          body:
            'El Impuesto sobre la Renta (ISR) en Honduras se calcula con una tabla progresiva según tu ingreso gravable. Nuestra calculadora ISR Honduras aplica los tramos vigentes del año en curso y te muestra la retención mensual o quincenal, según el salario que ingreses.'
        },
        {
          heading: 'Calculadora RAP: deducción de pensiones',
          body:
            'El RAP descuenta el 1.5% sobre la parte del salario que excede el techo IHSS IVM. La calculadora RAP te permite ver ese rubro por separado o junto con IHSS e ISR para conocer tu sueldo neto real.'
        },
        {
          heading: 'IHSS y salario neto en lempiras',
          body:
            'Además de ISR y RAP, el IHSS obrero (5% con tope) suele ser la otra deducción principal. Al sumar los rubros que correspondan a tu caso, obtienes el total descontado y el neto a recibir — útil para validar tu voucher o negociar con RR.HH.'
        },
        {
          heading: '¿Empresa o empleado?',
          body:
            'Si solo quieres validar tu recibo, basta con la calculadora gratuita. Si gestionas planilla para varios colaboradores, Humano SISU automatiza IHSS, RAP e ISR desde la asistencia biométrica hasta el comprobante de pago.'
        }
      ]
    }
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
      inlineTitle: 'Deja de calcular en Excel. Automatiza toda tu nómina.',
      inlineBody:
        'Del reloj biométrico al comprobante en USD. ISSS, AFP e ISR con el mismo motor que acabas de usar — sin errores manuales.',
      inlineButton: 'Activar gratis — El Salvador',
      inlineHref: '/activar?country=SLV',
      demoButton: 'Agendar demo',
      footerTitle: '¿Tu empresa aún calcula planilla a mano?',
      footerBody:
        'Humano SISU automatiza asistencia, ISSS, AFP e ISR para equipos en El Salvador. Soporte regional en español.',
      footerButton: 'Activar gratis',
      footerHref: '/activar?country=SLV'
    },
    faqs: [
      { question: '¿Cómo usar la calculadora ISR El Salvador?', answer: 'Ingresa tu salario mensual o quincenal en USD, elige las deducciones y obtén ISSS, AFP e ISR con el mismo motor de nómina de Humano SISU.' },
      { question: '¿El sueldo neto incluye ISSS y AFP?', answer: 'Sí. Puedes activar o desactivar cada rubro. El neto es salario bruto menos ISSS, AFP e ISR seleccionados.' }
    ],
    relatedCalculators: [
      { href: '/calculadora-deducciones', label: 'Calculadora Honduras' },
      { href: '/calculadora-deducciones-guatemala', label: 'Calculadora Guatemala' }
    ],
    breadcrumbLabel: 'Deducciones El Salvador',
    landingBridge: {
      title: '¿Gestionas planilla en El Salvador?',
      body: 'Descubre cómo Humano SISU automatiza ISSS, AFP e ISR desde la asistencia hasta el comprobante en USD.',
      href: '/#como-funciona',
      cta: 'Conocer Humano SISU para empresas en El Salvador'
    }
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
      inlineTitle: 'Deja de calcular en Excel. Automatiza toda tu nómina.',
      inlineBody:
        'Integra asistencia biométrica y planilla en quetzales. IGSS e ISR con el mismo motor que acabas de usar — sin errores manuales.',
      inlineButton: 'Activar gratis — Guatemala',
      inlineHref: '/activar?country=GTM',
      demoButton: 'Agendar demo',
      footerTitle: '¿Listo para dejar Excel en Guatemala?',
      footerBody:
        'Humano SISU centraliza asistencia, IGSS, ISR y comprobantes para empresas guatemaltecas. Implementación express.',
      footerButton: 'Activar gratis',
      footerHref: '/activar?country=GTM'
    },
    faqs: [
      { question: '¿Cómo calcular sueldo neto en Guatemala?', answer: 'Ingresa tu salario en quetzales, selecciona IGSS e ISR y obtén el neto del período con el motor de nómina de Humano SISU.' },
      { question: '¿La calculadora incluye IGSS?', answer: 'Sí. El rubro IGSS usa la tasa obrero configurada en los parámetros legales del SaaS para Guatemala.' }
    ],
    relatedCalculators: [
      { href: '/calculadora-deducciones', label: 'Calculadora Honduras' },
      { href: '/calculadora-deducciones-el-salvador', label: 'Calculadora El Salvador' }
    ],
    breadcrumbLabel: 'Deducciones Guatemala',
    landingBridge: {
      title: '¿Tu equipo aún concilia IGSS e ISR a mano?',
      body: 'Humano SISU integra asistencia y nómina en quetzales con el mismo motor legal que esta calculadora.',
      href: '/#como-funciona',
      cta: 'Ver la plataforma de nómina para Guatemala'
    }
  }
}
