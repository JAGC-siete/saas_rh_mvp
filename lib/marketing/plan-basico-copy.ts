/** Copy for /plan-basico — membresía anual Basic (sin relojes), cualquier tamaño de equipo. */

export const PLAN_BASICO_PUBLIC_PATH = '/plan-basico'

export const PLAN_BASICO_COPY = {
  seo: {
    title: 'Membresía anual Basic | L. 6,500/año | Humano SISU',
    description:
      'Software comercial de expedientes, asistencia por captura manual y recibos de nómina. Membresía anual L. 6,500, sin reloj biométrico. No es un trámite de gobierno.',
    keywords:
      'plan básico RRHH Honduras, software empleados microempresa, asistencia manual, recibos de nómina, Humano SISU',
  },

  hero: {
    badge: 'Oferta comercial · software privado',
    kicker: 'Humano SISU',
    headline: 'Expedientes, asistencia y recibos. Un pago al año.',
    subheadline:
      'Para cualquier tamaño de equipo. El precio incluye el software de tres módulos. No es una notificación, no es un organismo estatal y no formaliza la empresa ante el IHSS, RAP, SAR ni la Secretaría de Trabajo.',
    ctaPrimary: 'Solicitar la membresía',
    ctaSecondary: 'Probar el sistema',
    priceLabel: 'Membresía anual',
    price: 'L. 6,500',
    priceHint: '≈ L. 542 / mes · un solo cargo',
  },

  honesty: {
    title: 'Qué estás comprando',
    items: [
      {
        title: 'Empresa privada de software',
        body: 'Humano SISU vende una plataforma de recursos humanos. El emisor no es la STSS, el IHSS ni ningún ente público.',
      },
      {
        title: 'El software no es gratis',
        body: 'L. 6,500 es el precio anual del plan básico. Ese monto cubre el acceso a los tres módulos. No hay una “aportación” aparte de un producto gratuito.',
      },
      {
        title: 'Asistencia de este plan: captura manual',
        body: 'El colaborador o el encargado registra la entrada y la salida en el sistema. Este SKU no incluye reloj biométrico ni marcación automática.',
      },
    ],
  },

  modules: {
    title: 'Tres módulos incluidos',
    subtitle: 'El mismo alcance del plan básico de cotización: sin reloj, cualquier tamaño de equipo.',
    items: [
      {
        title: 'Empleados',
        body: 'Expedientes digitales del equipo: datos de contratación y archivo en un solo lugar.',
        limit: 'No lista retención legal ni backups en esta página; el contrato y los términos sí.',
      },
      {
        title: 'Asistencia',
        body: 'Registro estructurado por input manual. Deja el cuaderno; no automatiza la marcación.',
        limit: 'Sin terminal, sin huella, sin reconocimiento facial en este plan.',
      },
      {
        title: 'Nómina',
        body: 'Cálculos estandarizados y recibos de pago para el colaborador.',
        limit: 'El módulo no sustituye la afiliación IHSS/RAP ni la declaración SAR.',
      },
    ],
  },

  included: {
    title: 'Incluye',
    items: [
      'Acceso anual a los tres módulos, sin tope de headcount en este SKU',
      'Activación por cotización en PDF + credenciales al correo',
      'Modalidad anual únicamente (el plan básico no se vende mes a mes)',
    ],
  },

  excluded: {
    title: 'No incluye',
    items: [
      'Reloj biométrico ni continuidad de hardware',
      'Inscripción o “formalización” mercantil ante el Estado',
      'Prevención de demandas, representación legal ni “protección ante cualquier auditoría”',
      'Cálculo de IHSS, RAP, ISR, 13º o 14º como trámite gubernamental',
    ],
  },

  form: {
    title: 'Solicitud de membresía',
    subtitle:
      'Completá el formulario. Recibís la propuesta en PDF y las credenciales en el correo. No hace falta fotografiar un papel ni firmar una hoja en blanco.',
    owner: 'Nombre del propietario o gerente',
    company: 'Nombre comercial',
    email: 'Correo',
    phone: 'Teléfono o WhatsApp',
    employees: 'Número de colaboradores',
    country: 'País de operación',
    consent:
      'Acepto los términos de servicio y la política de privacidad. Entiendo que esta es una solicitud comercial de software, no un trámite estatal.',
    submit: 'Enviar solicitud y recibir PDF',
    submitting: 'Generando propuesta…',
    moreThanTen: '¿También querés terminales biométricas? Cotizá Premium en /ventas.',
    termsPrefix: 'Acepto los',
    terms: 'términos de servicio',
    privacyJoin: 'y la',
    privacy: 'política de privacidad',
    consentSuffix:
      '. Entiendo que esta es una solicitud comercial de software, no un trámite estatal.',
    errorConsent: 'Marcá el consentimiento para continuar.',
    errorName: 'Indique el nombre del responsable.',
    errorPhone: 'Indique un teléfono de contacto.',
    whatsapp: 'Escribir por WhatsApp',
    whatsappHint: 'Canal de ventas. No sustituye el PDF ni el contrato.',
  },

  faq: [
    {
      question: '¿Esto es una notificación formal o un llamado del gobierno?',
      answer:
        'No. Es una oferta comercial de Humano SISU, software privado de recursos humanos. No emite actos administrativos ni representa a la Secretaría de Trabajo.',
    },
    {
      question: '¿El software es gratuito?',
      answer:
        'No. La membresía anual cuesta L. 6,500 y ese precio incluye el acceso a expedientes, asistencia manual y recibos. No hay un producto “gratis” y una “aportación” aparte.',
    },
    {
      question: '¿La asistencia es biométrica?',
      answer:
        'En este plan, no. La asistencia se carga a mano en el sistema. El reloj biométrico es otro producto; se cotiza aparte.',
    },
    {
      question: '¿Esto formaliza mi empresa?',
      answer:
        'Digitaliza controles internos de personal. No constituye la sociedad, no afilia al IHSS/RAP y no inscribe ante el SAR. Esa formalización se hace en las instituciones públicas correspondientes.',
    },
    {
      question: '¿Cómo se cierra la compra?',
      answer:
        'El formulario genera la cotización en PDF y envía credenciales al correo. WhatsApp es un canal de seguimiento, no un contrato por foto de una firma vacía.',
    },
  ],

  close: {
    headline: 'Un plan claro: tres módulos, un pago al año.',
    sub: 'Precio visible. Alcance visible. Cierre por cotización, no por papel fotografiado.',
    primary: 'Ir al formulario',
    secondary: 'Cotización completa',
  },
} as const
