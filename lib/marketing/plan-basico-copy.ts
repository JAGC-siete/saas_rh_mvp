/** Copy for /membresia-anual — the Esencial plan page (the URL is kept for SEO). */

export const PLAN_BASICO_PUBLIC_PATH = '/membresia-anual'
export const PLAN_BASICO_LEGACY_PATH = '/plan-basico'

export const PLAN_BASICO_COPY = {
  seo: {
    title: 'Plan Esencial | Planilla desde L. 1,300/mes | Humano SISU',
    description:
      'Planilla con IHSS, RAP e ISR, 13.º y 14.º salario, asistencia y reportes. Colaboradores ilimitados desde L. 1,300 al mes, o el año con reloj biométrico incluido.',
    keywords:
      'plan Esencial Humano SISU, software de planilla Honduras, planilla IHSS RAP ISR, asistencia, colaboradores ilimitados',
  },

  hero: {
    kicker: 'Colaboradores ilimitados · mes a mes o anual',
    headline: 'Formaliza tu planilla y protege tu negocio desde hoy.',
    subheadline: (monthly: string) =>
      `Planilla con deducciones de ley, 13.º y 14.º salario, asistencia y reportes. Colaboradores ilimitados por ${monthly} al mes.`,
    ctaPrimary: 'Quiero el plan Esencial',
    ctaSecondary: 'Probar gratis',
    priceLabel: 'Plan Esencial',
    perMonth: 'al mes',
    annualNote: (annual: string) => `o ${annual} al año, con 1 reloj biométrico incluido`,
    priceFoot: 'ISV incluido · sin cobro por empleado',
    modules: ['Planilla y deducciones de ley', '13.º y 14.º salario', 'Asistencia y reportes'],
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
        title: 'Ante un reclamo, tienes respaldo',
        body: 'Recibos, asistencia y expedientes listos. El cuaderno y el cálculo al ojo no sirven cuando hay un malentendido laboral.',
      },
      {
        title: 'La planilla cuadra con la ley',
        body: 'IHSS, RAP, ISR, 13.º y 14.º salario calculados con las reglas vigentes. Las actualizaciones de ley van incluidas.',
      },
      {
        title: 'Un precio, equipo ilimitado',
        body: 'El tamaño del equipo no cambia el precio. Sin cobro por usuario ni por empleado.',
      },
    ],
  },

  modules: {
    title: 'Qué incluye',
    subtitle: 'Todo lo que necesitas para pagar bien y a tiempo. El precio no cambia con el tamaño del equipo.',
    items: [
      {
        title: 'Planilla',
        body: 'Deducciones de ley (IHSS, RAP, ISR), boletas de pago para cada colaborador y reportes para gerencia.',
        limit: 'La afiliación al IHSS o RAP se hace en las instituciones.',
      },
      {
        title: '13.º y 14.º salario',
        body: 'Cálculo de décimo tercer y décimo cuarto mes con el historial de cada colaborador.',
        limit: 'Cesantías y liquidaciones van en el plan Profesional.',
      },
      {
        title: 'Asistencia y reportes',
        body: 'Entradas, salidas y llegadas tarde por departamento. Con reloj biométrico, la marcación pasa sola a la planilla.',
        limit: 'En el plan anual, 1 reloj biométrico va incluido.',
      },
    ],
  },

  included: {
    title: 'Incluye',
    items: [
      'Colaboradores ilimitados',
      'Planilla con IHSS, RAP e ISR, 13.º y 14.º salario',
      'Asistencia, departamentos y reportes',
      'Plan anual: 1 reloj biométrico incluido, instalado y sincronizado',
      'Plan mensual: sin permanencia mínima',
      'Actualizaciones de ley sin costo',
    ],
  },

  excluded: {
    title: 'No incluye',
    items: [
      'Cesantías, liquidaciones y contabilidad de planilla (plan Profesional)',
      'Portal de empleados y evaluaciones de desempeño (plan Empresarial)',
      'Reloj biométrico en el plan mensual (se compra aparte)',
    ],
  },

  form: {
    title: 'Pide tu propuesta del plan Esencial',
    subtitle: 'Déjanos tus datos y te llega al correo la propuesta en PDF y tu acceso de prueba.',
    owner: 'Nombre del propietario o gerente',
    company: 'Nombre comercial',
    email: 'Correo',
    phone: 'Teléfono o WhatsApp',
    country: 'País de operación',
    employees: 'Colaboradores',
    modality: 'Forma de pago',
    monthlyOption: (monthly: string, fee: string) => `Mensual · ${monthly} al mes + arranque asistido de ${fee}`,
    annualOption: (annual: string) => `Anual · ${annual} al año con 1 reloj incluido`,
    submit: 'Recibir mi propuesta',
    submitting: 'Enviando…',
    morePlans: '¿Necesitas liquidaciones, contabilidad o portal de empleados? Cotiza otro plan.',
    termsPrefix: 'Acepto los',
    terms: 'términos de servicio',
    privacyJoin: 'y la',
    privacy: 'política de privacidad',
    consentSuffix: '',
    legalMicro: 'Oferta comercial de software privado. No es un trámite estatal.',
    errorConsent: 'Marca el consentimiento para continuar.',
    errorName: 'Escribe el nombre del responsable.',
    errorCompany: 'Escribe el nombre comercial.',
    errorEmail: 'Revisa el correo, parece que no está completo.',
    errorPhone: 'Escribe un teléfono de contacto.',
    errorEmployees: 'Escribe cuántos colaboradores tiene tu empresa.',
    errorSubmit: 'No se pudo enviar. Revisa tu conexión e intenta de nuevo.',
    whatsapp: 'Escribir por WhatsApp',
    whatsappHint: 'Canal de ventas.',
  },

  faq: [
    {
      question: '¿Cuánto cuesta y qué cubre?',
      answer: (monthly: string, annual: string) =>
        `${monthly} al mes sin permanencia, o ${annual} al año con 1 reloj biométrico incluido. Cubre planilla con deducciones de ley, 13.º y 14.º salario, asistencia y reportes, con colaboradores ilimitados. ISV incluido.`,
    },
    {
      question: '¿Hay algún pago aparte?',
      answer: (fee: string) =>
        `En el plan mensual se paga una sola vez el arranque asistido (${fee}): migración de tus datos y capacitación. En el plan anual va incluido.`,
    },
    {
      question: '¿Qué pasa después de enviar el formulario?',
      answer:
        'Te llega al correo la propuesta en PDF y tu acceso de prueba. WhatsApp es un canal de seguimiento, no un contrato.',
    },
    {
      question: '¿Esto formaliza mi empresa?',
      answer:
        'Formaliza los procesos internos de personal. No constituye la sociedad, no afilia al IHSS o RAP y no inscribe ante el SAR.',
    },
    {
      question: '¿Esto es una notificación o un llamado del gobierno?',
      answer: 'No. Es una oferta comercial de Humano SISU, software privado de recursos humanos.',
    },
  ],

  close: {
    headline: 'Protege tu empresa ante reclamos con una planilla en regla.',
    sub: 'Colaboradores ilimitados. Precio visible. Propuesta al correo.',
    primary: 'Quiero el plan Esencial',
    secondary: 'Comparar planes',
  },
} as const
