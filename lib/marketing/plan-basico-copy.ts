/** Copy for /membresia-anual — tres módulos, sin relojes, cualquier tamaño de equipo. */

export const PLAN_BASICO_PUBLIC_PATH = '/membresia-anual'
export const PLAN_BASICO_LEGACY_PATH = '/plan-basico'

export const PLAN_BASICO_COPY = {
  seo: {
    title: 'Membresía anual | L. 6,500/año | Humano SISU',
    description:
      'Gestión profesional de empleados. L. 6,500 al año: expedientes, marcas a mano y recibos. Sin reloj biométrico. Software privado de Humano SISU.',
    keywords:
      'membresía anual RRHH Honduras, software empleados, asistencia manual, recibos de nómina, Humano SISU',
  },

  hero: {
    badge: 'Oferta comercial · software privado',
    kicker: 'Formalización y digitalización de la micro y pequeña empresa',
    headline: 'Gestión profesional de empleados. Un pago al año.',
    subheadline: (price: string) =>
      `${price} cubre expedientes, marcas a mano y recibos. Cualquier tamaño de equipo, sin reloj. Software privado — no es un trámite de gobierno.`,
    quote:
      'El que es fiel en lo muy poco, también en lo más es fiel; y el que en lo muy poco es injusto, también en lo más es injusto.',
    quoteAttr: 'Lucas 16:10',
    ctaPrimary: 'Recibir propuesta y acceso',
    ctaSecondary: 'Probar el sistema',
    priceLabel: 'Membresía anual',
    priceFoot: 'Cualquier tamaño de equipo · sin reloj biométrico',
  },

  honesty: {
    title: 'Beneficios desde el inicio',
    items: [
      {
        title: 'Formalizar desde el inicio',
        body: 'Procesos claros generan confianza y lealtad en el equipo.',
      },
      {
        title: 'Digitalizar libera tiempo',
        body: 'Las tareas formales siguen siendo necesarias. Invertir horas en papel, ya no.',
      },
      {
        title: 'Cuentas claras',
        body: 'Con controles listos, el negocio está mejor preparado ante los malentendidos laborales.',
      },
    ],
  },

  modules: {
    title: 'Gestión profesional de empleados',
    subtitle: 'Sin reloj, cualquier tamaño de equipo.',
    items: [
      {
        title: 'Empleados',
        body: 'Expedientes digitales, constancias de trabajo y control de permisos y ausencias en un solo lugar.',
        limit: 'Sin límite de empleados en este plan.',
      },
      {
        title: 'Asistencia',
        body: 'Marcas de entrada y salida a mano. El cuaderno y el cálculo al ojo se vuelven un problema cuando hay un malentendido.',
        limit: 'Sin reloj, sin huella, sin reconocimiento facial.',
      },
      {
        title: 'Nómina',
        body: 'Deducciones de ley y boletas de pago para el colaborador.',
        limit: 'Recibos en el sistema. La afiliación IHSS o RAP se hace en las instituciones.',
      },
    ],
  },

  included: {
    title: 'Incluye',
    items: [
      'Acceso anual a los tres módulos, sin límite de empleados en este plan',
      'Permisos y ausencias en el sistema',
      'Sin contratar personal extra',
      'Propuesta en PDF y credenciales al correo',
      'Modalidad anual únicamente (este plan no se vende mes a mes)',
    ],
  },

  excluded: {
    title: 'No incluye',
    items: [
      'Reloj biométrico ni servicio de hardware',
      'Marcación automática por huella o reconocimiento facial',
    ],
  },

  form: {
    title: 'Recibir propuesta y acceso',
    subtitle:
      'Completá el formulario. Recibís la propuesta en PDF y las credenciales en el correo.',
    owner: 'Nombre del propietario o gerente',
    company: 'Nombre comercial',
    email: 'Correo',
    phone: 'Teléfono o WhatsApp',
    employees: 'Número de colaboradores',
    employeesHint:
      'El rango queda en la cotización. El precio de esta membresía no cambia con el tamaño del equipo.',
    country: 'País de operación',
    consent:
      'Acepto los términos de servicio y la política de privacidad. Entiendo que esta es una solicitud comercial de software, no un trámite estatal.',
    submit: 'Recibir propuesta y acceso',
    submitting: 'Generando propuesta…',
    moreThanTen: '¿También querés relojes de asistencia? Cotizá con terminales.',
    termsPrefix: 'Acepto los',
    terms: 'términos de servicio',
    privacyJoin: 'y la',
    privacy: 'política de privacidad',
    consentSuffix:
      '. Entiendo que esta es una solicitud comercial de software, no un trámite estatal.',
    errorConsent: 'Marcá el consentimiento para continuar.',
    errorName: 'Indicá el nombre del responsable.',
    errorPhone: 'Indicá un teléfono de contacto.',
    whatsapp: 'Escribir por WhatsApp',
    whatsappHint: 'Canal de ventas. No sustituye el PDF ni el contrato.',
  },

  faq: [
    {
      question: '¿Cuánto cuesta y qué cubre?',
      answer: (price: string) =>
        `${price} al año. Ese precio incluye expedientes, marcas a mano y recibos. No hay un producto “gratis” y un cobro aparte.`,
    },
    {
      question: '¿La asistencia es biométrica?',
      answer:
        'En este plan, no. La asistencia se carga a mano en el sistema. El reloj se cotiza aparte.',
    },
    {
      question: '¿Qué pasa después de enviar el formulario?',
      answer:
        'Recibís la propuesta en PDF y las credenciales en el correo. WhatsApp es un canal de seguimiento, no un contrato.',
    },
    {
      question: '¿Esto formaliza mi empresa?',
      answer:
        'Formaliza procesos internos de personal. No constituye la sociedad, no afilia al IHSS o RAP y no inscribe ante el SAR.',
    },
    {
      question: '¿Esto es una notificación o un llamado del gobierno?',
      answer:
        'No. Es una oferta comercial de Humano SISU, software privado de recursos humanos.',
    },
  ],

  close: {
    headline: 'Controles mínimos de un empleador serio. Un pago al año.',
    sub: 'Digital, sin personal extra. Precio visible. PDF y credenciales al correo.',
    primary: 'Ir al formulario',
    secondary: 'Cotizá con relojes',
  },
} as const
