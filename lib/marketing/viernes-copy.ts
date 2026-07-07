/** Copy for /viernes — conversión directa (dolor domingo + insight + checklist). */

export const VIERNES_PUBLIC_PATH = '/viernes'

export const VIERNES_COPY = {
  seo: {
    title: 'Cierra planilla en 4 minutos, no en 4 horas | Humano SISU',
    description:
      '¿Otra vez vas a perder el domingo en Excel? Biométrico + motor legal IHSS, RAP, ISR. Trial gratis en Honduras, El Salvador y Guatemala.',
  },

  hero: {
    eyebrow: 'Para dueños de negocio y equipos de RRHH en Honduras, El Salvador y Guatemala',
    headline: '¿Otra vez vas a perder el domingo cerrando planilla en Excel?',
    subheadline:
      'No necesitas otro truco. Necesitas que el biométrico, las horas y las deducciones de ley (IHSS, RAP, ISR) se cierren solas — y que tú solo revises y apruebes.',
    mantra: 'No eres una máquina de Excel. Eres quien dirige el negocio.',
    ctaPrimary: 'Ver cómo se cierra una quincena en 4 minutos',
    ctaSecondary: '¿Primero quieres validar el cálculo? Prueba la calculadora gratis',
  },

  insight: {
    title: 'El error que cuesta 4 horas cada quincena',
    lead: 'Digitalizar no es automatizar.',
    paragraphs: [
      'Muchas empresas ya tienen reloj biométrico… y siguen bajando Excel, pasando USBs y recalculando IHSS a mano. Eso no es modernizar. Es el mismo dolor con pantalla nueva.',
      'Automatizar = el registro entra → el motor legal calcula → la planilla sale. Sin reproceso. Sin domingo.',
    ],
    comparison: [
      { before: '4 horas un domingo', after: '4 minutos un viernes' },
      { before: 'Miedo a error en IHSS/RAP', after: 'Cálculo legal en tiempo real' },
      { before: 'Tú haces el trabajo repetitivo', after: 'Tú revisas y apruebas' },
    ],
  },

  checklist: {
    title: 'Checklist: cerrar planilla sin perder el domingo',
    sub: '4 pasos. 1 página. El mismo criterio que usan equipos que ya automatizaron.',
    fields: {
      nombre: { label: 'Nombre', placeholder: '¿Cómo te llamamos?' },
      email: { label: 'Correo', placeholder: '¿A dónde enviamos el checklist?' },
    },
    submit: 'Enviarme el checklist',
    submitting: 'Enviando…',
    disclaimer:
      'También recibirás acceso al trial gratis. Sin cotización automática. Sin cobro sorpresa.',
    success: {
      title: 'Checklist en camino',
      body: 'Revisa tu correo en los próximos minutos. Mientras tanto, puedes activar el trial y ver el sistema en acción.',
      ctaActivar: 'Activar trial gratis',
      ctaCalculadora: 'Probar calculadora gratis',
      emailHint: 'Busca un correo de jorgearturo@humanosisu.net — revisa spam si no lo ves.',
    },
    errors: {
      nombre: 'Indica tu nombre para enviarte el checklist.',
      email: 'Indica tu correo; ahí te enviamos el checklist.',
      submit: 'No se pudo enviar. Intenta de nuevo.',
      connection: 'Error de conexión. Por favor intenta de nuevo.',
    },
  },

  proof: {
    title: 'Lo que cambia cuando dejas el Excel',
    items: [
      'Pasamos de cerrar un domingo completo a revisar y aprobar en una tarde. — PyME manufactura, SPS',
      'El IHSS dejó de ser una adivinanza. — Restaurante, 18 empleados, TGU',
      'Mismo motor legal que nuestras calculadoras gratuitas — ya lo probaste o puedes probarlo ahora.',
    ],
  },

  faq: [
    {
      question: '¿Esto reemplaza mi Excel mañana?',
      answer:
        'No mágicamente. Pero la mayoría opera su primera quincena automatizada en la primera semana de trial.',
    },
    {
      question: '¿Funciona con las leyes de mi país?',
      answer:
        'Sí. Motor legal para HN, SV y GT (IHSS, RAP, ISR, ISSS, AFP, IGSS).',
    },
    {
      question: '¿Cuánto cuesta?',
      answer:
        'Trial gratis según política vigente. Cotización personalizada si quieres precio antes de activar.',
    },
    {
      question: '¿Y si solo quiero validar mi sueldo?',
      answer:
        'Usa la calculadora gratis — mismo motor que el software.',
    },
    {
      question: '¿Necesito ser experto en planillas?',
      answer: 'No. Si sabes revisar un voucher, puedes usar SISU.',
    },
  ],

  finalCta: {
    headline: 'Cierra la próxima quincena. Recupera tu domingo.',
    sub: 'Trial gratis. Sin tarjeta sorpresa. Si prefieres hablar con alguien antes: cotización en 24h.',
    primary: 'Activar trial gratis',
    secondary: '¿Más de 30 empleados o varias sucursales? Pedir cotización',
  },

  footer: {
    tag: 'Humano SISU — Cierra en viernes, descansa el domingo.',
    link: 'Ir a humanosisu.net',
  },
} as const
