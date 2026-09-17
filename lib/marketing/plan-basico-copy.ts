/** Copy for /membresia-anual — tres módulos, sin relojes, cualquier tamaño de equipo. */

export const PLAN_BASICO_PUBLIC_PATH = '/membresia-anual'
export const PLAN_BASICO_LEGACY_PATH = '/plan-basico'

export const PLAN_BASICO_COPY = {
  seo: {
    title: 'Membresía anual | L. 6,500/año | Humano SISU',
    description:
      'Recibos de nómina, asistencia sin relojes costosos y respaldo ante reclamos laborales. Empleados ilimitados. L. 6,500 al año. Software privado de Humano SISU.',
    keywords:
      'membresía anual RRHH Honduras, software empleados, asistencia sin reloj, recibos de nómina, Humano SISU',
  },

  hero: {
    kicker: 'Empleados ilimitados · un pago al año',
    headline: 'Protegé tu negocio y formalizá al equipo. Un pago al año.',
    subheadline: (price: string) =>
      `Recibos de nómina, asistencia sin relojes costosos y respaldo ante reclamos laborales. Empleados ilimitados por ${price} al año.`,
    ctaPrimary: 'Activar acceso',
    ctaSecondary: 'Probar gratis',
    priceLabel: 'Membresía anual',
    priceFoot: 'Empleados ilimitados · sin comprar reloj',
    modules: ['Expedientes digitales', 'Asistencia sin hardware', 'Recibos de nómina'],
  },

  testimonial: {
    quote:
      'Perdía los domingos batallando con fórmulas de Excel. Ahora cierro planilla en minutos y las muchachas ya no me piden “una corrección más”.',
    name: 'Felix G.',
    role: 'Dueño',
    company: "Tony's Mar Restaurante",
    image: '/images/testimonials/felix.jpg',
  },

  honesty: {
    title: 'El costo de no tener controles',
    items: [
      {
        title: 'Ante un reclamo, tenés respaldo',
        body: 'Recibos, asistencia y expedientes listos. El cuaderno y el cálculo al ojo no sirven cuando hay un malentendido laboral.',
      },
      {
        title: 'Asistencia sin comprar reloj',
        body: 'Entradas y salidas en el sistema, sin hardware. El reloj se cotiza aparte si lo necesitás después.',
      },
      {
        title: 'Un precio, equipo ilimitado',
        body: 'El tamaño del equipo no cambia el precio. Sin cobro por usuario.',
      },
    ],
  },

  modules: {
    title: 'Qué incluye',
    subtitle: 'Sin hardware biométrico. El precio no cambia con el tamaño del equipo.',
    items: [
      {
        title: 'Empleados',
        body: 'Expedientes digitales, constancias de trabajo y control de permisos y ausencias en un solo lugar.',
        limit: 'Sin límite de empleados en este plan.',
      },
      {
        title: 'Asistencia',
        body: 'Registro simplificado de entradas y salidas. Control de asistencia sin comprar reloj.',
        limit: 'Sin huella ni reconocimiento facial en este plan. El reloj se cotiza aparte.',
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
      'Acceso anual a los tres módulos, empleados ilimitados',
      'Permisos y ausencias en el sistema',
      'Sin contratar personal extra',
      'Credenciales al correo el mismo día',
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
    title: 'Activar acceso',
    subtitle: 'Dejá tus datos. Recibís las credenciales en el correo.',
    owner: 'Nombre del propietario o gerente',
    company: 'Nombre comercial',
    email: 'Correo',
    phone: 'Teléfono o WhatsApp',
    country: 'País de operación',
    consent:
      'Acepto los términos de servicio y la política de privacidad.',
    submit: 'Activar acceso',
    submitting: 'Enviando…',
    moreThanTen: '¿También querés relojes de asistencia? Cotizá con terminales.',
    termsPrefix: 'Acepto los',
    terms: 'términos de servicio',
    privacyJoin: 'y la',
    privacy: 'política de privacidad',
    consentSuffix: '',
    legalMicro:
      'Oferta comercial de software privado. No es un trámite estatal.',
    errorConsent: 'Marcá el consentimiento para continuar.',
    errorName: 'Indicá el nombre del responsable.',
    errorPhone: 'Indicá un teléfono de contacto.',
    whatsapp: 'Escribir por WhatsApp',
    whatsappHint: 'Canal de ventas.',
  },

  faq: [
    {
      question: '¿Cuánto cuesta y qué cubre?',
      answer: (price: string) =>
        `${price} al año. Expedientes, asistencia sin reloj y recibos. Empleados ilimitados. No hay un producto “gratis” y un cobro aparte.`,
    },
    {
      question: '¿La asistencia es biométrica?',
      answer:
        'En este plan, no. El equipo registra entrada y salida en el sistema, sin comprar reloj. El reloj se cotiza aparte.',
    },
    {
      question: '¿Qué pasa después de enviar el formulario?',
      answer:
        'Recibís las credenciales en el correo. La propuesta en PDF queda como respaldo comercial. WhatsApp es un canal de seguimiento, no un contrato.',
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
    headline: 'Blindá tu empresa ante reclamos. Un pago al año.',
    sub: 'Empleados ilimitados. Precio visible. Credenciales al correo.',
    primary: 'Activar acceso',
    secondary: 'Cotizá con relojes',
  },
} as const
