/** Copy for /suscripcion — cold employee track: salary alerts (not SaaS newsletter). */

export const RECIBO_ALERTAS_COPY = {
  /** Cold / direct / nav — no prior calculator session assumed. */
  cold: {
    badge: 'Gratis · HN · SV · GT',
    headline: '¿Tu recibo te deja dudas?',
    subheadline:
      'Alertas de fechas legales y cambios en deducciones — en lenguaje claro, sin jerga de RRHH.',
  },

  /** Post-calculator bridge — continuity without fake “saved result”. */
  fromCalculator: {
    badge: 'Desde la calculadora',
    headline: 'Guardá lo que acabás de validar',
    subheadline:
      'Te avisamos cuando cambie la ley o lleguen fechas que afectan tu sueldo — aguinaldo, catorceavo y más.',
  },

  valueBullets: [
    'Fechas que importan: aguinaldo, catorceavo y plazos legales',
    'Avisos cuando cambian deducciones de ley',
    'Guías para leer tu recibo sin jerga de RRHH',
  ],

  form: {
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
    submit: 'Activar alertas gratis',
    submitting: 'Activando…',
    disclaimer: 'Gratis. Sin spam. Solo fechas y cambios que afectan tu sueldo.',
  },

  secondaryCalcCta: {
    label: 'Primero calcular gratis',
    href: '/calculadora?utm_source=suscripcion&utm_medium=hero&utm_campaign=cold-calc',
  },

  revealed: {
    badge: 'Alertas activadas',
    title: 'Listo — revisá tu correo',
    body: [
      'Te mandamos la primera nota con lo esencial para entender tu recibo.',
      'De acá en adelante: recordatorios de aguinaldo, catorceavo y cambios en deducciones — sin jerga de RRHH.',
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
