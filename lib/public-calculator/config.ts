import type { CountryCode } from '../country/supported'
import type { FAQItem } from '../seo/schema'
import { deductionCalculatorPublicPath } from '../marketing/calculator-public-paths'

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
  socialShare: {
    postCalcScript: string
    postCalcButton: string
    networksLabel: string
  }
  landingBridge: {
    titleLead: string
    titleAccent: string
    body: string
    href: string
    cta: string
    shareButton: string
    activarButton: string
    share: {
      sheetTitle: string
      peerLabel: string
      peerScript: string
      bossLabel: string
      copyLabel: string
      copiedLabel: string
      moreOptionsLabel: string
    }
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
    verificationSteps: string[]
    leadCapture: {
      headline: string
      subheadline: string
      softGateTitle: string
      softGateBody: string
    }
  }
}

const BASE = 'https://humanosisu.net'

export const CALCULATOR_OG_IMAGE_PATH = '/og-image.png'
export const CALCULATOR_OG_IMAGE_URL = `${BASE}${CALCULATOR_OG_IMAGE_PATH}`

const CALCULATOR_SOCIAL_SHARE = {
  postCalcScript: 'Acabo de calcular mis deducciones gratis con SISU. Probalo aquí:',
  postCalcButton: 'Compartir',
  networksLabel: 'Compartir en redes',
} as const

const LANDING_BRIDGE_SHARE = {
  shareButton: 'Compartir',
  activarButton: 'Hacer las paces con RR.HH.',
  share: {
    sheetTitle: '¿A quién se lo envías?',
    peerLabel: 'Un colega',
    peerScript:
      'Validé mis deducciones gratis con SISU. Si RR.H.H. te quitó la paz con la planilla, probá esta calculadora:',
    bossLabel: 'Mi jefe / RR.HH.',
    copyLabel: 'Copiar enlace',
    copiedLabel: 'Enlace copiado',
    moreOptionsLabel: 'Más opciones…',
  },
} as const

export const PUBLIC_CALCULATOR_CONFIGS: Record<CountryCode, PublicCalculatorConfig> = {
  HND: {
    countryCode: 'HND',
    path: deductionCalculatorPublicPath('HND'),
    canonicalUrl: `${BASE}${deductionCalculatorPublicPath('HND')}`,
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
      badges: ['Calculadora ISR Honduras', 'Calculadora RAP · Seguro Social', 'Gratis en 30 segundos'],
      headlineLead: 'Deja adivinar tus deducciones.',
      headlineAccent: 'Obten gratis el desgloce que RR.HH. te oculta.',
      subheadline:
        'Ingresa tu salario. Valida deducciones al instante. Impuesto, Aportaciones privadas y Seguro Social según las leyes vigentes de tu país.'
    },
    b2bFunnel: {
      hero: {
        headlineLead: 'Deja adivinar tus deducciones.',
        headlineAccent: 'Obten gratis el desgloce que RR.HH. te oculta.',
        subheadline:
          'Ingresa tu salario. Valida deducciones al instante. Impuesto, Aportaciones privadas y Seguro Social según las leyes vigentes de tu país.',
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
        employeeTitle: 'Empleado',
        bossTitle: 'Dueño /jefe de RR.HH.',
        employeeBody: '',
        bossBody: ''
      },
      stickyConstancia: {
        text: '¿Harto de esperar por tu constancia?',
        ctaLabel: 'Haz clic aquí'
      },
      godfatherKeyword: 'MI CONSTANCIA TARDA UNA ETERNIDAD',
      verificationSteps: [
        'Verificando techos Seguro Social 2026…',
        'Aplicando tablas de retención RAP…',
        'Validando ISR según ley vigente…',
      ],
      leadCapture: {
        headline: 'Recibe tu desglose en PDF oficial',
        subheadline:
          'Reporte detallado Seguro Social, RAP e ISR + guía de cumplimiento. Gratis, sin guardar tu salario en servidores.',
        softGateTitle: 'No pierdas este cálculo de deducciones',
        softGateBody:
          '¿Te enviamos el PDF con tu salario neto y el desglose legal? Es gratis y llega en segundos.',
      },
    },
    defaultDeductions: { ihss: true, rap: true, afp: false, infop: false, isr: true },
    deductionOptions: [
      { key: 'ihss', title: 'Seguro Social', subtitle: 'IHSS', hint: 'Instituto Hondureño de Seguridad Social. 5% hasta el tope.', showInSelector: true, showInResults: true },
      { key: 'rap', title: 'RAP', subtitle: 'Ahorro pensiones', hint: 'FOVIIF: 1.5% sobre el excedente del techo del Seguro Social (IVM).', showInSelector: true, showInResults: true },
      { key: 'afp', title: 'AFP', subtitle: 'Fondo de pensiones', hint: 'En Honduras esta calculadora pública muestra AFP como opción; el cálculo obrero va en 0.', showInSelector: true, showInResults: true },
      { key: 'infop', title: 'INFOP', subtitle: 'Formación (1%)', hint: 'Normalmente aporte patronal. Si lo activas, lo incluimos como 1% del salario.', showInSelector: true, showInResults: true },
      { key: 'isr', title: 'ISR', subtitle: 'Impuesto renta', hint: 'Impuesto progresivo según tablas vigentes.', showInSelector: true, showInResults: true }
    ],
    resultLabels: {
      socialPrimary: 'Seguro Social',
      socialPrimaryLong: '(IHSS — Instituto Hondureño de Seguridad Social)',
      socialPrimaryTooltip: 'Se calcula como el 5% del salario hasta el tope máximo establecido por ley.',
      socialSecondary: 'RAP',
      socialSecondaryLong: '(Régimen de Ahorro para Pensiones)',
      socialSecondaryTooltip: 'Se calcula como el 1.5% sobre el excedente del salario respecto al techo del Seguro Social (IVM).',
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
      line: 'Cálculos basados en leyes vigentes de Honduras',
      minimumWageLabel: 'Salario mínimo',
      ceilingLabel: 'Tope Seguro Social'
    },
    conversion: {
      inlineTitle: 'Deja de calcular en Excel. Automatiza toda tu nómina.',
      inlineBody:
        'Acabas de usar el mismo motor legal que Humano SISU. Del biométrico al comprobante en segundos — Seguro Social, RAP e ISR sin errores manuales.',
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
          'La calculadora RAP estima el aporte obrero al FOVIIF: 1.5% sobre el excedente del techo del Seguro Social (IVM). Puedes activar o desactivar RAP junto con Seguro Social e ISR para ver el total de deducciones.'
      },
      {
        question: '¿Cómo calcular el Seguro Social en Honduras con esta herramienta?',
        answer:
          'El aporte obrero al Seguro Social (IHSS) es el 5% del salario hasta el tope legal del año. La calculadora usa los mismos parámetros que el motor de nómina profesional de Humano SISU.'
      },
      {
        question: '¿Sirve para planilla quincenal y mensual?',
        answer:
          'Sí. Elige modalidad quincenal o mensual; la herramienta prorratea las deducciones de ley para mostrarte el monto del período que estás revisando.'
      }
    ],
    relatedCalculators: [
      { href: deductionCalculatorPublicPath('SLV'), label: 'Calculadora El Salvador' },
      { href: deductionCalculatorPublicPath('GTM'), label: 'Calculadora Guatemala' },
      { href: '/suscripcion', label: 'Newsletter nómina y RRHH' },
    ],
    breadcrumbLabel: 'Deducciones Honduras',
    socialShare: CALCULATOR_SOCIAL_SHARE,
    landingBridge: {
      titleLead: '¿Conoces a un colega que ha perdido la paz con RR.HH.?',
      titleAccent: '¿Eres esa persona?',
      body: 'Ayudamos a dueños y equipos de RRHH a encontrar una forma más pacífica de operar. No sos una máquina de Excel.',
      href: '/activar?country=HND',
      cta: 'Explora SISU',
      ...LANDING_BRIDGE_SHARE,
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
            'El RAP descuenta el 1.5% sobre la parte del salario que excede el techo del Seguro Social (IVM). La calculadora RAP te permite ver ese rubro por separado o junto con Seguro Social e ISR para conocer tu sueldo neto real.'
        },
        {
          heading: 'Seguro Social y salario neto en lempiras',
          body:
            'Además de ISR y RAP, el aporte obrero al Seguro Social (5% con tope) suele ser la otra deducción principal. Al sumar los rubros que correspondan a tu caso, obtienes el total descontado y el neto a recibir — útil para validar tu voucher o negociar con RR.HH.'
        },
        {
          heading: '¿Empresa o empleado?',
          body:
            'Si solo quieres validar tu recibo, basta con la calculadora gratuita. Si gestionas planilla para varios colaboradores, Humano SISU automatiza Seguro Social, RAP e ISR desde la asistencia biométrica hasta el comprobante de pago.'
        }
      ]
    }
  },
  SLV: {
    countryCode: 'SLV',
    path: deductionCalculatorPublicPath('SLV'),
    canonicalUrl: `${BASE}${deductionCalculatorPublicPath('SLV')}`,
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
      badges: ['Seguro Social · AFP · ISR', 'El Salvador · USD', 'Gratis en 30 segundos'],
      headlineLead: 'Deja adivinar tus deducciones.',
      headlineAccent: 'Obten gratis el desgloce que RR.HH. te oculta.',
      subheadline:
        'Ingresa tu salario. Valida deducciones al instante. Impuesto, Aportaciones privadas y Seguro Social según las leyes vigentes de tu país.'
    },
    b2bFunnel: {
      hero: {
        headlineLead: 'Deja adivinar tus deducciones.',
        headlineAccent: 'Obten gratis el desgloce que RR.HH. te oculta.',
        subheadline:
          'Ingresa tu salario. Valida deducciones al instante. Impuesto, Aportaciones privadas y Seguro Social según las leyes vigentes de tu país.',
        authorityLine: 'Parámetros legales vigentes · El Salvador'
      },
      digitalHealth: {
        title: 'Diagnóstico de tu oficina',
        cavemanLabel: 'Modo manual',
        proLabel: 'Modo SISU',
        timeLeakHoursPerMonth: 12,
        constanciaDaysCaveman: '2-4 días',
        constanciaSecondsPro: 2
      },
      trojanHorse: {
        headline: '¿Quieres que RRHH valide tu recibo con este mismo motor?',
        subheadline:
          'Comparte Humano SISU con quien prepara la planilla. Ellos automatizan ISSS, AFP e ISR — tú validas tu sueldo neto en segundos.',
        rrhh: {
          label: 'Enviar desglose validado a RRHH',
          whatsappScript:
            'Hola, validé mis deducciones (ISSS, AFP e ISR) en la calculadora de Humano SISU y vi que automatizan toda la planilla en El Salvador. Les dejo el link por si les sirve validar los recibos:'
        },
        boss: {
          label: 'Enviar recomendación al patrono / gerencia',
          whatsappScript:
            'Hola, usé la calculadora de Humano SISU para validar deducciones de planilla en El Salvador (ISSS, AFP, ISR). Tienen software que conecta asistencia y nómina en USD. Les comparto el link:'
        }
      },
      audience: {
        employeeTitle: 'Empleado',
        bossTitle: 'Dueño /jefe de RR.HH.',
        employeeBody: '',
        bossBody: ''
      },
      stickyConstancia: {
        text: '¿Tu recibo no cuadra con este cálculo?',
        ctaLabel: 'Enviar desglose a RRHH'
      },
      godfatherKeyword: '',
      verificationSteps: [
        'Verificando tope ISSS vigente…',
        'Aplicando aporte AFP (7.25%)…',
        'Validando retención ISR según MH…',
      ],
      leadCapture: {
        headline: 'Recibe tu desglose en PDF oficial',
        subheadline:
          'ISSS, AFP e ISR en USD + resumen de cumplimiento. Gratis — no guardamos tu salario en servidores.',
        softGateTitle: 'No pierdas este cálculo de deducciones',
        softGateBody:
          '¿Te enviamos el PDF con tu sueldo neto en dólares? Es gratis y llega en segundos.',
      },
    },
    defaultDeductions: { ihss: true, rap: true, afp: true, infop: false, isr: true },
    deductionOptions: [
      { key: 'ihss', title: 'Seguro Social', subtitle: 'ISSS', hint: 'Instituto Salvadoreño del Seguro Social. 3% con tope mensual.', showInSelector: true, showInResults: true },
      { key: 'rap', title: 'AFP', subtitle: 'Pensiones', hint: 'Administradora de Fondos de Pensiones. 7.25% sobre salario.', showInSelector: true, showInResults: true },
      { key: 'afp', title: 'AFP', subtitle: 'Alias pensiones', hint: 'Misma deducción que AFP/rap en planilla salvadoreña.', showInSelector: false, showInResults: false },
      { key: 'infop', title: 'INFOP', subtitle: 'No aplica', hint: 'No se incluye en esta calculadora para El Salvador.', showInSelector: false, showInResults: false },
      { key: 'isr', title: 'ISR', subtitle: 'Retención renta', hint: 'Retención mensual según tablas del Ministerio de Hacienda.', showInSelector: true, showInResults: true }
    ],
    resultLabels: {
      socialPrimary: 'Seguro Social',
      socialPrimaryLong: '(ISSS — Instituto Salvadoreño del Seguro Social)',
      socialPrimaryTooltip: 'Aporte obrero con tope mensual según parámetros legales vigentes.',
      socialSecondary: 'AFP',
      socialSecondaryLong: '(Administradora de Fondos de Pensiones)',
      socialSecondaryTooltip: 'Aporte obrero de pensiones calculado sobre el salario mensual.',
      isrLong: '(Impuesto sobre la Renta)',
      isrTooltip: 'Retención mensual en USD según tramos vigentes en El Salvador.'
    },
    trust: {
      line: 'Cálculos basados en leyes vigentes de El Salvador',
      minimumWageLabel: 'Salario mínimo ref.',
      ceilingLabel: 'Tope Seguro Social'
    },
    conversion: {
      inlineTitle: 'Deja de calcular en Excel. Automatiza toda tu nómina.',
      inlineBody:
        'Del reloj biométrico al comprobante en USD. Seguro Social, AFP e ISR con el mismo motor que acabas de usar — sin errores manuales.',
      inlineButton: 'Activar gratis — El Salvador',
      inlineHref: '/activar?country=SLV',
      demoButton: 'Agendar demo',
      footerTitle: '¿Tu empresa aún calcula planilla a mano?',
      footerBody:
        'Humano SISU automatiza asistencia, Seguro Social, AFP e ISR para equipos en El Salvador. Soporte regional en español.',
      footerButton: 'Activar gratis',
      footerHref: '/activar?country=SLV'
    },
    faqs: [
      { question: '¿Cómo usar la calculadora ISR El Salvador?', answer: 'Ingresa tu salario mensual o quincenal en USD, elige las deducciones y obtén Seguro Social, AFP e ISR con el mismo motor de nómina de Humano SISU.' },
      { question: '¿El sueldo neto incluye Seguro Social y AFP?', answer: 'Sí. Puedes activar o desactivar cada rubro. El neto es salario bruto menos Seguro Social, AFP e ISR seleccionados.' }
    ],
    relatedCalculators: [
      { href: deductionCalculatorPublicPath('HND'), label: 'Calculadora Honduras' },
      { href: deductionCalculatorPublicPath('GTM'), label: 'Calculadora Guatemala' },
      { href: '/suscripcion', label: 'Newsletter nómina y RRHH' },
    ],
    breadcrumbLabel: 'Deducciones El Salvador',
    socialShare: CALCULATOR_SOCIAL_SHARE,
    landingBridge: {
      titleLead: '¿Conoces a un colega que ha perdido la paz con RR.HH.?',
      titleAccent: '¿Eres esa persona?',
      body: 'Ayudamos a dueños y equipos de RRHH a encontrar una forma más pacífica de operar. No sos una máquina de Excel.',
      href: '/activar?country=SLV',
      cta: 'Explora SISU',
      ...LANDING_BRIDGE_SHARE,
    },
  },
  GTM: {
    countryCode: 'GTM',
    path: deductionCalculatorPublicPath('GTM'),
    canonicalUrl: `${BASE}${deductionCalculatorPublicPath('GTM')}`,
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
      badges: ['Seguro Social · ISR', 'Guatemala · GTQ', 'Gratis en 30 segundos'],
      headlineLead: 'Deja adivinar tus deducciones.',
      headlineAccent: 'Obten gratis el desgloce que RR.HH. te oculta.',
      subheadline:
        'Ingresa tu salario. Valida deducciones al instante. Impuesto, Aportaciones privadas y Seguro Social según las leyes vigentes de tu país.'
    },
    b2bFunnel: {
      hero: {
        headlineLead: 'Deja adivinar tus deducciones.',
        headlineAccent: 'Obten gratis el desgloce que RR.HH. te oculta.',
        subheadline:
          'Ingresa tu salario. Valida deducciones al instante. Impuesto, Aportaciones privadas y Seguro Social según las leyes vigentes de tu país.',
        authorityLine: 'Parámetros legales vigentes · Guatemala'
      },
      digitalHealth: {
        title: 'Diagnóstico de tu oficina',
        cavemanLabel: 'Modo manual',
        proLabel: 'Modo SISU',
        timeLeakHoursPerMonth: 14,
        constanciaDaysCaveman: '2-5 días',
        constanciaSecondsPro: 2
      },
      trojanHorse: {
        headline: '¿Quieres que RRHH valide tu recibo con este mismo motor?',
        subheadline:
          'Comparte Humano SISU con quien prepara la planilla. Ellos automatizan IGSS e ISR — tú validas tu sueldo neto en quetzales.',
        rrhh: {
          label: 'Enviar desglose validado a RRHH',
          whatsappScript:
            'Hola, validé mis deducciones (IGSS e ISR) en la calculadora de Humano SISU y vi que automatizan toda la planilla en Guatemala. Les dejo el link por si les sirve validar los recibos:'
        },
        boss: {
          label: 'Enviar recomendación a gerencia / patrono',
          whatsappScript:
            'Hola, usé la calculadora de Humano SISU para validar deducciones de planilla en Guatemala (IGSS, ISR). Tienen software que conecta asistencia y nómina en quetzales. Les comparto el link:'
        }
      },
      audience: {
        employeeTitle: 'Empleado',
        bossTitle: 'Dueño /jefe de RR.HH.',
        employeeBody: '',
        bossBody: ''
      },
      stickyConstancia: {
        text: '¿Tu recibo no coincide con este cálculo?',
        ctaLabel: 'Enviar desglose a RRHH'
      },
      godfatherKeyword: '',
      verificationSteps: [
        'Verificando tasa IGSS vigente…',
        'Aplicando base de cotización…',
        'Validando retención ISR según SAT…',
      ],
      leadCapture: {
        headline: 'Recibe tu desglose en PDF oficial',
        subheadline:
          'IGSS e ISR en quetzales + resumen de cumplimiento. Gratis — no guardamos tu salario en servidores.',
        softGateTitle: 'No pierdas este cálculo de deducciones',
        softGateBody:
          '¿Te enviamos el PDF con tu sueldo neto en quetzales? Es gratis y llega en segundos.',
      },
    },
    defaultDeductions: { ihss: true, rap: false, afp: false, infop: false, isr: true },
    deductionOptions: [
      { key: 'ihss', title: 'Seguro Social', subtitle: 'IGSS', hint: 'Instituto Guatemalteco de Seguridad Social. Aporte obrero según tasa vigente.', showInSelector: true, showInResults: true },
      { key: 'rap', title: 'RAP', subtitle: 'No aplica', hint: 'No aplica en Guatemala para esta calculadora.', showInSelector: false, showInResults: false },
      { key: 'afp', title: 'AFP', subtitle: 'No aplica', hint: 'No aplica en Guatemala.', showInSelector: false, showInResults: false },
      { key: 'infop', title: 'INFOP', subtitle: 'No aplica', hint: 'No se incluye en esta calculadora para Guatemala.', showInSelector: false, showInResults: false },
      { key: 'isr', title: 'ISR', subtitle: 'Impuesto renta', hint: 'Retención según modelo anual simplificado vigente.', showInSelector: true, showInResults: true }
    ],
    resultLabels: {
      socialPrimary: 'Seguro Social',
      socialPrimaryLong: '(IGSS — Instituto Guatemalteco de Seguridad Social)',
      socialPrimaryTooltip: 'Aporte obrero de Seguro Social calculado sobre la base mensual.',
      isrLong: '(Impuesto sobre la Renta)',
      isrTooltip: 'Retención mensual en quetzales según parámetros legales configurados.'
    },
    trust: {
      line: 'Cálculos basados en leyes vigentes de Guatemala',
      minimumWageLabel: 'Salario mínimo ref.',
      ceilingLabel: 'Tope Seguro Social'
    },
    conversion: {
      inlineTitle: 'Deja de calcular en Excel. Automatiza toda tu nómina.',
      inlineBody:
        'Integra asistencia biométrica y planilla en quetzales. Seguro Social e ISR con el mismo motor que acabas de usar — sin errores manuales.',
      inlineButton: 'Activar gratis — Guatemala',
      inlineHref: '/activar?country=GTM',
      demoButton: 'Agendar demo',
      footerTitle: '¿Listo para dejar Excel en Guatemala?',
      footerBody:
        'Humano SISU centraliza asistencia, Seguro Social, ISR y comprobantes para empresas guatemaltecas. Implementación express.',
      footerButton: 'Activar gratis',
      footerHref: '/activar?country=GTM'
    },
    faqs: [
      { question: '¿Cómo calcular sueldo neto en Guatemala?', answer: 'Ingresa tu salario en quetzales, selecciona Seguro Social e ISR y obtén el neto del período con el motor de nómina de Humano SISU.' },
      { question: '¿La calculadora incluye Seguro Social?', answer: 'Sí. El rubro de Seguro Social (IGSS) usa la tasa obrero configurada en los parámetros legales del SaaS para Guatemala.' }
    ],
    relatedCalculators: [
      { href: deductionCalculatorPublicPath('HND'), label: 'Calculadora Honduras' },
      { href: deductionCalculatorPublicPath('SLV'), label: 'Calculadora El Salvador' },
      { href: '/suscripcion', label: 'Newsletter nómina y RRHH' },
    ],
    breadcrumbLabel: 'Deducciones Guatemala',
    socialShare: CALCULATOR_SOCIAL_SHARE,
    landingBridge: {
      titleLead: '¿Conoces a un colega que ha perdido la paz con RR.HH.?',
      titleAccent: '¿Eres esa persona?',
      body: 'Ayudamos a dueños y equipos de RRHH a encontrar una forma más pacífica de operar. No sos una máquina de Excel.',
      href: '/activar?country=GTM',
      cta: 'Explora SISU',
      ...LANDING_BRIDGE_SHARE,
    },
  }
}
