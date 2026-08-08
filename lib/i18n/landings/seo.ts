import type { LandingLocale } from '../locale'

export type SeoLandingKey =
  | 'alternativaOdoo'
  | 'biometricoNomina'
  | 'implementacion48h'
  | 'deduccionesHonduras'

export type SeoFaq = { question: string; answer: string }
export type SeoBreadcrumb = { name: string; url: string }

type SeoHero = {
  badges: string[]
  h1Lead: string
  h1Accent: string
  lead: string
}

type SeoCta = {
  primary: string
  secondary?: string
}

type AlternativaOdooCopy = {
  pageTitle: string
  pageDescription: string
  metaKeywords: string
  hero: SeoHero
  heroCta: SeoCta
  comparisonTitle: string
  comparisonTableHeaders: { feature: string; humanoSisu: string; odoo: string }
  comparisonFeatures: {
    feature: string
    humanoSisu: boolean | string
    odoo: boolean | string
    description: string
  }[]
  whyTitle: string
  whyCards: { title: string; body: string; icon: string }[]
  faqTitle: string
  faqs: SeoFaq[]
  breadcrumbs: SeoBreadcrumb[]
  ctaSection: { title: string; lead: string; primary: string; secondary: string }
  migration: {
    title: string
    lead: string
    items: string[]
    cta: string
  }
}

type BiometricoNominaCopy = {
  pageTitle: string
  pageDescription: string
  metaKeywords: string
  hero: SeoHero
  heroCta: string
  problemTitle: string
  problemItems: string[]
  solutionTitle: string
  solutionItems: string[]
  benefitsTitle: string
  benefits: { title: string; description: string; icon: string }[]
  howTitle: string
  steps: { title: string; description: string }[]
  useCasesTitle: string
  useCases: { title: string; description: string; example: string }[]
  faqTitle: string
  faqs: SeoFaq[]
  breadcrumbs: SeoBreadcrumb[]
  ctaSection: { title: string; lead: string; primary: string }
}

type Implementacion48hCopy = {
  pageTitle: string
  pageDescription: string
  metaKeywords: string
  hero: SeoHero
  heroCta: string
  othersTitle: string
  othersItems: { label?: string; text: string }[]
  sisuTitle: string
  sisuItems: string[]
  processTitle: string
  steps: { time: string; title: string; description: string; icon: string }[]
  guaranteesTitle: string
  testimonialsTitle: string
  testimonials: { name: string; company: string; quote: string; time: string }[]
  faqTitle: string
  faqs: SeoFaq[]
  breadcrumbs: SeoBreadcrumb[]
  ctaSection: { title: string; lead: string; primary: string; secondary: string }
}

type DeduccionesHondurasCopy = {
  pageTitle: string
  pageDescription: string
  metaKeywords: string
  hero: SeoHero
  heroCta: SeoCta
  whatTitle: string
  deductions: { icon: string; title: string; fullName: string; body: string }[]
  comparisonTitle: string
  comparisonTableHeaders: { aspect: string; excel: string; humanoSisu: string }
  comparison: { aspect: string; excel: string; humanoSisu: string; icon: string }[]
  howTitle: string
  howItems: { title: string; body: string }[]
  faqTitle: string
  faqs: SeoFaq[]
  breadcrumbs: SeoBreadcrumb[]
  ctaSection: { title: string; lead: string; primary: string; secondary: string }
}

export type SeoLandingCopyMap = {
  alternativaOdoo: AlternativaOdooCopy
  biometricoNomina: BiometricoNominaCopy
  implementacion48h: Implementacion48hCopy
  deduccionesHonduras: DeduccionesHondurasCopy
}

const alternativaOdooByLocale: Record<LandingLocale, AlternativaOdooCopy> = {
  es: {
    pageTitle: 'Software RH regional | Biométrico, nómina y ley local | Humano SISU',
    pageDescription:
      'Olvida las hojas de cálculo. Deducciones de ley (IHSS, RAP, INFOP) con activación inmediata y soporte en tu país. Prueba gratis ahora.',
    metaKeywords:
      'alternativa a Odoo El Salvador Guatemala Honduras, Odoo vs nómina regional, MIPYMES Centroamérica, sistema nómina local',
    hero: {
      badges: ['Regional · SV, GT, HN', '⚡ 72h vs Semanas', '🔐 Biométrico Integrado', '🎁 30 días gratis'],
      h1Lead: 'El software de RH para tu operación local que integra todo:',
      h1Accent: 'Biométrico, Nómina y Ley.',
      lead: 'Olvida las hojas de cálculo. Automatizamos tus deducciones de ley según el país con activación inmediata y soporte local.',
    },
    heroCta: { primary: 'Prueba gratis ahora', secondary: 'Compara con Odoo Gratis' },
    comparisonTitle: 'Odoo vs Humano SISU: Comparación Directa',
    comparisonTableHeaders: { feature: 'Característica', humanoSisu: 'Humano SISU', odoo: 'Odoo' },
    comparisonFeatures: [
      {
        feature: 'Biométrico integrado',
        humanoSisu: true,
        odoo: false,
        description: 'Control de asistencia biométrico nativo integrado con nómina',
      },
      {
        feature: 'Localización por país (SV, GT, HN)',
        humanoSisu: true,
        odoo: false,
        description: 'Deducciones y nómina según normativa local vigente en cada país',
      },
      {
        feature: 'Tiempo de implementación',
        humanoSisu: 'Hasta 72 h',
        odoo: '2-8 semanas',
        description: 'Configuración y puesta en marcha (plazos según alcance acordado)',
      },
      {
        feature: 'Costo de implementación',
        humanoSisu: 'Incluido',
        odoo: 'Alto (consultoría requerida)',
        description: 'Costo inicial de setup',
      },
      {
        feature: 'Complejidad de uso',
        humanoSisu: 'Simple',
        odoo: 'Complejo',
        description: 'Curva de aprendizaje',
      },
      {
        feature: 'Soporte en español',
        humanoSisu: true,
        odoo: true,
        description: 'Atención al cliente',
      },
      {
        feature: 'Enfoque MIPYMES',
        humanoSisu: true,
        odoo: false,
        description: 'Diseñado específicamente para pequeñas y medianas empresas',
      },
    ],
    whyTitle: '¿Por qué elegir Humano SISU sobre Odoo?',
    whyCards: [
      {
        icon: '🔐',
        title: 'Biométrico Integrado',
        body: 'Odoo no tiene integración biométrica nativa. Humano SISU incluye control de asistencia biométrico integrado con nómina en un solo sistema.',
      },
      {
        icon: '🇭🇳',
        title: 'Localización profunda',
        body: 'Odoo es genérico y requiere configuración compleja. Humano SISU viene preconfigurado con deducciones y reglas nacionales para El Salvador, Guatemala y Honduras.',
      },
      {
        icon: '⚡',
        title: 'Puesta en marcha express vs semanas',
        body: 'Odoo suele tardar semanas o meses en implementarse. Con Humano SISU la activación es inmediata y la implementación biométrica queda lista en 72 horas o menos cuando el alcance y los datos acordados están listos.',
      },
    ],
    faqTitle: 'Preguntas Frecuentes',
    faqs: [
      {
        question: '¿Humano SISU reemplaza a Odoo por completo?',
        answer:
          'Humano SISU está enfocado en RH: asistencia, nómina y cumplimiento legal local. Si usas Odoo para inventario o contabilidad, puedes mantenerlo y usar Humano SISU solo para recursos humanos.',
      },
      {
        question: '¿Odoo calcula bien IHSS, RAP e ISR en Honduras?',
        answer:
          'Odoo es un ERP genérico; la nómina local en Centroamérica suele requerir módulos, consultoría y ajustes manuales. Humano SISU viene preconfigurado con deducciones y tablas vigentes para HN, SV y GT.',
      },
      {
        question: '¿Cuánto tarda implementar Odoo vs Humano SISU?',
        answer:
          'Odoo en nómina local suele tardar de 2 a 8 semanas con consultoría. Humano SISU ofrece activación inmediata e implementación biométrica en 72 horas o menos cuando el alcance y los datos acordados están listos.',
      },
      {
        question: '¿Puedo migrar desde Odoo sin perder datos?',
        answer:
          'Sí. Importamos empleados e historial de nómina disponible y te acompañamos durante la transición, con capacitación incluida.',
      },
      {
        question: '¿Para qué tipo de empresa conviene Humano SISU sobre Odoo?',
        answer:
          'Para MIPYMES que necesitan RH simple, biométrico integrado y cumplimiento local sin la complejidad ni el costo de implementación de un ERP completo.',
      },
    ],
    breadcrumbs: [
      { name: 'Inicio', url: '/' },
      { name: 'Software RH regional', url: '/alternativa-odoo-honduras' },
    ],
    ctaSection: {
      title: '¿Listo para hacer el cambio?',
      lead: 'Prueba Humano SISU gratis por 30 días. Sin tarjeta de crédito. Sin compromiso.',
      primary: 'Comenzar Prueba Gratis',
      secondary: 'Hablar con un Experto',
    },
    migration: {
      title: 'Migración desde Odoo',
      lead: 'Si actualmente usas Odoo y buscas una solución más simple, rápida y específica para tu país en la región, podemos ayudarte a migrar tus datos.',
      items: [
        'Migración de datos de empleados',
        'Importación de historial de nómina',
        'Soporte durante la transición',
        'Capacitación incluida',
      ],
      cta: 'Solicitar Migración',
    },
  },
  en: {
    pageTitle: 'Regional HR software | Biometrics, payroll & local law | Humano SISU',
    pageDescription:
      'Skip the spreadsheets. Statutory deductions with instant activation and local support. Try free now.',
    metaKeywords:
      'Odoo alternative El Salvador Guatemala Honduras, Odoo vs regional payroll, SMB Central America, local payroll system',
    hero: {
      badges: ['Regional · SV, GT, HN', '⚡ 72h vs Weeks', '🔐 Integrated biometrics', '🎁 30 days free'],
      h1Lead: 'The HR software for your local operation that integrates everything:',
      h1Accent: 'Biometrics, Payroll, and Law.',
      lead: 'Forget spreadsheets. We automate statutory deductions by country with instant activation and local support.',
    },
    heroCta: { primary: 'Try free now', secondary: 'Compare with Odoo free' },
    comparisonTitle: 'Odoo vs Humano SISU: Direct comparison',
    comparisonTableHeaders: { feature: 'Feature', humanoSisu: 'Humano SISU', odoo: 'Odoo' },
    comparisonFeatures: [
      {
        feature: 'Integrated biometrics',
        humanoSisu: true,
        odoo: false,
        description: 'Native biometric attendance control integrated with payroll',
      },
      {
        feature: 'Country localization (SV, GT, HN)',
        humanoSisu: true,
        odoo: false,
        description: 'Deductions and payroll per current local rules in each country',
      },
      {
        feature: 'Implementation time',
        humanoSisu: 'Up to 72 h',
        odoo: '2-8 weeks',
        description: 'Setup and go-live (timelines per agreed scope)',
      },
      {
        feature: 'Implementation cost',
        humanoSisu: 'Included',
        odoo: 'High (consulting required)',
        description: 'Initial setup cost',
      },
      {
        feature: 'Ease of use',
        humanoSisu: 'Simple',
        odoo: 'Complex',
        description: 'Learning curve',
      },
      {
        feature: 'Spanish support',
        humanoSisu: true,
        odoo: true,
        description: 'Customer support',
      },
      {
        feature: 'SMB focus',
        humanoSisu: true,
        odoo: false,
        description: 'Built specifically for small and mid-size businesses',
      },
    ],
    whyTitle: 'Why choose Humano SISU over Odoo?',
    whyCards: [
      {
        icon: '🔐',
        title: 'Integrated biometrics',
        body: 'Odoo has no native biometric integration. Humano SISU includes biometric attendance control integrated with payroll in one system.',
      },
      {
        icon: '🇭🇳',
        title: 'Deep localization',
        body: 'Odoo is generic and needs complex setup. Humano SISU ships preconfigured with national deductions and rules for El Salvador, Guatemala, and Honduras.',
      },
      {
        icon: '⚡',
        title: 'Express go-live vs weeks',
        body: 'Odoo often takes weeks or months to implement. With Humano SISU activation is immediate and biometric implementation is ready in 72 hours or less when scope and agreed data are ready.',
      },
    ],
    faqTitle: 'Frequently asked questions',
    faqs: [
      {
        question: 'Does Humano SISU fully replace Odoo?',
        answer:
          'Humano SISU focuses on HR: attendance, payroll, and local legal compliance. If you use Odoo for inventory or accounting, you can keep it and use Humano SISU only for human resources.',
      },
      {
        question: 'Does Odoo calculate IHSS, RAP, and income tax well in Honduras?',
        answer:
          'Odoo is a generic ERP; local payroll in Central America usually needs modules, consulting, and manual tweaks. Humano SISU ships preconfigured with current deductions and tables for HN, SV, and GT.',
      },
      {
        question: 'How long does Odoo take vs Humano SISU?',
        answer:
          'Local payroll on Odoo often takes 2–8 weeks with consulting. Humano SISU offers instant activation and biometric implementation in 72 hours or less when scope and agreed data are ready.',
      },
      {
        question: 'Can I migrate from Odoo without losing data?',
        answer:
          'Yes. We import employees and available payroll history and support you through the transition, with training included.',
      },
      {
        question: 'What kind of company should pick Humano SISU over Odoo?',
        answer:
          'SMBs that need simple HR, integrated biometrics, and local compliance without the complexity or implementation cost of a full ERP.',
      },
    ],
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Regional HR software', url: '/alternativa-odoo-honduras' },
    ],
    ctaSection: {
      title: 'Ready to make the switch?',
      lead: 'Try Humano SISU free for 30 days. No credit card. No commitment.',
      primary: 'Start free trial',
      secondary: 'Talk to an expert',
    },
    migration: {
      title: 'Migration from Odoo',
      lead: 'If you currently use Odoo and want a simpler, faster solution tailored to your country in the region, we can help migrate your data.',
      items: [
        'Employee data migration',
        'Payroll history import',
        'Support during the transition',
        'Training included',
      ],
      cta: 'Request migration',
    },
  },
}

const biometricoNominaByLocale: Record<LandingLocale, BiometricoNominaCopy> = {
  es: {
    pageTitle: 'Sistema biométrico + nómina | HN, SV y GT | Humano SISU',
    pageDescription:
      'Integra tus biométricos con software regional. Automatiza deducciones y nómina local. Sin cálculos manuales, sin errores. Activar gratis hoy.',
    metaKeywords:
      'sistema biométrico con nómina, control asistencia biométrico, biométrico integrado nómina, asistencia nómina El Salvador Guatemala Honduras',
    hero: {
      badges: ['🔐 Biométrico Integrado', '⚡ Tiempo Real', '✅ Sin Errores', '🎁 30 días gratis'],
      h1Lead: 'Sistema biométrico + nómina en un solo flujo:',
      h1Accent: 'asistencia real, planilla automática.',
      lead: 'Integra tus biométricos con nuestro software regional. Automatiza deducciones y nómina local mientras tu equipo se enfoca en crecer.',
    },
    heroCta: 'Activar gratis hoy - Sin tarjeta de crédito',
    problemTitle: '❌ Sistemas Separados',
    problemItems: [
      'Tienes que usar dos sistemas diferentes',
      'Ingresar datos manualmente entre sistemas',
      'Errores de transcripción',
      'Más costos de licencias',
      'Más tiempo de capacitación',
    ],
    solutionTitle: '✅ Humano SISU Integrado',
    solutionItems: [
      'Un solo sistema para todo',
      'Datos fluyen automáticamente',
      'Cero errores manuales',
      'Un solo costo de licencia',
      'Capacitación simple y rápida',
    ],
    benefitsTitle: 'Ventajas de la Integración Biométrico + Nómina',
    benefits: [
      {
        title: 'Todo en Uno',
        description: 'No necesitas dos sistemas separados. El biométrico y la nómina están completamente integrados.',
        icon: '🔗',
      },
      {
        title: 'Datos en Tiempo Real',
        description: 'Las checadas se registran automáticamente y se reflejan inmediatamente en la nómina.',
        icon: '⚡',
      },
      {
        title: 'Sin Errores Manuales',
        description: 'Elimina la necesidad de ingresar datos manualmente. Todo es automático y preciso.',
        icon: '✅',
      },
      {
        title: 'Ahorro de Tiempo',
        description: 'Ya no pierdes horas calculando horas trabajadas. El sistema lo hace automáticamente.',
        icon: '⏰',
      },
      {
        title: 'Cumplimiento Legal',
        description: 'Registros de asistencia auditables según STSS. Todo queda documentado automáticamente.',
        icon: '📋',
      },
      {
        title: 'Antifraude',
        description: 'Reconocimiento facial y biométrico previene suplantación y fraude en asistencia.',
        icon: '🔒',
      },
    ],
    howTitle: '¿Cómo Funciona?',
    steps: [
      {
        title: 'Empleado checa en el dispositivo biométrico',
        description: 'Reconocimiento facial o huella dactilar. Registro instantáneo y seguro.',
      },
      {
        title: 'Datos se sincronizan automáticamente',
        description: 'Las horas trabajadas se calculan automáticamente en tiempo real.',
      },
      {
        title: 'Nómina se genera automáticamente',
        description: 'Con las horas trabajadas, se calcula IHSS, RAP, ISR y se genera la nómina completa.',
      },
      {
        title: 'Comprobantes se envían automáticamente',
        description: 'Cada empleado recibe su voucher por email o WhatsApp automáticamente.',
      },
    ],
    useCasesTitle: 'Casos de Éxito',
    useCases: [
      {
        title: 'Restaurantes',
        description: 'Control de asistencia de meseros, cocineros y personal de turnos rotativos.',
        example: 'Restaurante Tonys Mar - 40 empleados',
      },
      {
        title: 'Manufactura',
        description: 'Registro preciso de horas trabajadas para cálculo de horas extras y producción.',
        example: 'Prohalca - 37 empleados',
      },
      {
        title: 'Oficinas',
        description: 'Control de asistencia de personal administrativo con reportes automáticos.',
        example: 'Despachos legales - 15 empleados',
      },
    ],
    faqTitle: 'Preguntas Frecuentes',
    faqs: [
      {
        question: '¿Puedo usar mi biométrico actual con Humano SISU?',
        answer:
          'Sí. Humano SISU se integra con dispositivos biométricos compatibles (por ejemplo Hikvision y otros vía nuestro conector). Si aún no tienes equipo, puedes registrar asistencia manualmente o desde la app. Validamos compatibilidad durante la implementación.',
      },
      {
        question: '¿Las horas del biométrico pasan solas a la nómina?',
        answer:
          'Sí. Las checadas alimentan el módulo de asistencia y, al generar planilla, el sistema calcula horas ordinarias y extras según la jornada configurada, sin reingreso manual entre sistemas.',
      },
      {
        question: '¿Qué pasa si falla el biométrico o no hay internet?',
        answer:
          'Las checadas pueden quedar en el dispositivo y sincronizarse al restablecer conexión. Mientras tanto puedes registrar asistencia manualmente en Humano SISU sin detener el cálculo de nómina.',
      },
      {
        question: '¿Funciona en Honduras, El Salvador y Guatemala?',
        answer:
          'Sí. La plataforma está localizada para HN, SV y GT: deducciones de ley, jornadas y reglas de asistencia según el país de tu empresa.',
      },
      {
        question: '¿Necesito pagar dos sistemas (biométrico y nómina)?',
        answer:
          'No. Asistencia y nómina viven en una sola plataforma y una sola suscripción. Evitas licencias duplicadas y errores al pasar datos entre herramientas.',
      },
    ],
    breadcrumbs: [
      { name: 'Inicio', url: '/' },
      { name: 'Sistema biométrico con nómina', url: '/sistema-biometrico-nomina' },
    ],
    ctaSection: {
      title: '¿Listo para integrar biométrico y nómina?',
      lead: 'Prueba Humano SISU gratis por 30 días. Sin tarjeta de crédito.',
      primary: 'Comenzar Prueba Gratis',
    },
  },
  en: {
    pageTitle: 'Biometric + payroll system | HN, SV & GT | Humano SISU',
    pageDescription:
      'Connect your biometrics to regional software. Automate local deductions and payroll. No manual math, no errors. Activate free today.',
    metaKeywords:
      'biometric payroll system, biometric attendance control, biometrics integrated payroll, attendance payroll El Salvador Guatemala Honduras',
    hero: {
      badges: ['🔐 Integrated biometrics', '⚡ Real time', '✅ Error-free', '🎁 30 days free'],
      h1Lead: 'Biometric system + payroll in one flow:',
      h1Accent: 'real attendance, automatic payroll.',
      lead: 'Connect your biometrics to our regional software. Automate local deductions and payroll while your team focuses on growth.',
    },
    heroCta: 'Activate free today — no credit card',
    problemTitle: '❌ Separate systems',
    problemItems: [
      'You have to use two different systems',
      'Enter data manually between systems',
      'Transcription errors',
      'Higher license costs',
      'More training time',
    ],
    solutionTitle: '✅ Integrated Humano SISU',
    solutionItems: [
      'One system for everything',
      'Data flows automatically',
      'Zero manual errors',
      'A single license cost',
      'Simple, fast training',
    ],
    benefitsTitle: 'Benefits of biometric + payroll integration',
    benefits: [
      {
        title: 'All in one',
        description: 'You do not need two separate systems. Biometrics and payroll are fully integrated.',
        icon: '🔗',
      },
      {
        title: 'Real-time data',
        description: 'Punches are recorded automatically and reflected immediately in payroll.',
        icon: '⚡',
      },
      {
        title: 'No manual errors',
        description: 'Eliminate manual data entry. Everything is automatic and accurate.',
        icon: '✅',
      },
      {
        title: 'Time savings',
        description: 'Stop spending hours calculating worked time. The system does it automatically.',
        icon: '⏰',
      },
      {
        title: 'Legal compliance',
        description: 'Auditable attendance records per labor rules. Everything is documented automatically.',
        icon: '📋',
      },
      {
        title: 'Anti-fraud',
        description: 'Facial and biometric recognition helps prevent buddy punching and attendance fraud.',
        icon: '🔒',
      },
    ],
    howTitle: 'How it works',
    steps: [
      {
        title: 'Employee clocks in on the biometric device',
        description: 'Face or fingerprint recognition. Instant, secure punch.',
      },
      {
        title: 'Data syncs automatically',
        description: 'Hours worked are calculated automatically in real time.',
      },
      {
        title: 'Payroll generates automatically',
        description: 'With hours worked, IHSS, RAP, income tax are calculated and full payroll is generated.',
      },
      {
        title: 'Vouchers send automatically',
        description: 'Each employee receives their voucher by email or WhatsApp automatically.',
      },
    ],
    useCasesTitle: 'Success stories',
    useCases: [
      {
        title: 'Restaurants',
        description: 'Attendance control for waitstaff, kitchen, and rotating shifts.',
        example: 'Restaurante Tonys Mar — 40 employees',
      },
      {
        title: 'Manufacturing',
        description: 'Precise hours for overtime and production payroll.',
        example: 'Prohalca — 37 employees',
      },
      {
        title: 'Offices',
        description: 'Admin attendance control with automatic reports.',
        example: 'Law offices — 15 employees',
      },
    ],
    faqTitle: 'Frequently asked questions',
    faqs: [
      {
        question: 'Can I use my current biometric device with Humano SISU?',
        answer:
          'Yes. Humano SISU integrates with compatible biometric devices (e.g. Hikvision and others via our connector). If you do not have hardware yet, you can log attendance manually or from the app. We validate compatibility during implementation.',
      },
      {
        question: 'Do biometric hours flow into payroll automatically?',
        answer:
          'Yes. Punches feed the attendance module and, when you generate payroll, the system calculates ordinary and overtime hours per the configured schedule — no re-entry between systems.',
      },
      {
        question: 'What if the biometric fails or there is no internet?',
        answer:
          'Punches can stay on the device and sync when connectivity returns. Meanwhile you can log attendance manually in Humano SISU without stopping payroll calculation.',
      },
      {
        question: 'Does it work in Honduras, El Salvador, and Guatemala?',
        answer:
          'Yes. The platform is localized for HN, SV, and GT: statutory deductions, schedules, and attendance rules for your company’s country.',
      },
      {
        question: 'Do I need to pay for two systems (biometrics and payroll)?',
        answer:
          'No. Attendance and payroll live in one platform and one subscription. You avoid duplicate licenses and errors moving data between tools.',
      },
    ],
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Biometric system with payroll', url: '/sistema-biometrico-nomina' },
    ],
    ctaSection: {
      title: 'Ready to integrate biometrics and payroll?',
      lead: 'Try Humano SISU free for 30 days. No credit card.',
      primary: 'Start free trial',
    },
  },
}

const implementacion48hByLocale: Record<LandingLocale, Implementacion48hCopy> = {
  es: {
    pageTitle: 'Automatiza asistencia y payroll | Ahorra horas | Humano SISU',
    pageDescription:
      'Activación inmediata y biométrico en 72 h. Migración, capacitación y garantía de 30 días incluidas. Humano SISU.',
    metaKeywords:
      'implementación nómina express, sistema nómina rápido regional, implementación rápida nómina, setup nómina El Salvador Guatemala Honduras',
    hero: {
      badges: [
        '⚡ Activación inmediata',
        '🔐 Biométrico en 72 h',
        '👥 Sin límite de usuarios',
        '💰 30 días dinero de regreso',
      ],
      h1Lead: 'Multiplica el valor de tu equipo:',
      h1Accent: 'Automatiza la asistencia y el payroll hoy.',
      lead: 'Del biométrico al comprobante de pago en segundos. Ahorra horas de trabajo administrativo y elimina la resistencia al cambio con una plataforma intuitiva.',
    },
    heroCta: 'Solicitar cotización',
    othersTitle: '❌ Otros Sistemas',
    othersItems: [
      { label: 'Odoo:', text: '2-8 semanas' },
      { label: 'ERP tradicionales:', text: '1-3 meses' },
      { text: 'Requieren consultoría externa' },
      { text: 'Configuración compleja' },
    ],
    sisuTitle: '✅ Humano SISU',
    sisuItems: [
      'Activación inmediata y biométrico en 72 h o menos',
      'Migración de datos y capacitación incluidas',
      'Sin límite de usuarios',
      'Garantía de 30 días con dinero de regreso',
    ],
    processTitle: 'Proceso de Implementación Paso a Paso',
    steps: [
      {
        time: 'Inmediato',
        title: 'Activación de cuenta',
        description: 'Creamos tu cuenta, configuramos empresa y departamentos. Empiezas a usar el sistema de inmediato.',
        icon: '⚡',
      },
      {
        time: 'Día 1',
        title: 'Migración y empleados',
        description: 'Importamos o registramos empleados desde Excel o manual. Asistencia incluida para migrar tus datos.',
        icon: '👥',
      },
      {
        time: 'Día 1-2',
        title: 'Configuración de nómina',
        description: 'Configuramos deducciones y nómina según tu país (Honduras, El Salvador o Guatemala).',
        icon: '💰',
      },
      {
        time: 'Hasta 72 h',
        title: 'Implementación biométrica',
        description: 'Si tienes dispositivo biométrico, lo configuramos y conectamos a la nómina en 72 horas o menos.',
        icon: '🔐',
      },
      {
        time: 'Cierre',
        title: 'Capacitación y prueba',
        description: 'Capacitamos a tu equipo y hacemos una prueba completa. Actualizaciones incluidas sin costo adicional.',
        icon: '✅',
      },
    ],
    guaranteesTitle: 'Nuestras Garantías',
    testimonialsTitle: 'Lo Que Dicen Nuestros Clientes',
    testimonials: [
      {
        name: 'Felix Garcia',
        company: 'Restaurante Tonys Mar',
        quote: 'En 2 días ya estaba usando el sistema. Odoo me había dicho que tardaría 3 semanas.',
        time: '48 horas',
      },
      {
        name: 'Nancy Urrutia',
        company: 'Prohalca',
        quote: 'La implementación fue más rápida de lo que esperaba. El mismo día ya estábamos registrando asistencia.',
        time: '24 horas',
      },
    ],
    faqTitle: 'Preguntas Frecuentes',
    faqs: [
      {
        question: '¿Qué es la activación inmediata?',
        answer:
          'Puedes crear tu cuenta y empezar a explorar Humano SISU de inmediato, con leyes locales ya parametrizadas para Honduras, El Salvador y Guatemala. No necesitas esperar semanas de consultoría para arrancar.',
      },
      {
        question: '¿En cuánto tiempo queda lista la implementación biométrica?',
        answer:
          'Garantizamos conectar tu biométrico a la nómina en 72 horas o menos, cuando nos entregas a tiempo la información, accesos y responsables acordados.',
      },
      {
        question: '¿Ayudan a migrar datos desde Excel u otro sistema?',
        answer:
          'Sí. Incluimos asistencia para importar empleados e historial disponible desde Excel, planillas anteriores u otras plataformas.',
      },
      {
        question: '¿La capacitación y las actualizaciones tienen costo extra?',
        answer:
          'No. La capacitación de tu equipo y las actualizaciones del software están incluidas en tu plan, sin cobros adicionales por formación ni por ajustes legales.',
      },
      {
        question: '¿Hay límite de usuarios o empleados?',
        answer:
          'No. Puedes agregar empleados y usuarios administrativos sin pagar licencia extra por cada puesto.',
      },
      {
        question: '¿Cómo funciona la garantía de 30 días con dinero de regreso?',
        answer:
          'Si en los primeros 30 días no cumplimos lo acordado, te devolvemos tu dinero según los términos de servicio. Aplica a clientes que cumplan con los requisitos del plan contratado.',
      },
    ],
    breadcrumbs: [
      { name: 'Inicio', url: '/' },
      { name: 'Implementación express', url: '/implementacion-48-horas' },
    ],
    ctaSection: {
      title: '¿Listo para una puesta en marcha express?',
      lead: 'Activación inmediata, biométrico en 72 h o menos y garantía de 30 días con dinero de regreso. Sin límite de usuarios.',
      primary: 'Solicitar Implementación',
      secondary: 'Hablar con un Experto',
    },
  },
  en: {
    pageTitle: 'Automate attendance & payroll | Save hours | Humano SISU',
    pageDescription:
      'Instant activation and biometrics in 72 h. Migration, training, and 30-day guarantee included. Humano SISU.',
    metaKeywords:
      'express payroll implementation, fast regional payroll system, quick payroll setup, payroll setup El Salvador Guatemala Honduras',
    hero: {
      badges: [
        '⚡ Instant activation',
        '🔐 Biometrics in 72 h',
        '👥 Unlimited users',
        '💰 30-day money-back',
      ],
      h1Lead: 'Multiply your team’s value:',
      h1Accent: 'Automate attendance and payroll today.',
      lead: 'From biometric punch to pay stub in seconds. Save hours of admin work and reduce change resistance with an intuitive platform.',
    },
    heroCta: 'Request a quote',
    othersTitle: '❌ Other systems',
    othersItems: [
      { label: 'Odoo:', text: '2-8 weeks' },
      { label: 'Traditional ERPs:', text: '1-3 months' },
      { text: 'Require external consulting' },
      { text: 'Complex configuration' },
    ],
    sisuTitle: '✅ Humano SISU',
    sisuItems: [
      'Instant activation and biometrics in 72 h or less',
      'Data migration and training included',
      'No user limits',
      '30-day money-back guarantee',
    ],
    processTitle: 'Step-by-step implementation process',
    steps: [
      {
        time: 'Immediate',
        title: 'Account activation',
        description: 'We create your account and configure company and departments. You start using the system right away.',
        icon: '⚡',
      },
      {
        time: 'Day 1',
        title: 'Migration and employees',
        description: 'We import or register employees from Excel or manually. Assistance included to migrate your data.',
        icon: '👥',
      },
      {
        time: 'Day 1-2',
        title: 'Payroll setup',
        description: 'We configure deductions and payroll for your country (Honduras, El Salvador, or Guatemala).',
        icon: '💰',
      },
      {
        time: 'Up to 72 h',
        title: 'Biometric implementation',
        description: 'If you have a biometric device, we configure and connect it to payroll in 72 hours or less.',
        icon: '🔐',
      },
      {
        time: 'Close',
        title: 'Training and trial run',
        description: 'We train your team and run a full test. Updates included at no extra cost.',
        icon: '✅',
      },
    ],
    guaranteesTitle: 'Our guarantees',
    testimonialsTitle: 'What our customers say',
    testimonials: [
      {
        name: 'Felix Garcia',
        company: 'Restaurante Tonys Mar',
        quote: 'In 2 days I was already using the system. Odoo had told me it would take 3 weeks.',
        time: '48 hours',
      },
      {
        name: 'Nancy Urrutia',
        company: 'Prohalca',
        quote: 'Implementation was faster than I expected. The same day we were already logging attendance.',
        time: '24 hours',
      },
    ],
    faqTitle: 'Frequently asked questions',
    faqs: [
      {
        question: 'What is instant activation?',
        answer:
          'You can create your account and start exploring Humano SISU immediately, with local laws already parameterized for Honduras, El Salvador, and Guatemala. No weeks of consulting to get started.',
      },
      {
        question: 'How long until biometric implementation is ready?',
        answer:
          'We guarantee connecting your biometric device to payroll in 72 hours or less when you deliver on time the agreed information, access, and owners.',
      },
      {
        question: 'Do you help migrate data from Excel or another system?',
        answer:
          'Yes. We include assistance to import employees and available history from Excel, prior payrolls, or other platforms.',
      },
      {
        question: 'Do training and updates cost extra?',
        answer:
          'No. Team training and software updates are included in your plan, with no extra charges for training or legal adjustments.',
      },
      {
        question: 'Is there a limit on users or employees?',
        answer:
          'No. You can add employees and admin users without paying an extra license per seat.',
      },
      {
        question: 'How does the 30-day money-back guarantee work?',
        answer:
          'If in the first 30 days we do not deliver what was agreed, we refund your money per the terms of service. Applies to customers who meet the requirements of the contracted plan.',
      },
    ],
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Express implementation', url: '/implementacion-48-horas' },
    ],
    ctaSection: {
      title: 'Ready for an express go-live?',
      lead: 'Instant activation, biometrics in 72 h or less, and a 30-day money-back guarantee. No user limits.',
      primary: 'Request implementation',
      secondary: 'Talk to an expert',
    },
  },
}

const deduccionesHondurasByLocale: Record<LandingLocale, DeduccionesHondurasCopy> = {
  es: {
    pageTitle: 'IHSS, RAP, ISR automático | Sin cálculos manuales | Humano SISU',
    pageDescription:
      'Integra biométricos con Humano SISU. Automatiza IHSS, RAP, ISR en Honduras. Sin cálculos manuales. Activar gratis hoy, sin tarjeta.',
    metaKeywords:
      'cálculo IHSS RAP ISR automático, deducciones Honduras, planilla con IHSS, cálculo nómina Honduras, IHSS RAP ISR 2026',
    hero: {
      badges: ['✅ 100% Preciso', '🔄 Actualizado Automáticamente', '📋 Cumplimiento Legal', '🎁 30 días gratis'],
      h1Lead: 'IHSS, RAP e ISR en Honduras:',
      h1Accent: 'deducciones de ley sin Excel ni errores.',
      lead: 'Esta guía profundiza en IHSS, RAP e ISR en Honduras. Humano SISU es regional: misma plataforma con reglas nacionales para El Salvador, Guatemala y Honduras.',
    },
    heroCta: { primary: 'Activar gratis hoy - Sin tarjeta de crédito', secondary: 'Probar Calculadora Gratis' },
    whatTitle: '¿Qué son las Deducciones en Honduras?',
    deductions: [
      {
        icon: '🏥',
        title: 'IHSS',
        fullName: 'Instituto Hondureño de Seguridad Social',
        body: 'Cotización sobre salario ordinario hasta el techo (L 11,903.13 en 2026). Retención al trabajador: 5% total (2.5% EM + 2.5% IVM). El patrono aporta adicionalmente según Decreto 48-2024.',
      },
      {
        icon: '💰',
        title: 'RAP',
        fullName: 'Régimen de Aportaciones Privadas',
        body: 'Reserva laboral 4% patronal (techo L 57,896.16 en 2026) y FOVIIF 1.5% obrero + 1.5% patronal sobre el excedente de L 11,903.13 (Decreto 47-2024).',
      },
      {
        icon: '📊',
        title: 'ISR',
        fullName: 'Impuesto sobre la Renta',
        body: 'Tabla progresiva del SAR: exento hasta ~L 22,360.36/mes en 2026, luego 15%, 20% y 25% por tramos, con deducción anual de gastos médicos.',
      },
    ],
    comparisonTitle: 'Excel vs Humano SISU: ¿Cuál es Mejor?',
    comparisonTableHeaders: { aspect: 'Aspecto', excel: 'Excel Manual', humanoSisu: 'Humano SISU' },
    comparison: [
      { aspect: 'Precisión', excel: 'Propenso a errores', humanoSisu: '100% preciso', icon: '🎯' },
      {
        aspect: 'Actualización de tablas',
        excel: 'Manual, fácil de olvidar',
        humanoSisu: 'Automática',
        icon: '🔄',
      },
      { aspect: 'Cumplimiento legal', excel: 'No garantizado', humanoSisu: 'Garantizado', icon: '✅' },
      {
        aspect: 'Tiempo de cálculo',
        excel: 'Horas por empleado',
        humanoSisu: 'Segundos para todos',
        icon: '⚡',
      },
      { aspect: 'Auditoría', excel: 'Difícil de rastrear', humanoSisu: 'Completa y automática', icon: '📋' },
    ],
    howTitle: '¿Cómo Calcula Humano SISU?',
    howItems: [
      {
        title: 'Tablas Fiscales Actualizadas',
        body: 'Humano SISU mantiene las tablas de IHSS, RAP e ISR alineadas a publicaciones del SAR, IHSS y RAP. Cuando hay cambios oficiales, actualizamos el motor de cálculo.',
      },
      {
        title: 'Cálculo Automático',
        body: 'Ingresas el salario del empleado y el sistema calcula automáticamente todas las deducciones. No necesitas hacer fórmulas ni buscar tablas.',
      },
      {
        title: 'Comprobantes Automáticos',
        body: 'Cada cálculo genera un comprobante PDF automático que puedes enviar al empleado por email o WhatsApp.',
      },
      {
        title: 'Auditoría Completa',
        body: 'Todos los cálculos quedan registrados y auditables. Puedes ver el historial completo de cada nómina y cada deducción.',
      },
    ],
    faqTitle: 'Preguntas Frecuentes',
    faqs: [
      {
        question: '¿Cómo se calcula el IHSS en Honduras?',
        answer:
          'El IHSS cotiza sobre el salario ordinario hasta el techo vigente (L 11,903.13 en 2026 para IVM y EM, según Decreto 48-2024). Al trabajador se le retiene 2.5% por Enfermedad y Maternidad y 2.5% por Invalidez, Vejez y Muerte (5% en total sobre la base cotizable). El patrono aporta por separado 5% (EM), 3.5% (IVM) y riesgos profesionales. Humano SISU aplica tasas y techos según la norma publicada cada año.',
      },
      {
        question: '¿Qué es el RAP y cómo se calcula?',
        answer:
          'El RAP es el Régimen de Aportaciones Privadas (Decreto 47-2024), no un solo porcentaje. El Fondo de Reserva Laboral es un aporte patronal del 4% con techo de L 57,896.16 en 2026. El FOVIIF retiene 1.5% al trabajador y 1.5% al patrono, solo sobre el salario ordinario que excede L 11,903.13. Humano SISU calcula la retención del trabajador según los parámetros publicados por el RAP.',
      },
      {
        question: '¿Cómo se calcula el ISR en Honduras?',
        answer:
          'El ISR de quinta categoría usa la tabla progresiva del SAR (Comunicado 02-2026 para 2026): exento hasta L 22,360.36 mensuales, luego 15%, 20% y 25% por tramos. Antes de la tabla se deducen hasta L 40,000 anuales por gastos médicos (Ley del ISR, art. 13). Humano SISU mantiene la tabla y deducciones alineadas a las publicaciones del SAR.',
      },
      {
        question: '¿Por qué usar software en lugar de Excel para calcular deducciones?',
        answer:
          'Excel depende de fórmulas manuales, copiar tablas cada año y revisar cambios de IHSS, RAP e ISR; un error en el techo o la tasa afecta toda la planilla. Humano SISU centraliza el cálculo, aplica parámetros actualizados y deja registro para revisión y comprobantes.',
      },
      {
        question: '¿Humano SISU se actualiza cuando cambian las leyes fiscales?',
        answer:
          'Sí. Cuando el SAR, IHSS o RAP publican nuevos techos o tablas, actualizamos el motor de cálculo de Humano SISU para que tu planilla use la norma vigente sin reconfigurar fórmulas en Excel.',
      },
    ],
    breadcrumbs: [
      { name: 'Inicio', url: '/' },
      { name: 'Deducciones IHSS RAP ISR', url: '/deducciones-honduras-ihss-rap-isr' },
    ],
    ctaSection: {
      title: '¿Listo para automatizar tus deducciones?',
      lead: 'Prueba Humano SISU gratis por 30 días. Cálculo automático de IHSS, RAP e ISR incluido.',
      primary: 'Comenzar Prueba Gratis',
      secondary: 'Probar Calculadora',
    },
  },
  en: {
    pageTitle: 'Automatic IHSS, RAP, income tax | No manual math | Humano SISU',
    pageDescription:
      'Connect biometrics with Humano SISU. Automate IHSS, RAP, and income tax in Honduras. No manual calculations. Activate free today, no card.',
    metaKeywords:
      'automatic IHSS RAP income tax, Honduras deductions, payroll with IHSS, Honduras payroll calculation, IHSS RAP ISR 2026',
    hero: {
      badges: ['✅ 100% accurate', '🔄 Auto-updated', '📋 Legal compliance', '🎁 30 days free'],
      h1Lead: 'IHSS, RAP, and income tax in Honduras:',
      h1Accent: 'statutory deductions without Excel or errors.',
      lead: 'This guide goes deep on IHSS, RAP, and income tax in Honduras. Humano SISU is regional: one platform with national rules for El Salvador, Guatemala, and Honduras.',
    },
    heroCta: { primary: 'Activate free today — no credit card', secondary: 'Try the free calculator' },
    whatTitle: 'What are deductions in Honduras?',
    deductions: [
      {
        icon: '🏥',
        title: 'IHSS',
        fullName: 'Honduran Social Security Institute',
        body: 'Contribution on ordinary wages up to the ceiling (L 11,903.13 in 2026). Employee withholding: 5% total (2.5% EM + 2.5% IVM). The employer contributes separately per Decree 48-2024.',
      },
      {
        icon: '💰',
        title: 'RAP',
        fullName: 'Private Contributions Regime',
        body: 'Labor reserve 4% employer (ceiling L 57,896.16 in 2026) and FOVIIF 1.5% employee + 1.5% employer on the excess over L 11,903.13 (Decree 47-2024).',
      },
      {
        icon: '📊',
        title: 'ISR',
        fullName: 'Income tax',
        body: 'SAR progressive table: exempt up to ~L 22,360.36/month in 2026, then 15%, 20%, and 25% by brackets, with an annual medical-expense deduction.',
      },
    ],
    comparisonTitle: 'Excel vs Humano SISU: which is better?',
    comparisonTableHeaders: { aspect: 'Aspect', excel: 'Manual Excel', humanoSisu: 'Humano SISU' },
    comparison: [
      { aspect: 'Accuracy', excel: 'Error-prone', humanoSisu: '100% accurate', icon: '🎯' },
      {
        aspect: 'Table updates',
        excel: 'Manual, easy to forget',
        humanoSisu: 'Automatic',
        icon: '🔄',
      },
      { aspect: 'Legal compliance', excel: 'Not guaranteed', humanoSisu: 'Guaranteed', icon: '✅' },
      {
        aspect: 'Calculation time',
        excel: 'Hours per employee',
        humanoSisu: 'Seconds for everyone',
        icon: '⚡',
      },
      { aspect: 'Audit trail', excel: 'Hard to trace', humanoSisu: 'Complete and automatic', icon: '📋' },
    ],
    howTitle: 'How does Humano SISU calculate?',
    howItems: [
      {
        title: 'Updated tax tables',
        body: 'Humano SISU keeps IHSS, RAP, and income-tax tables aligned with SAR, IHSS, and RAP publications. When official changes land, we update the calculation engine.',
      },
      {
        title: 'Automatic calculation',
        body: 'Enter the employee’s salary and the system calculates all deductions automatically. No formulas or table lookups.',
      },
      {
        title: 'Automatic vouchers',
        body: 'Each calculation generates an automatic PDF voucher you can send to the employee by email or WhatsApp.',
      },
      {
        title: 'Full audit trail',
        body: 'All calculations are logged and auditable. You can see the full history of every payroll and every deduction.',
      },
    ],
    faqTitle: 'Frequently asked questions',
    faqs: [
      {
        question: 'How is IHSS calculated in Honduras?',
        answer:
          'IHSS contributes on ordinary wages up to the current ceiling (L 11,903.13 in 2026 for IVM and EM, per Decree 48-2024). The employee is withheld 2.5% for Illness and Maternity and 2.5% for Disability, Old Age and Death (5% total on the contributory base). The employer contributes separately 5% (EM), 3.5% (IVM), and occupational risk. Humano SISU applies rates and ceilings per the published rule each year.',
      },
      {
        question: 'What is RAP and how is it calculated?',
        answer:
          'RAP is the Private Contributions Regime (Decree 47-2024), not a single percentage. The Labor Reserve Fund is a 4% employer contribution with a L 57,896.16 ceiling in 2026. FOVIIF withholds 1.5% from the employee and 1.5% from the employer only on ordinary wages exceeding L 11,903.13. Humano SISU calculates the employee withholding per RAP-published parameters.',
      },
      {
        question: 'How is income tax calculated in Honduras?',
        answer:
          'Fifth-category income tax uses the SAR progressive table (Notice 02-2026 for 2026): exempt up to L 22,360.36 monthly, then 15%, 20%, and 25% by brackets. Before the table, up to L 40,000 annually for medical expenses is deducted (Income Tax Law, art. 13). Humano SISU keeps the table and deductions aligned with SAR publications.',
      },
      {
        question: 'Why use software instead of Excel for deductions?',
        answer:
          'Excel depends on manual formulas, copying tables each year, and tracking IHSS, RAP, and income-tax changes; one wrong ceiling or rate affects the whole payroll. Humano SISU centralizes calculation, applies updated parameters, and leaves a record for review and vouchers.',
      },
      {
        question: 'Does Humano SISU update when tax laws change?',
        answer:
          'Yes. When SAR, IHSS, or RAP publish new ceilings or tables, we update Humano SISU’s calculation engine so your payroll uses the current rule without reconfiguring Excel formulas.',
      },
    ],
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'IHSS RAP income-tax deductions', url: '/deducciones-honduras-ihss-rap-isr' },
    ],
    ctaSection: {
      title: 'Ready to automate your deductions?',
      lead: 'Try Humano SISU free for 30 days. Automatic IHSS, RAP, and income-tax calculation included.',
      primary: 'Start free trial',
      secondary: 'Try calculator',
    },
  },
}

const byLocale: Record<LandingLocale, SeoLandingCopyMap> = {
  es: {
    alternativaOdoo: alternativaOdooByLocale.es,
    biometricoNomina: biometricoNominaByLocale.es,
    implementacion48h: implementacion48hByLocale.es,
    deduccionesHonduras: deduccionesHondurasByLocale.es,
  },
  en: {
    alternativaOdoo: alternativaOdooByLocale.en,
    biometricoNomina: biometricoNominaByLocale.en,
    implementacion48h: implementacion48hByLocale.en,
    deduccionesHonduras: deduccionesHondurasByLocale.en,
  },
}

export function getSeoLandingCopy<K extends SeoLandingKey>(
  locale: LandingLocale,
  key: K
): SeoLandingCopyMap[K] {
  const pack = byLocale[locale] ?? byLocale.es
  return pack[key]
}
