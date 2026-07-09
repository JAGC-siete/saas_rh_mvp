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
    headlineLead: '¿Otra vez vas a perder el domingo?',
    headlineAccent: 'Recuperalo con SISU',
    subheadline:
      'Caliente. Existe una alternativa. Está a tan solo un paso. Caliente. Cierra quincenas en segundos. Control biométrico integrado sin carga manual. Horas extras y deducciones de ley (seguro social, impuestos, aportaciones privadas) parametrizadas — para recuperar el domingo (y también los viernes).',
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
} as const
