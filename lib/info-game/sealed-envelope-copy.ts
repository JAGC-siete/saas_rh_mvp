/** Copy for /secreto — La paz de cerrar planilla (hero estilo viernes). */

export const SEALED_ENVELOPE_COPY = {
  badge: 'Historia real · 2 min de lectura',

  /** Estado 0 — Intriga (empatía, hero serif) */
  intrigue: {
    eyebrow: '¿Conocés a alguien que perdió la paz cerrando planilla?',
    headlineLead: '¿Esa persona',
    headlineAccent: 'sos vos?',
    subheadline:
      'El último día del mes, cuadrando horas en Excel, persiguiendo marcajes y recalculando IHSS, RAP e ISR hasta la madrugada. Otra vez.',
    mantra:
      'No naciste para vivir dentro de una hoja de Excel. La paz de cerrar planilla en minutos es real, y también la plataforma.',
    cta: 'Quiero recuperar la paz',
    ctaSecondary: 'Validar deducciones gratis',
  },

  /** Estado 1 — Dejanos dónde enviarte la historia */
  unlock: {
    title: '¿A dónde te enviamos la historia?',
    sub: 'Te la mostramos aquí al instante y te la dejamos en el correo con el paso a paso.',
    fields: {
      nombre: { label: 'Nombre', placeholder: '¿Cómo te llamás?' },
      email: { label: 'Correo', placeholder: '¿A dónde te enviamos la historia?' },
      phone: {
        label: 'WhatsApp (Opcional)',
        placeholder: 'Por si preferís que te escribamos por ahí',
      },
      empresa: {
        label: 'Empresa (Opcional)',
        placeholder: '¿Dónde cerrás la planilla?',
      },
    },
    submit: 'Recuperar mi paz',
    submitting: 'Un momento…',
    disclaimer:
      'Sin trial automático ni cobros. Solo la historia y cómo aplicarla. Te salís cuando querás.',
    errors: {
      nombre: 'Indica tu nombre para enviarte la historia.',
      email: 'Indica tu correo; ahí te enviamos la historia.',
      submit: 'No se pudo enviar. Intenta de nuevo.',
      connection: 'Error de conexión. Por favor intenta de nuevo.',
    },
  },

  /** Estado 2 — La historia (on-screen) */
  revealed: {
    badge: '✓ Historia desbloqueada',
    title: 'Cerrar planilla dejó de quitarme el sueño',
    lead: 'El secreto es simple: digitalizar de verdad. Lo difícil es que casi nadie llega.',
    paragraphs: [
      'Durante años, el cierre de planilla fue mi peor semana del mes: bajar marcajes a un USB, pelear con Excel, cuadrar horas extra y rezar para que IHSS, RAP e ISR cerraran bien. Un solo error y volvía a empezar de cero.',
      'La salida existe: cuando el marcaje se conecta al motor legal, las horas y las deducciones se calculan solas y recuperás la paz. Pero entre vos y ese punto hay unas trampas invisibles que frenan a casi todos — son justo las que te voy a mostrar, una por una, en los próximos correos.',
    ],
    comparison: [
      { before: '4 horas un domingo', after: '4 minutos un viernes' },
      { before: 'Miedo a un error en IHSS/RAP', after: 'Cálculo de ley en tiempo real' },
      { before: 'Vos hacés el trabajo repetitivo', after: 'Vos revisás y aprobás' },
    ],
  },

  /** Estado 3 — Cierre (conversación humana, sin gamificación) */
  nextStep: {
    title: '¿Qué sigue?',
    body:
      'Ya tenés la historia en tu bandeja de entrada. No tenés que hacer nada más por hoy. En las próximas horas te mando la primera de las trampas invisibles que nos arrastran de vuelta al trabajo manual —y que te separan de la paz—, aunque la solución sea tan simple como la que acabás de leer.',
    emailHint: 'Buscá un correo de jorgearturo@humanosisu.net — revisá spam si no lo ves.',
    ctaActivar: 'Ver cómo se ve en 30 segundos',
    ctaCalculadora: 'Probar calculadora gratis',
  },
} as const
