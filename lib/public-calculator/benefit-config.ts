import type { FAQItem } from '../seo/schema'

export type BenefitTipo = '13AVO' | '14AVO'

export type BenefitFunnelConfig = {
  audience: {
    employeeTitle: string
    employeeBody: string
    companyTitle: string
    companyBody: string
  }
  verificationSteps: string[]
  leadCapture: {
    headline: string
    subheadline: string
    softGateTitle: string
    softGateBody: string
  }
}

export type PublicBenefitCalculatorConfig = {
  tipo: BenefitTipo
  path: string
  canonicalUrl: string
  contactStorageKey: string
  leadSource: 'aguinaldo' | 'catorceavo'
  label: string
  labelShort: string
  periodDescription: string
  paymentDeadline: string
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
  trust: {
    line: string
    noDeductionsLine: string
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
  funnel: BenefitFunnelConfig
}

const BASE = 'https://humanosisu.net'

const SHARED_CONVERSION = {
  inlineButton: 'Activar gratis — Honduras',
  inlineHref: '/activar?country=HND',
  demoButton: 'Demo por WhatsApp',
  footerButton: 'Activar gratis',
  footerHref: '/activar?country=HND',
}

const SHARED_FUNNEL_BASE = {
  audience: {
    employeeTitle: 'Soy empleado',
    employeeBody: 'Quiero validar cuánto me corresponde de este beneficio.',
    companyTitle: 'Soy empresa / RRHH',
    companyBody: 'Calculo para mi equipo o quiero automatizar la planilla.',
  },
  verificationSteps: [
    'Verificando calendario comercial 360 días…',
    'Aplicando período legal del beneficio…',
    'Validando reglas sin deducciones ISR/SS…',
  ],
}

export const PUBLIC_BENEFIT_CONFIGS: Record<BenefitTipo, PublicBenefitCalculatorConfig> = {
  '13AVO': {
    tipo: '13AVO',
    path: '/calculadora-aguinaldo-honduras',
    canonicalUrl: `${BASE}/calculadora-aguinaldo-honduras`,
    contactStorageKey: 'public_aguinaldo_contact_hnd_v1',
    leadSource: 'aguinaldo',
    label: 'Aguinaldo (13vo)',
    labelShort: 'Aguinaldo',
    periodDescription: '1 de enero al 31 de diciembre del año en curso',
    paymentDeadline: '15 de diciembre',
    seo: {
      title: 'Calculadora de Aguinaldo Honduras | 13vo | Humano SISU',
      description:
        'Calculadora de aguinaldo Honduras gratis. Calcula tu 13vo proporcional o anual con calendario 360. Sin deducciones de ley. Motor Humano SISU.',
      keywords:
        'calculadora aguinaldo Honduras, 13vo salario, décimo tercer mes, sueldo Honduras, Humano SISU',
      inLanguage: 'es-HN',
    },
    hero: {
      badges: ['13vo · Aguinaldo', 'Honduras · HNL', 'Gratis en 30 segundos'],
      headlineLead: '¿Cuánto te toca de aguinaldo?',
      headlineAccent: 'Calcula tu 13vo al instante.',
      subheadline:
        'Ingresa tu salario y fechas. Misma lógica legal que la planilla profesional de Humano SISU — sin deducciones de ISR, Seguro Social ni RAP.',
    },
    trust: {
      line: '✓ Cálculo con año comercial 360 días (Honduras)',
      noDeductionsLine: 'El aguinaldo no lleva deducciones de ISR, Seguro Social ni RAP.',
    },
    conversion: {
      inlineTitle: 'Automatiza el 13vo en tu empresa',
      inlineBody: 'Humano SISU calcula aguinaldo, catorceavo y planilla completa desde la asistencia biométrica.',
      ...SHARED_CONVERSION,
      footerTitle: '¿Tu empresa aún calcula el 13vo en Excel?',
      footerBody: 'Activa el mismo motor legal que acabas de usar en esta calculadora gratuita.',
    },
    faqs: [
      {
        question: '¿Se descuenta IHSS o ISR del aguinaldo?',
        answer:
          'No. El Decreto 112-82 prohíbe deducciones de ISR, Seguro Social (IHSS) y RAP sobre el 13vo. Solo procede retención por pensión alimenticia con orden judicial.',
      },
      {
        question: '¿Cómo se calcula el aguinaldo proporcional?',
        answer:
          'Se divide el salario mensual entre 360 y se multiplica por los días trabajados en el período del 1 de enero al 31 de diciembre (año comercial).',
      },
      {
        question: '¿Cuándo debe pagarse el aguinaldo?',
        answer: 'La ley establece pago antes del 15 de diciembre de cada año.',
      },
    ],
    relatedCalculators: [
      { href: '/calculadora-catorceavo-honduras', label: 'Calculadora Catorceavo' },
      { href: '/calculadora-prestaciones', label: 'Calculadora de finiquito' },
      { href: '/calculadora-deducciones', label: 'Calculadora de deducciones' },
      {
        href: '/recursos/cumplimiento-legal-errores-13vo-14vo-salario',
        label: 'Errores comunes 13vo y 14vo',
      },
    ],
    breadcrumbLabel: 'Aguinaldo Honduras',
    funnel: {
      ...SHARED_FUNNEL_BASE,
      leadCapture: {
        headline: 'Recibe tu aguinaldo en PDF oficial',
        subheadline:
          'Desglose legal + recordatorio de pago antes del 15 de diciembre. Gratis, sin guardar tu salario en servidores.',
        softGateTitle: 'No pierdas este cálculo de aguinaldo',
        softGateBody:
          '¿Te enviamos el PDF y un recordatorio legal antes del 15 de diciembre? Es gratis.',
      },
    },
  },
  '14AVO': {
    tipo: '14AVO',
    path: '/calculadora-catorceavo-honduras',
    canonicalUrl: `${BASE}/calculadora-catorceavo-honduras`,
    contactStorageKey: 'public_catorceavo_contact_hnd_v1',
    leadSource: 'catorceavo',
    label: 'Catorceavo (14vo)',
    labelShort: 'Catorceavo',
    periodDescription: '1 de julio al 30 de junio (ciclo jul–jun)',
    paymentDeadline: '30 de junio',
    seo: {
      title: 'Calculadora de Catorceavo Honduras | 14vo | Humano SISU',
      description:
        'Calculadora de catorceavo Honduras gratis. Calcula tu 14vo con calendario 360 y regla de 200 días. Sin deducciones. Motor Humano SISU.',
      keywords:
        'calculadora catorceavo Honduras, 14vo salario, décimo cuarto mes, sueldo Honduras, Humano SISU',
      inLanguage: 'es-HN',
    },
    hero: {
      badges: ['14vo · Catorceavo', 'Honduras · HNL', 'Gratis en 30 segundos'],
      headlineLead: '¿Cuánto te toca de catorceavo?',
      headlineAccent: 'Calcula tu 14vo al instante.',
      subheadline:
        'Período julio–junio, calendario comercial 360. Valida tu monto antes del pago del 30 de junio — sin deducciones de ley.',
    },
    trust: {
      line: '✓ Incluye aviso si no alcanzas 200 días para pago anual íntegro',
      noDeductionsLine: 'El catorceavo no lleva deducciones de ISR, Seguro Social ni RAP.',
    },
    conversion: {
      inlineTitle: 'Automatiza el 14vo en tu empresa',
      inlineBody: 'Humano SISU integra asistencia, 13vo, 14vo y nómina en un solo flujo legal.',
      ...SHARED_CONVERSION,
      footerTitle: '¿Concilias el 14vo a mano cada junio?',
      footerBody: 'Deja Excel: activa Humano SISU con el mismo motor que esta calculadora.',
    },
    faqs: [
      {
        question: '¿Cuánto me toca de 14vo si renuncio en mayo?',
        answer:
          'Te corresponde la parte proporcional desde el 1 de julio del ciclo vigente hasta tu fecha de salida. La calculadora aplica (Salario ÷ 360) × días acumulados.',
      },
      {
        question: '¿Qué significa la regla de 200 días?',
        answer:
          'Para el pago anual íntegro del 14vo se requiere haber trabajado al menos 200 días en el ciclo jul–jun. En finiquito o proporcional igual se paga lo devengado.',
      },
      {
        question: '¿Se descuenta algo del catorceavo?',
        answer:
          'No aplica ISR, Seguro Social ni RAP. Solo pensión alimenticia con resolución judicial.',
      },
    ],
    relatedCalculators: [
      { href: '/calculadora-aguinaldo-honduras', label: 'Calculadora Aguinaldo' },
      { href: '/calculadora-prestaciones', label: 'Calculadora de finiquito' },
      { href: '/calculadora-deducciones', label: 'Calculadora de deducciones' },
      {
        href: '/recursos/cumplimiento-legal-errores-13vo-14vo-salario',
        label: 'Errores comunes 13vo y 14vo',
      },
    ],
    breadcrumbLabel: 'Catorceavo Honduras',
    funnel: {
      ...SHARED_FUNNEL_BASE,
      leadCapture: {
        headline: 'Recibe tu catorceavo en PDF oficial',
        subheadline:
          'Desglose legal + calendario de pago antes del 30 de junio. Gratis y confidencial.',
        softGateTitle: 'No pierdas este cálculo de catorceavo',
        softGateBody:
          '¿Te enviamos el PDF y un recordatorio legal antes del 30 de junio? Es gratis.',
      },
    },
  },
}
