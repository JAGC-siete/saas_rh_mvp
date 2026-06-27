/** Copy for /activar — Encender el motor (warm B2B, symptom-led). */

export const MOTOR_ENCENDIDO_COPY = {
  badge: 'Prueba en vivo · 30 días',

  intrigue: {
    headline: '¿Cuántas horas te come el Excel a fin de quincena?',
    subheadline:
      'Encendé un entorno de prueba con leyes locales ya cargadas. Sin tarjeta. Empleados ficticios para ver la nómina correr sola.',
    motorLabels: ['Captura', 'Cálculo', 'Comprobante'],
    cta: 'Encender mi entorno de prueba',
  },

  step1: {
    title: 'Calibrar el motor',
    subtitle: 'País y tamaño del equipo de prueba.',
    empleadosHint: (n: number) =>
      `Crearemos ${n} ficha${n === 1 ? '' : 's'} con marcajes y salarios de ejemplo.`,
  },

  step2: {
    title: '¿A dónde mandamos la llave?',
    subtitle: 'Empresa y correo de acceso.',
  },

  step3: {
    title: 'Último paso',
    subtitle: 'Opcional: WhatsApp solo si quieres ayuda con el biométrico.',
    submit: 'Encender motor',
    submitting: 'Parametrizando leyes y creando empleados…',
    checkbox:
      'Quiero encender el entorno ahora. Entiendo que se generará información ficticia para evaluar la automatización.',
    checkboxFine: '30 días · Sin tarjeta · Soporte regional',
  },

  success: {
    title: (name: string) => `Motor encendido, ${name}`,
    body: (country: string, empresa: string, empleados: number) =>
      `Tu entorno en ${country} está listo para ${empresa} — ${empleados} empleado${empleados === 1 ? '' : 's'} de prueba con leyes locales cargadas.`,
    emailHint: 'Revisá tu correo (y spam). Ahí está la llave de acceso.',
    biometricHint:
      '¿Quieres conectar tu reloj biométrico? Respondé al correo y te guiamos sin costo.',
  },
} as const
