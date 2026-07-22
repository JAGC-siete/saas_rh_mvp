/** Copy for /ventas — Cotización guiada (lead caliente; tono tú). */

export const COTIZACION_GUIADA_COPY = {
  badge: 'Propuesta a medida · PDF + acceso gratis',

  intro: {
    headline: '¿Qué deseas delegar en este servicio?',
    subheadline:
      'Propuesta ajustada a la medida en 3 pasos. Reciba PDF listo para gerencia y credenciales de acceso gratuito en un solo paso.',
    cta: 'Empezar mi propuesta',
  },

  scope: {
    title: 'Qué vas a delegar',
    subtitle: 'País, tamaño del equipo y modalidad: así ajustamos la propuesta.',
    tierHint: (employees: number, country: string) =>
      `Con ${employees} empleado${employees === 1 ? '' : 's'} en ${country}, armamos el alcance con leyes locales aplicadas.`,
  },

  company: {
    title: 'Para quién es la propuesta',
    subtitle: 'Personalizamos el PDF y las credenciales a nombre de tu empresa.',
    couponToggle: '¿Tienes código promocional?',
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
