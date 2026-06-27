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
    title: 'El truco',
    body: [
      'Muchos dueños de empresas confunden "digitalizar" con "automatizar". Compran un reloj biométrico y creen que el problema está resuelto. Pero si a fin de quincena todavía tienes que bajar los registros a una memoria USB, cargarlos a la computadora y pasarlos a un Excel para hacer los cálculos a mano, no te modernizaste; solo cambiaste el papel por una pantalla. El reprocesamiento de datos sigue absorbiendo tu tiempo.',
      'El verdadero truco no es capturar el dato, es eliminar el intermediario humano. Al hacer que el registro sea digital y esté conectado directamente al motor legal, abres la puerta a la automatización absoluta. Los datos viajan solos: el sistema calcula deducciones al centavo, procesa faltas y genera constancias. Digitalizar es el puente; automatizar es lo que te permite delegar el 100% del trabajo aburrido en la tecnología.',
    ],
    bullets: [
      'Cero Reprocesamiento: Olvídate para siempre de las memorias USB, cables, archivos corruptos y dobles digitaciones.',
      'Cálculo en la Sombra: El motor legal procesa horas, horas extra y leyes locales en tiempo real mientras tú duermes.',
      'Delegación Absoluta: La tecnología trabaja de fondo y se encarga del papeleo; tú solo entras a revisar y aprobar.',
    ],
  },

  /** Estado 3 — Misión 2 iniciada */
  mission2: {
    title: 'Misión 2 iniciada',
    body:
      'Te enviamos el mismo truco a tu correo (por si quieres guardarlo). En las próximas horas llega la primera misión: por qué casi nadie aplica esto aunque suene obvio.',
    emailHint: 'Busca un correo de jorgearturo@humanosisu.com — revisa spam si no lo ves.',
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
