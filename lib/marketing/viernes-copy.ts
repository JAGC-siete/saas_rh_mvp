/** Copy for /domingos-sin-planilla — paz mental + control operativo; viernes/tiempo como proof point. */

/** Canonical public URL (pages/viernes.tsx served via rewrite). */
export const VIERNES_PUBLIC_PATH = '/domingos-sin-planilla'

/** Internal Pages route / legacy slug. */
export const VIERNES_INTERNAL_PATH = '/viernes'
export const VIERNES_LEGACY_PATHS = [
  '/viernes',
  '/domingo',
  '/domingo-sin-planilla',
  '/planilla-sin-domingos',
] as const

export const VIERNES_COPY = {
  seo: {
    title: 'Recuperá la paz con RR.HH. | Método Humano SISU',
    description:
      '¿El drama de la planilla te quitó la paz? Descargá las claves para digitalizar y automatizar la gestión de RR.HH. en tu MiPyMe sin apagar la operación.',
  },

  hero: {
    badge: 'Guía Express para Dueños y Gerentes · 2 min',
    headlineLead: '¿Perdiste la paz con RR.HH.?',
    subheadline:
      'Haz las paces con nuestro método para digitalizar y automatizar la operación y gestión de recursos humanos para MiPyMes.',
    mantra:
      'No eres una máquina de calcular planillas. Hacer las paces con RR.HH. empieza por destruir el contrato con el papel para digitalizar y automatizar.',
    ctaPrimary: 'Quiero recuperar la paz en RR.HH.',
    ctaSecondary: 'Probar motor de cálculo gratis',
  },

  insight: {
    title: 'Digitalizar no es automatizar',
    lead: 'El verdadero costo de los procesos manuales no es el tiempo invertido; si no la incertidumbre en cada ciclo de pago.',
    paragraphs: [
      'Muchas empresas instalan un reloj biométrico y se digitalizaron. Pero siguen dependiendo reportes a memorias USB, uniendo con tablas en Excel y recalculando deducciones de ley cada vez. La intención es acertada pero la solución incompleta.',
      'Las paces con RR.HH. se hacen cuando los datos viajan por si solos. Cuando el registro biométrico entra, el motor legal almacena, ordena y calcula automáticamente (IHSS, RAP, ISR) y también la planilla lista para aprobación. RR.HH. deja de apagar incendios para dedicarse a tareas que agreguen valor al personal.',
    ],
    comparison: [
      { before: 'Estrés y dudas todo el domingo', after: 'Paz contable y certeza total el viernes' },
      { before: 'Miedo a errores en deducciones de ley', after: 'Cálculo legal automatizado e infalible' },
      { before: 'Haces trabajo repetitivo de software', after: 'Revisas, apruebas y diriges tu empresa' },
    ],
  },

  proof: {
    title: 'Esto es lo que sucede cuando haces las paces con RR.HH.',
    items: [
      'Pasamos del revisar hasta altas horas de la noche o estar cuadrando un domingo por la noche a generar en un par de clicks y aprobar en minutos. La interfaz es moderna y maneja tiene incorporada la ley tal cuál la vivimos los empresarios locales. — PyME manufactura, SPS',
      'Siempre me regresaban la planilla por que algo no cuadraba, si no era el cálculo del seguro social era el impuesto,  todo dejó de ser un dolor de cabeza. Todo cuadra exacto a la primera. — ONG, 45 empleados, TGU',
      'Mismos parámetros  legales  utilizados en las herramientas gratuitas.',
    ],
  },

  faq: [
    {
      question: '¿Cómo me devuelve la paz este método sin descontrolar mi operación?',
      answer:
        'Las claves te muestran paso a paso cómo migrar de Excel a la automatización de forma progresiva. Sin apagar la empresa. La mayoría de MiPyMes procesa su primera quincena automatizada durante la primera semana.',
    },
    {
      question: '¿Me garantiza estar en regla con las leyes locales?',
      answer:
        'Sí. El motor legal está configurado para la normativa de HN, SV y GT (IHSS, RAP, ISR, ISSS, AFP, IGSS). Olvídate del miedo a multas o retenciones mal hechas.',
    },
    {
      question: '¿Cuánto cuesta recuperar la paz operativa?',
      answer:
        'El método y las claves son 100% gratis. Si decides usar el software, tienes un trial gratis sin compromiso.',
    },
    {
      question: '¿Puedo probar la precisión antes de comprometerme?',
      answer:
        'Sí. Usa nuestra calculadora gratuita: utiliza exactamente el mismo motor legal que nuestro software de gestión.',
    },
    {
      question: '¿Necesito ser un experto técnico o contable?',
      answer:
        'Para nada. Si sabes revisar un voucher y dar un clic de aprobación, tenés todo lo necesario para operar SISU.',
    },
  ],

  finalCta: {
    headlineLead: 'Cierra la quincena sin estrés.',
    headlineAccent: 'Haz las paces con RR.HH. hoy mismo.',
    sub: 'Descargá las claves gratis. Cuando estés listo: trial de 30 días o cotización a la medida en 24h.',
    primary: 'Recibir las claves para mi empresa',
    secondary: '¿Más de 30 empleados o varias sucursales? Solicitar propuesta personalizada',
  },

  /** Wizard — same Paper Bridge / claves as /secreto; opener paz con RR.HH. */
  wizard: {
    unlock: {
      title: '¿A dónde te enviamos el método para recuperar la paz?',
      sub: 'Te llega al instante a tu bandeja de entrada. Nombre y correo bastan.',
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
          question: '¿A qué correo te enviamos las claves, {nombre}?',
          placeholder: 'tu@correo.com',
        },
        phone: {
          label: 'WhatsApp (opcional)',
          question: '{nombre}, ¿Querés un aviso por WhatsApp cuando el documento llegue?',
          placeholder: 'Tu número de WhatsApp',
        },
        empresa: {
          label: 'Empresa (opcional)',
          question: '{nombre}, ¿En qué empresa querés eliminar el caos de RR.HH.?',
          placeholder: 'Nombre de tu empresa',
        },
      },
      next: 'Siguiente',
      back: 'Atrás',
      submit: 'Quiero las claves gratis',
      submitting: 'Enviando…',
      disclaimer:
        '100% confidencial. Sin cobros ni tarjeta. Solo el método práctico para digitalizar y automatizar tu operación.',
      errors: {
        nombre: 'Indica tu nombre para enviarte las claves.',
        email: 'Indica tu correo; ahí te enviamos las claves.',
        submit: 'No se pudo enviar. Intenta de nuevo.',
        connection: 'Error de conexión. Por favor intenta de nuevo.',
      },
    },
    revealed: {
      badge: '✓ Claves enviadas con éxito',
      title: 'Revisá tu correo — tu guía de automatización va en camino',
      lead: 'Hacer las paces con RR.HH. = Destruir el puente de papel y poner el dato a viajar solo.',
      paragraphs: [
        'Someter a humanos a realizar tareas repetitivas de software solo genera errores, rotación y pérdida de paz.',
        'En los próximos minutos recibirás las claves exactas para transformar la gestión de tu personal y cerrar tus quincenas sin drama.',
      ],
      comparison: [
        { before: 'Estrés dominical', after: 'Paz operativa' },
        { before: 'Puente de papel', after: 'Dato automatizado' },
        { before: 'Reconstruir datos', after: 'Aprobar con confianza' },
      ],
    },
    nextStep: {
      title: '¿Qué querés hacer mientras llega?',
      emailHint:
        'Revisa tu correo de humanosisu@humanosisu.net (si no lo ves en tu bandeja principal, chequea spam).',
      ctaActivar: 'Ver una demostración en 30 segundos',
      ctaCalculadora: 'Validar deducciones en la calculadora gratis',
    },
  },
} as const
