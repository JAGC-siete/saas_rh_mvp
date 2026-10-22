/** Copy for /ventas — Cotización guiada (lead caliente; tono tú). */

export const COTIZACION_GUIADA_COPY = {
  badge: 'Propuesta a medida · PDF + acceso gratis',

  intro: {
    headline: '¿Qué deseas delegar en este servicio?',
    subheadline:
      'Tu propuesta a la medida en 3 pasos. Te llegan al correo el PDF para gerencia y tu acceso gratis.',
    cta: 'Empezar mi propuesta',
  },

  scope: {
    title: 'Elige tu plan',
    subtitle: 'Plan, forma de pago, tamaño del equipo y relojes: así armamos tu propuesta.',
    employeesHint: 'Todos los planes son sin límite de colaboradores.',
    terminalsHint:
      'El plan anual incluye 1 reloj biométrico. Si ya tienes relojes, elige "Sin reloj".',
    pricesLater: 'Verás los montos exactos en tu cotización.',
    summaryTitle: 'Tu propuesta',
    customQuoteCta: 'Pedir cotización por WhatsApp',
  },

  company: {
    title: 'Para quién es la propuesta',
    subtitle: 'Personalizamos el PDF y las credenciales a nombre de tu empresa.',
  },

  delivery: {
    title: 'Dónde enviamos todo',
    subtitle: 'Correo donde llegan el PDF para gerencia y las credenciales de acceso gratuito.',
    submit: 'Recibir PDF y acceso gratis',
    submitting: 'Generando tu propuesta y credenciales…',
    finePrint:
      'Al enviar, recibes la propuesta automatizada en tu correo. Los montos se calculan según el país seleccionado.',
  },

  success: {
    title: 'Listo: PDF y acceso en camino',
    emailHint: (email: string) =>
      `Revisa la bandeja de ${email} (incluido spam). Ahí van el PDF para gerencia y las credenciales de acceso gratuito.`,
    contractCta: 'Continuar por WhatsApp',
    contractHint: 'También puedes responder al correo donde llegó la propuesta.',
  },
} as const
