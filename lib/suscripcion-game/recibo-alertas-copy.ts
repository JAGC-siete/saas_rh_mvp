/** Copy for /suscripcion — Recibo desglosado (employee audience). */

export const RECIBO_ALERTAS_COPY = {
  badge: 'Resultado guardado',

  intrigue: {
    headline: '¿Te cuadró lo que te descontaron?',
    subheadline:
      'Mucha gente confía en el número del recibo sin revisarlo. Vos acabás de hacer lo contrario.',
    receiptLabel: 'TU RECIBO · VISTA PREVIA',
    receiptHint: 'Compará esto con tu próximo recibo de sueldo.',
    cta: 'Activar mis alertas',
  },

  unlock: {
    progressLabel: 'Guardando tu resultado…',
    fields: {
      nombre: {
        label: 'Nombre',
        placeholder: '¿Cómo te llamamos?',
      },
      email: {
        label: 'Correo',
        placeholder: '¿A dónde te mandamos las alertas?',
      },
    },
    submit: 'Activar alertas',
    submitting: 'Guardando…',
    disclaimer: 'Te avisamos de fechas legales y cambios que afectan tu sueldo.',
  },

  revealed: {
    badge: 'Alertas activadas',
    title: 'Listo — revisá tu correo',
    body: [
      'Te mandamos por escrito lo que calculaste, para que lo guardes o lo compares con tu próximo recibo.',
      'De acá en adelante recibirás recordatorios de aguinaldo, catorceavo y cambios en deducciones — sin jerga de RRHH.',
    ],
    bullets: [
      'Recordatorios de fechas que importan',
      'Explicaciones cuando cambian deducciones',
      'Guías para entender tu recibo',
    ],
  },

  nextStep: {
    title: '¿Qué sigue?',
    body: 'La primera nota llega mañana. Hoy no tenés que hacer nada más.',
    emailHint: 'Buscá un correo de jorgearturo@humanosisu.net — revisá spam si no lo ves.',
    ctaCalculadora: 'Calcular otra cosa',
    ctaShare: 'Compartir calculadora con RRHH',
  },
} as const

export const UNLOCK_PROGRESS = {
  nombre: 50,
  email: 50,
} as const

export const UNLOCK_PROGRESS_MAX = 100
