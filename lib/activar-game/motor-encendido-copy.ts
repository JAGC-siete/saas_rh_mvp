/** Copy for /activar — clarity first: what the trial is, that it's free, what happens next. */

export const MOTOR_ENCENDIDO_COPY = {
  badge: 'Prueba gratis · 30 días · Sin tarjeta',

  progressTitle: 'Tu prueba gratis',
  wizardSteps: ['Tu negocio', 'Tu correo', 'Listo'] as const,

  intrigue: {
    eyebrow: 'Planilla y asistencia para tu negocio',
    headline: 'Haz tu planilla en minutos, no en días',
    subheadline:
      'Te armamos una empresa de prueba con empleados de ejemplo y las deducciones de ley de tu país. Mira cómo se calcula la planilla y salen las boletas, sin tocar tus datos reales.',
    motorLabels: ['Asistencia', 'Planilla', 'Boletas'],
    cta: 'Empezar mi prueba gratis',
  },

  step1: {
    title: '¿Cómo es tu negocio?',
    subtitle: 'Con esto armamos una empresa de prueba parecida a la tuya.',
    empleadosHint: (n: number, rangeLabel: string) =>
      `Crearemos ${n} empleado${n === 1 ? '' : 's'} de ejemplo (${rangeLabel}) en áreas como Administración, Bodega, Finanzas y Logística.`,
  },

  step2: {
    title: '¿A qué correo te mandamos tu acceso?',
    subtitle: 'Ahí te llegan tus datos para entrar a la prueba.',
    emailLabel: 'Tu correo *',
  },

  step3: {
    title: 'Último paso',
    subtitle: 'Opcional: déjanos tu WhatsApp si quieres ayuda para conectar tu reloj marcador.',
    submit: 'Crear mi prueba gratis',
    submitting: 'Creando tu prueba…',
    checkbox: 'Entiendo que la prueba usa empleados y datos ficticios, no los de mi empresa.',
    checkboxFine: 'Te ayudamos por WhatsApp o correo.',
  },

  success: {
    title: (name?: string) =>
      name ? `¡Listo, ${name}! Tu prueba ya está creada` : '¡Listo! Tu prueba ya está creada',
    body: (country: string, empresa: string, empleados: number) =>
      `Creamos ${empresa} con ${empleados} empleado${empleados === 1 ? '' : 's'} de ejemplo y las deducciones de ley de ${country}. Tienes 30 días para probarla.`,
    emailHint: (maskedEmail?: string) =>
      `Revisa ${maskedEmail ?? 'tu correo'} (y la carpeta de spam). Ahí están tus datos y el enlace para entrar.`,
    biometricHint:
      '¿Tienes reloj marcador? Responde al correo y te ayudamos a conectarlo, sin costo.',
  },
} as const
