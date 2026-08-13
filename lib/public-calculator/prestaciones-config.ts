import type { FAQItem } from '../seo/schema'
import { deductionCalculatorPublicPath } from '../marketing/calculator-public-paths'

export type PrestacionesFunnelConfig = {
  audience: {
    employeeTitle: string
    employeeBody: string
    companyTitle: string
    companyBody: string
  }
  verificationSteps: string[]
  trojanHorse: {
    headline: string
    subheadline: string
    rrhh: { label: string; whatsappScript: string }
    boss: { label: string; whatsappScript: string }
  }
  leadCapture: {
    headline: string
    subheadline: string
    softGateTitle: string
    softGateBody: string
  }
  godfatherKeyword: string
}

export type PublicPrestacionesConfig = {
  path: string
  canonicalUrl: string
  contactStorageKey: string
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
    disclaimer: string
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
  funnel: PrestacionesFunnelConfig
}

const BASE = 'https://humanosisu.net'

export const PUBLIC_PRESTACIONES_CONFIG: PublicPrestacionesConfig = {
  path: '/calculadora-prestaciones',
  canonicalUrl: `${BASE}/calculadora-prestaciones`,
  contactStorageKey: 'public_prestaciones_contact_hnd_v1',
  seo: {
    title: 'Calculadora de prestaciones (Honduras) | Cesantía, preaviso, vacaciones, 13vo, 14vo | Humano SISU',
    description:
      'Calcula tu liquidación laboral en Honduras: cesantía, preaviso, vacaciones y proporcionales de 13vo y 14vo. Motor legal Humano SISU — gratis con PDF.',
    keywords:
      'calculadora prestaciones, cesantía, finiquito, preaviso vacaciones aguinaldo 14vo, norma local Honduras',
    inLanguage: 'es-HN',
  },
  hero: {
    badges: ['Liquidación por finiquito', 'Norma local (HN) · Año 360', 'Desglose por concepto'],
    headlineLead: 'Calculadora de prestaciones laborales',
    headlineAccent: 'Cesantía, preaviso, vacaciones y 13vo/14vo en lempiras.',
    subheadline:
      'Estima tu liquidación con el mismo motor legal que usa la planilla profesional de Humano SISU — gratis en 30 segundos.',
  },
  trust: {
    line: 'Cálculo con año comercial 360 días (Honduras)',
    disclaimer: 'Estimación orientativa según Ley Laboral de Honduras. No sustituye asesoría legal.',
  },
  conversion: {
    inlineTitle: 'Automatiza finiquitos y planilla en tu empresa',
    inlineBody:
      'Humano SISU calcula cesantía, preaviso, vacaciones, 13vo y 14vo para todo tu equipo — desde asistencia biométrica.',
    inlineButton: 'Activar gratis — Honduras',
    inlineHref: '/activar?country=HND',
    demoButton: 'Demo por WhatsApp',
    footerTitle: '¿Tu empresa liquida finiquitos en Excel?',
    footerBody: 'Activa el mismo motor legal que acabas de usar en esta calculadora gratuita.',
    footerButton: 'Activar gratis',
    footerHref: '/activar?country=HND',
  },
  faqs: [],
  relatedCalculators: [
    { href: '/calculadora-aguinaldo-honduras', label: 'Calculadora de aguinaldo' },
    { href: '/calculadora-catorceavo-honduras', label: 'Calculadora de catorceavo' },
    { href: deductionCalculatorPublicPath('HND'), label: 'Calculadora de deducciones' },
    { href: '/suscripcion', label: 'Alertas de sueldo' },
    { href: '/calculadora', label: 'Ver todas las calculadoras' },
  ],
  breadcrumbLabel: 'Prestaciones Honduras',
  funnel: {
    audience: {
      employeeTitle: 'Personal',
      employeeBody: 'Quiero saber cuánto me corresponde de finiquito antes de firmar.',
      companyTitle: 'Empresarial',
      companyBody: 'Liquido a un colaborador o quiero automatizar finiquitos y planilla.',
    },
    verificationSteps: [
      'Calculando antigüedad (año comercial 360)…',
      'Aplicando reglas de cesantía y preaviso…',
      'Validando proporcionales 13vo y 14vo…',
    ],
    trojanHorse: {
      headline: '¿Quieres que RRHH valide tu finiquito con este mismo motor?',
      subheadline:
        'Comparte Humano SISU con quien prepara la liquidación. Ellos automatizan cesantía, vacaciones y planilla — tú validas tu monto.',
      rrhh: {
        label: 'Enviar desglose validado a RRHH',
        whatsappScript:
          'Hola, validé mi liquidación (cesantía, preaviso, vacaciones) en la calculadora de Humano SISU y vi que automatizan finiquitos y toda la planilla en Honduras. Les dejo el link por si les sirve validar los montos:',
      },
      boss: {
        label: 'Enviar recomendación a gerencia / patrono',
        whatsappScript:
          'Hola, usé la calculadora de Humano SISU para estimar mi finiquito en Honduras (cesantía, preaviso, 13vo/14vo). Tienen software que conecta asistencia y nómina. Les comparto el link:',
      },
    },
    leadCapture: {
      headline: 'Recibe tu liquidación en PDF oficial',
      subheadline:
        'Cesantía, preaviso, vacaciones y 13vo/14vo desglosados. Gratis — no guardamos tu salario en servidores.',
      softGateTitle: 'No pierdas este cálculo de finiquito',
      softGateBody: '¿Te enviamos el PDF con tu liquidación estimada? Es gratis y llega en segundos.',
    },
    godfatherKeyword: 'MI FINIQUITO TARDA UNA ETERNIDAD',
  },
}
