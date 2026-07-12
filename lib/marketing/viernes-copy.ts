/** Copy for /planilla-sin-domingos — warm B2B: recuperar el viernes via digitalizar/automatizar (info sequence). */

/** Canonical public URL (pages/viernes.tsx served via rewrite). */
export const VIERNES_PUBLIC_PATH = '/planilla-sin-domingos'

/** Internal Pages route / legacy slug. */
export const VIERNES_INTERNAL_PATH = '/viernes'
export const VIERNES_LEGACY_PATHS = ['/viernes', '/domingo'] as const

export const VIERNES_COPY = {
  seo: {
    title: 'Recuperá el viernes | Humano SISU',
    description:
      '¿Otra vez el cierre te come el fin de semana? Recuperá el viernes digitalizando y automatizando el dato — las claves para hacer las paces con RR.HH.',
  },

  hero: {
    badge: 'Claves gratis · 2 min',
    headlineLead: '¿Otro fin de semana perdido?',
    headlineAccent: 'Recuperá el viernes',
    subheadline:
      'La forma de recuperarlo: digitalizar de verdad y automatizar el dato — no más USB, Excel ni detective work el domingo.',
    mantra: 'No sos una máquina de Excel. Hacer las paces con RR.HH. empieza por destruir el puente de papel.',
    ctaPrimary: 'Quiero recuperar el viernes',
    ctaSecondary: 'Validar deducciones gratis',
  },

  insight: {
    title: 'Digitalizar no es automatizar',
    lead: 'Recuperar el viernes no es cambiar de personal.',
    paragraphs: [
      'Muchas empresas ya tienen reloj biométrico… y siguen bajando Excel, pasando USBs y recalculando IHSS a mano. Eso no es modernizar. Es el mismo dolor con pantalla nueva.',
      'Cuando el registro entra → el motor legal calcula → la planilla sale, RR.HH. deja de pelear con el cierre. Vos recuperás el viernes.',
    ],
    comparison: [
      { before: '4 horas un domingo', after: '4 minutos un viernes' },
      { before: 'Miedo a error en IHSS/RAP', after: 'Paz contable en tiempo real' },
      { before: 'Tú haces el trabajo repetitivo', after: 'Tú revisas y apruebas' },
    ],
  },

  proof: {
    title: 'Lo que cambia cuando el dato viaja solo',
    items: [
      'Pasamos de cerrar un domingo completo a revisar y aprobar en una tarde. — PyME manufactura, SPS',
      'El IHSS dejó de ser una adivinanza. — Restaurante, 18 empleados, TGU',
      'Mismo motor legal que nuestras calculadoras gratuitas — ya lo probaste o podés probarlo ahora.',
    ],
  },

  faq: [
    {
      question: '¿Esto reemplaza mi Excel mañana?',
      answer:
        'No mágicamente. Las claves te muestran cómo digitalizar y automatizar sin apagar la operación. La mayoría opera su primera quincena automatizada en la primera semana de trial.',
    },
    {
      question: '¿Funciona con las leyes de mi país?',
      answer: 'Sí. Motor legal para HN, SV y GT (IHSS, RAP, ISR, ISSS, AFP, IGSS).',
    },
    {
      question: '¿Cuánto cuesta?',
      answer:
        'Las claves son gratis. Trial gratis según política vigente. Cotización personalizada si querés precio antes de activar.',
    },
    {
      question: '¿Y si solo quiero validar mi sueldo?',
      answer: 'Usá la calculadora gratis — mismo motor que el software.',
    },
    {
      question: '¿Necesito ser experto en planillas?',
      answer: 'No. Si sabés revisar un voucher, podés usar SISU.',
    },
  ],

  finalCta: {
    headlineLead: 'Cierra la próxima quincena.',
    headlineAccent: 'Recuperá el viernes.',
    sub: 'Primero las claves. Cuando estés listo: trial 30 días o cotización en 24h.',
    primary: 'Activar cuando estés listo',
    activarHref: '/activar?utm_source=viernes&utm_medium=cta-final&utm_campaign=recuperar-viernes',
    secondary: '¿Más de 30 empleados o varias sucursales? Pedir cotización',
  },

  /** Wizard — same Paper Bridge / claves as /secreto; opener “recuperar el viernes”. */
  wizard: {
    unlock: {
      title: '¿A dónde te enviamos las claves?',
      sub: 'Te llegan al instante por correo. Nombre y email bastan.',
      progressLabel: 'Preparando tus claves…',
      stepLabels: ['Nombre', 'Correo', 'WhatsApp', 'Empresa'],
      fields: {
        nombre: {
          label: 'Nombre',
          question: '¿Cómo te llamás?',
          placeholder: 'Tu nombre',
        },
        email: {
          label: 'Correo',
          question: '¿A dónde te mandamos las claves para recuperar el viernes, {nombre}?',
          placeholder: 'tu@correo.com',
        },
        phone: {
          label: 'WhatsApp (opcional)',
          question: '{nombre}, ¿Querés un aviso por WhatsApp cuando lleguen?',
          placeholder: 'Tu número de WhatsApp',
        },
        empresa: {
          label: 'Empresa (opcional)',
          question: '{nombre}, ¿En qué empresa querés recuperar el viernes?',
          placeholder: 'Nombre de tu empresa',
        },
      },
      next: 'Siguiente',
      back: 'Atrás',
      submit: 'Enviame las claves',
      submitting: 'Enviando…',
      disclaimer:
        'Sin trial ni cobros. Solo las claves para digitalizar, automatizar y recuperar el viernes.',
      errors: {
        nombre: 'Indica tu nombre para enviarte las claves.',
        email: 'Indica tu correo; ahí te enviamos las claves.',
        submit: 'No se pudo enviar. Intenta de nuevo.',
        connection: 'Error de conexión. Por favor intenta de nuevo.',
      },
    },
    revealed: {
      badge: '✓ Claves en camino',
      title: 'Revisá tu correo — el documento ya salió',
      lead: 'Recuperar el viernes = destruir el puente de papel. Digitalizar de verdad. Automatizar el dato.',
      paragraphs: [
        'El error fatal: reloj → Excel → WhatsApp → detective. Eso no es culpa de RR.HH. Es someter humanos al trabajo de un software.',
        'En los próximos correos: las claves para hacer las paces con RR.HH. y que el cierre deje de comerte el fin de semana.',
      ],
      comparison: [
        { before: '4 horas un domingo', after: '4 minutos un viernes' },
        { before: 'Puente de papel', after: 'El dato viaja solo' },
        { before: 'Vos reconstruís', after: 'Vos revisás y aprobás' },
      ],
    },
    nextStep: {
      title: '¿Qué sigue?',
      emailHint: 'Buscá un correo de jorgearturo@humanosisu.net — revisá spam si no lo ves.',
      ctaActivar: 'Ver cómo se ve en 30 segundos',
      ctaCalculadora: 'Validar deducciones gratis',
    },
  },
} as const
