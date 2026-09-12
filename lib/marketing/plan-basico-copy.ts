/** Copy for /membresia-anual — tres módulos, sin relojes, cualquier tamaño de equipo. */

export const PLAN_BASICO_PUBLIC_PATH = '/membresia-anual'
export const PLAN_BASICO_LEGACY_PATH = '/plan-basico'

export const PLAN_BASICO_COPY = {
  seo: {
    title: 'Membresía anual | L. 6,500/año | Humano SISU',
    description:
      'Expedientes, marcas a mano y recibos de nómina. L. 6,500 al año, sin reloj biométrico. Software privado de Humano SISU.',
    keywords:
      'membresía anual RRHH Honduras, software empleados, asistencia manual, recibos de nómina, Humano SISU',
  },

  hero: {
    badge: 'Oferta comercial · software privado',
    kicker: 'Humano SISU',
    headline: 'Expedientes, marcas a mano y recibos. Un pago al año.',
    subheadline: (price: string) =>
      `${price} cubre los tres módulos, cualquier tamaño de equipo, sin reloj biométrico. Software privado de Humano SISU — no es un trámite de gobierno.`,
    ctaPrimary: 'Recibir propuesta y acceso',
    ctaSecondary: 'Probar el sistema',
    priceLabel: 'Membresía anual',
  },

  honesty: {
    title: 'Qué estás comprando',
    items: [
      {
        title: 'Tres módulos, un precio',
        body: (price: string) =>
          `${price} al año cubre expedientes, marcas y recibos. No hay un cobro aparte de un producto “gratis”.`,
      },
      {
        title: 'Dejá el cuaderno',
        body: 'El colaborador o el encargado registra la entrada y la salida en el sistema. Este plan no trae reloj.',
      },
      {
        title: 'Software privado',
        body: 'Humano SISU vende una plataforma de recursos humanos. No es un trámite de gobierno.',
      },
    ],
  },

  modules: {
    title: 'Tres módulos incluidos',
    subtitle: 'Sin reloj, cualquier tamaño de equipo.',
    items: [
      {
        title: 'Empleados',
        body: 'Expedientes digitales del equipo: datos de contratación y archivo en un solo lugar.',
        limit: 'Sin límite de empleados en este plan.',
      },
      {
        title: 'Asistencia',
        body: 'Registro de entrada y salida a mano. Dejá el cuaderno; no automatiza la marcación.',
        limit: 'Sin reloj, sin huella, sin reconocimiento facial.',
      },
      {
        title: 'Nómina',
        body: 'Cálculos estandarizados y recibos de pago para el colaborador.',
        limit: 'Recibos en el sistema. La afiliación IHSS o RAP se hace en las instituciones.',
      },
    ],
  },

  included: {
    title: 'Incluye',
    items: [
      'Acceso anual a los tres módulos, sin límite de empleados en este plan',
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
        'Digitaliza controles internos de personal. No constituye la sociedad, no afilia al IHSS o RAP y no inscribe ante el SAR.',
    },
    {
      question: '¿Esto es una notificación o un llamado del gobierno?',
      answer:
        'No. Es una oferta comercial de Humano SISU, software privado de recursos humanos.',
    },
  ],

  close: {
    headline: 'Tres módulos, un pago al año.',
    sub: 'Precio visible. Alcance visible. PDF y credenciales al correo.',
    primary: 'Ir al formulario',
    secondary: 'Cotizá con relojes',
  },
} as const
