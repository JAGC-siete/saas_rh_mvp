/** Copy for /viernes — paz contable, cielo-led (warm B2B). */

export const VIERNES_PUBLIC_PATH = '/viernes'

export const VIERNES_COPY = {
  seo: {
    title: 'Toca el cielo cada viernes | Humano SISU',
    description:
      '¿Otra vez vas a perder el domingo en Excel? Alcanzá la paz contable con biométrico + motor legal IHSS, RAP, ISR. Trial gratis en Honduras, El Salvador y Guatemala.',
  },

  hero: {
    badge: 'Prueba en vivo · 30 días',
    eyebrow: 'Activa SISU',
    headlineLead: '¿Otra vez vas a perder el domingo?',
    headlineAccent: 'Toca el cielo',
    subheadline:
      'La ayuda está a tan solo un paso. Cierra en viernes con biométrico, horas y deducciones de ley (IHSS, RAP, ISR) — y recupera el domingo.',
    mantra: 'No sos una máquina de Excel. El descanso es real, y también la plataforma.',
    ctaPrimary: 'Tocar las nubes',
    ctaSecondary: 'Validar deducciones gratis',
  },

  insight: {
    title: 'El cielo vs. el reprocesamiento',
    lead: 'Digitalizar no es alcanzar la paz.',
    paragraphs: [
      'Muchas empresas ya tienen reloj biométrico… y siguen bajando Excel, pasando USBs y recalculando IHSS a mano. Eso no es modernizar. Es el mismo dolor con pantalla nueva.',
      'Tocar el cielo = el registro entra → el motor legal calcula → la planilla sale. Sin reproceso. Sin domingo perdido.',
    ],
    comparison: [
      { before: '4 horas un domingo', after: '4 minutos un viernes' },
      { before: 'Miedo a error en IHSS/RAP', after: 'Paz contable en tiempo real' },
      { before: 'Tú haces el trabajo repetitivo', after: 'Tú revisas y apruebas' },
    ],
  },

  checklist: {
    title: 'Checklist: cerrar planilla sin perder el domingo',
    sub: '4 pasos. 1 página. El mismo camino que equipos que ya tocaron el cielo.',
    fields: {
      nombre: { label: 'Nombre', placeholder: '¿Cómo te llamamos?' },
      email: { label: 'Correo', placeholder: '¿A dónde enviamos el checklist?' },
    },
    submit: 'Enviame el checklist',
    submitting: 'Enviando…',
    disclaimer:
      'También recibirás acceso al trial gratis. Sin cotización automática. Sin cobro sorpresa.',
    success: {
      title: 'Checklist en camino',
      body: 'Revisá tu correo en los próximos minutos. Mientras tanto, podés tocar las nubes y ver el sistema en acción.',
      ctaActivar: 'Tocar las nubes',
      ctaCalculadora: 'Validar deducciones gratis',
      emailHint: 'Buscá un correo de jorgearturo@humanosisu.net — revisá spam si no lo ves.',
    },
    errors: {
      nombre: 'Indica tu nombre para enviarte el checklist.',
      email: 'Indica tu correo; ahí te enviamos el checklist.',
      submit: 'No se pudo enviar. Intenta de nuevo.',
      connection: 'Error de conexión. Por favor intenta de nuevo.',
    },
  },

  proof: {
    title: 'Lo que cambia cuando dejás el Excel atrás',
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
        'No mágicamente. Pero la mayoría toca el cielo — opera su primera quincena automatizada — en la primera semana de trial.',
    },
    {
      question: '¿Funciona con las leyes de mi país?',
      answer: 'Sí. Motor legal para HN, SV y GT (IHSS, RAP, ISR, ISSS, AFP, IGSS).',
    },
    {
      question: '¿Cuánto cuesta?',
      answer:
        'Trial gratis según política vigente. Cotización personalizada si querés precio antes de activar.',
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
    headlineAccent: 'Recupera el domingo.',
    sub: 'Trial gratis. Sin tarjeta sorpresa. Si preferís hablar con alguien antes: cotización en 24h.',
    primary: 'Tocar las nubes',
    secondary: '¿Más de 30 empleados o varias sucursales? Pedir cotización',
  },

  footer: {
    tag: 'Humano SISU — Paz contable cada viernes.',
    link: 'Ir a humanosisu.net',
  },
} as const
