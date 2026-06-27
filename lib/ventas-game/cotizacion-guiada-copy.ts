/** Copy for /ventas — Cotización guiada (lead caliente, tono formal). */

export const COTIZACION_GUIADA_COPY = {
  badge: 'Propuesta formal · PDF al instante',

  intro: {
    headline: 'Cotización exacta para nómina y asistencia en su país',
    subheadline:
      'Arme su propuesta en 3 pasos. Recibirá PDF listo para gerencia y acceso de evaluación incluido.',
    cta: 'Armar propuesta',
  },

  scope: {
    title: 'Alcance de la cotización',
    subtitle: 'País, tamaño del equipo y modalidad de contratación.',
    tierHint: (employees: number, country: string) =>
      `Calcularemos el rango tarifario para ${employees} empleado${employees === 1 ? '' : 's'} en ${country}, con leyes locales aplicadas.`,
  },

  company: {
    title: 'Datos de la empresa',
    subtitle: 'Para personalizar la propuesta y el PDF.',
    couponToggle: '¿Tiene código promocional?',
  },

  delivery: {
    title: 'Entrega de la propuesta',
    subtitle: 'Correo corporativo donde enviaremos el PDF y las credenciales de evaluación.',
    submit: 'Generar propuesta en PDF',
    submitting: 'Calculando cotización y generando PDF…',
    finePrint:
      'Al enviar, autoriza recibir la propuesta automatizada en su correo. Los montos se calculan según el país seleccionado.',
  },

  success: {
    title: 'Propuesta en camino',
    emailHint: (email: string) =>
      `Revise la bandeja de ${email} (incluyendo spam). Hemos enviado el PDF y las credenciales de evaluación.`,
    contractCta: 'Continuar contratación por WhatsApp',
    contractHint: 'También puede responder directamente al correo donde llegó la propuesta.',
  },
} as const
