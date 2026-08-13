/** Copy for /secreto — La paz de cerrar planilla (hero estilo viernes). */

export const SEALED_ENVELOPE_COPY = {
  badge: 'Historia real · 2 min de lectura',

  /** Estado 0 — Intriga (empatía, hero serif) */
  intrigue: {
    headlineLead: '¿Conocés a alguien que perdió la paz con Recursos Humanos?',
    headlineAccent:
      'Siempre amargados. Luchando por que todos lleguen a tiempo. A veces celebran cumpleaños. Se tardan meses para entregar una constancia de trabajo. El día de cierre, cuadrando horas extra en Excel, recalculando deducciones hasta la madrugada. Otra vez.',
    subheadline: '¿Eres esa persona?',
    cta: 'Revelar los 4 fallos ocultos',
    ctaSecondary: 'Validar deducciones gratis',
  },

  /** Encabezado de la sección del wizard (debajo del hero). */
  wizardIntro: {
    title: 'Los 4 fallos que rompen la cultura con RR.HH.',
    sub: '4 sencillos pasos. La historia completa al instante y 4 claves por correo.',
  },

  /** Estado 1 — Wizard paso a paso (uno a uno con barra de progreso) */
  unlock: {
    title: '¿A dónde te enviamos la clave?',
    sub: 'Te la mostramos aquí al instante y te la dejamos en el correo con el paso a paso.',
    progressLabel: 'Recuperando tu paz…',
    stepLabels: ['Nombre', 'Correo', 'WhatsApp', 'Empresa'],
    fields: {
      nombre: {
        label: 'Nombre',
        question: '¿Cómo te llamás, colega?',
        placeholder: 'Tu nombre',
      },
      email: {
        label: 'Correo',
        question: '¿A dónde te enviamos la clave, {nombre}?',
        placeholder: 'tu@correo.com',
      },
      phone: {
        label: 'WhatsApp (opcional)',
        question: '{nombre}, ¿Querés que te avisemos por WhatsApp?',
        placeholder: 'Tu número de WhatsApp',
      },
      empresa: {
        label: 'Empresa (opcional)',
        question: '{nombre}, ¿Qué empresa desea hacer las paces con RR.HH.?',
        placeholder: 'Nombre de tu empresa',
      },
    },
    next: 'Siguiente',
    back: 'Atrás',
    submit: 'Recuperar mi paz',
    submitting: 'Un momento…',
    disclaimer:
      'Sin trial ni cobros. Solo las claves y cómo aplicarlas.',
    errors: {
      nombre: 'Indica tu nombre para enviarte la clave.',
      email: 'Indica tu correo; ahí te enviamos la clave.',
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
      'La salida existe: cuando enlazas el marcaje a la compu, las horas y las deducciones se calculan solas y vos recuperás la paz. Pero para llegar ahí hay algunas claves — nos leemos en los próximos correos.',
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
    emailHint: 'Buscá un correo de humanosisu@humanosisu.net — revisá spam si no lo ves.',
    ctaActivar: 'Ver cómo se ve en 30 segundos',
    ctaCalculadora: 'Probar calculadora gratis',
  },
} as const
