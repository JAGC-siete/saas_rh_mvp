/** Copy for /activar — Tocar el cielo (warm B2B, peace-led). */

export const MOTOR_ENCENDIDO_COPY = {
  badge: 'Prueba en vivo · 30 días',

  progressTitle: 'Tocar el cielo',
  wizardSteps: ['Nubes', 'Acceso', 'Cielo'] as const,

  intrigue: {
    eyebrow: 'Activa SISU',
    headline: 'Toca el cielo',
    subheadline:
      'La ayuda a tan solo un paso. Registrate hoy. El descanso es real, y también la plataforma. (El cielo también es real)',
    motorLabels: ['Captura', 'Cálculo', 'Comprobante'],
    cta: 'Tocar las nubes',
  },

  step1: {
    title: 'Elegí tu altitud',
    subtitle: 'País y tamaño del equipo de prueba en las nubes.',
    empleadosHint: (n: number) =>
      `Crearemos ${n} ficha${n === 1 ? '' : 's'} con marcajes y salarios de ejemplo para que veas la paz contable.`,
  },

  step2: {
    title: '¿A dónde mandamos las llaves del cielo?',
    subtitle: 'Empresa y correo donde llegarán tus credenciales.',
    emailLabel: 'Email para recibir las llaves *',
  },

  step3: {
    title: 'Último paso antes de tocar el cielo',
    subtitle: 'Opcional: WhatsApp solo si quieres ayuda con el biométrico.',
    submit: 'Enviame las llaves',
    submitting: 'Preparando nubes y creando empleados de prueba…',
    checkbox:
      'Quiero subir al entorno ahora. Entiendo que se generará información ficticia para evaluar la automatización.',
    checkboxFine: '30 días · Sin tarjeta · Soporte regional',
  },

  success: {
    title: (name: string) => `Las llaves al cielo han sido enviadas, ${name}`,
    body: (_country: string, empresa: string, empleados: number) =>
      `Tu paraíso de RRHH está listo para ${empresa} — ${empleados} empleado${empleados === 1 ? '' : 's'} de prueba con legislación local. Disfruta del cielo hoy en la tierra.`,
    emailHint: 'Revisá tu correo (y spam).',
    biometricHint:
      '¿Quieres conectar tu reloj biométrico? Respondé al correo y te guiamos sin costo hacia la paz operativa.',
  },
} as const
