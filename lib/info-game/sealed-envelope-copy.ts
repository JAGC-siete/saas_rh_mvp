/** Copy for /secreto — Acceso Temporal Concedido (Sobre Sellado). */

export const SEALED_ENVELOPE_COPY = {
  badge: 'Acceso Temporal Concedido',

  /** Estado 0 — Intriga */
  intrigue: {
    headline: 'Nuestro truco secreto para que lo repetitivo se haga solo.',
    subheadline:
      'Está dentro de este sobre por tiempo limitado. No necesitas ser experto en leyes ni tener 10 años de experiencia, planillas o recursos humanos — solo tener curiosidad.',
    envelopeLabel: 'METODO SECRETO',
    envelopeHint: 'El método absoluto para delegar la carga operativa para siempre.',
    cta: 'Revelar el secreto',
  },

  /** Estado 1 — Desbloqueo */
  unlock: {
    progressLabel: 'Autorizando acceso al método…',
    fields: {
      nombre: {
        label: 'Nombre',
        placeholder: '¿A quién le revelamos el secreto?',
      },
      email: {
        label: 'Correo',
        placeholder: '¿A dónde te enviamos el secreto?',
      },
      phone: {
        label: 'Línea directa (Opcional)',
        placeholder: '¿A qué número te avisamos cuando llegue el secreto? (Opcional)',
      },
      empresa: {
        label: 'Organización',
        placeholder: '¿En qué empresa vas a aplicar este truco? (Opcional)',
      },
    },
    submit: 'Desbloquear el Secreto',
    submitting: 'Abriendo sobre…',
    disclaimer: 'Estás a un solo clic de saber lo que las mayorías ignoran.',
  },

  /** Estado 2 — Revelación (on-screen) */
  revealed: {
    badge: 'Secreto revelado',
    docStamp: 'Documento filtrado',
    docClassification: 'Uso exclusivo · Curiosos autorizados',
    docRef: 'REF · HS-INT-001',
    title: '¿Digitalizar o Automatizar?',
    body: [
      'Muchos empresarios confunden ambos conceptos. Usar un reloj biométrico pero seguir bajando registros a un USB para calcular la nómina en Excel no es modernizarse; es solo cambiar el papel por una pantalla.',
      'La verdadera automatización elimina al intermediario humano. Al conectar el registro al motor legal, los datos viajan solos y calculan todo en tiempo real. Digitalizar es el puente; automatizar te permite delegar.',
    ],
    bullets: [
      'Cero Reprocesamiento: Adiós a los USBs, archivos corruptos y la doble digitación.',
      'Cálculo en la Sombra: El sistema procesa horas y leyes en tiempo real mientras duermes.',
      'Delegación Absoluta: La tecnología hace el papeleo; tú solo revisas y apruebas.',
    ],
  },

  /** Estado 3 — Cierre (conversación humana, sin gamificación) */
  nextStep: {
    title: '¿Qué pasa ahora?',
    body:
      'Ya tienes el secreto en tu bandeja de entrada. No tienes que hacer más nada por hoy. En las próximas horas te voy a mandar la primera trampa invisible que nos arrastra de vuelta al trabajo manual y repetitivo (aunque la solución sea tan obvia como la que acabas de ver).',
    emailHint: 'Busca un correo de jorgearturo@humanosisu.net — revisa spam si no lo ves.',
    ctaActivar: 'Ver cómo se ve en 30 segundos',
    ctaCalculadora: 'Probar calculadora gratis',
  },
} as const

export const UNLOCK_PROGRESS = {
  nombre: 40,
  email: 40,
  phone: 10,
  empresa: 10,
} as const

export const UNLOCK_PROGRESS_MAX = 100
