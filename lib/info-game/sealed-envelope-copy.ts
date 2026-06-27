/** Copy for /info — Tablón de la Intriga (Sobre Sellado). */

export const SEALED_ENVELOPE_COPY = {
  badge: 'Tablón de la Intriga',

  /** Estado 0 — Intriga */
  intrigue: {
    headline: 'Hay un truco para que el trabajo aburrido se haga solo.',
    subheadline:
      'Está dentro de este sobre. No necesitas saber de leyes ni de planillas — solo curiosidad.',
    envelopeLabel: 'SOBRE CLASIFICADO',
    envelopeHint: 'El truco para delegar lo repetitivo sin perder el control.',
    cta: 'Descifrar el sobre',
  },

  /** Estado 1 — Desbloqueo */
  unlock: {
    progressLabel: 'Desbloqueando Secreto',
    fields: {
      nombre: {
        label: 'Pista 1',
        placeholder: '¿Cómo te llamo cuando te cuente el truco?',
      },
      email: {
        label: 'Pista 2',
        placeholder: '¿A qué correo te mando el Secreto y la Misión 2?',
      },
      phone: {
        label: 'Pista extra',
        placeholder: 'WhatsApp (opcional) — avísame cuando llegue la Misión 2',
      },
      empresa: {
        label: 'Pista extra',
        placeholder: 'Nombre de tu empresa (opcional)',
      },
    },
    submit: 'Desbloquear el Secreto',
    submitting: 'Abriendo sobre…',
    disclaimer: 'Sin compromiso. Cero venta. No activamos trial ni cotización automática.',
  },

  /** Estado 2 — Revelación (on-screen) */
  revealed: {
    badge: 'Secreto revelado',
    docStamp: 'Documento filtrado',
    docClassification: 'Uso exclusivo · Curiosos autorizados',
    docRef: 'REF · HS-INT-001',
    title: 'El truco',
    body: [
      'Digitaliza el registro de asistencia.',
      'Un reloj biométrico anota quién llegó y a qué hora. El sistema calcula pagos, guarda permisos y genera constancias — sin que tú hagas las sumas a mano ni persigas datos en Excel o WhatsApp.',
    ],
    bullets: [
      'Asistencia en tiempo real desde tu celular o computadora.',
      'Pagos calculados solos, con las reglas de tu país.',
      'Permisos y datos del equipo en un solo lugar seguro.',
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
