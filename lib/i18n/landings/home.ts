import type { LandingLocale } from '../locale'
import type { LadderPlanKey } from '../../ventas/ladder'

export type HomeCopy = {
  metaKeywords: string
  bannerAria: string
  bannerText: string
  bannerCta: string
  bannerClose: string
  hero: {
    badgeLaws: string
    badgeSpeed: string
    badgeSupport: string
    title: string
    subtitle: string
    ctaQuote: string
    ctaTrial: string
    imageAlt: string
    imageCaption: string
    overlayTitle: string
    overlayStatus: string
    overlayNetLabel: string
    overlayNetValue: string
    overlayTeam: string
  }
  socialProof: {
    titleLead: string
    titleAccent: string
    aria: string
  }
  testimonials: {
    name: string
    company: string
    role: string
    image: string
    imagePosition: string
    quote: string
    rating: number
  }[]
  howItWorks: {
    eyebrow: string
    titleLead: string
    titleAccent: string
    steps: { title: string; desc: string }[]
  }
  freeTools: {
    eyebrow: string
    title: string
    lead: string
  }
  aws: {
    title: string
    dataSecure: string
  }
  stickyWhatsApp: {
    label: string
    aria: string
    prefill: string
  }
  pricing: {
    eyebrow: string
    title: string
    lead: string
    perMonth: string
    /** {price} is the annual price; {n} the number of included clocks. */
    annualOne: string
    annualMany: string
    annualNoClock: string
    /** {fee} is the one-time assisted start on monthly plans. */
    taxNote: string
    quoteLabel: string
    plans: Record<LadderPlanKey, { name: string; desc: string; features: string[]; cta: string }>
    /** {max} is the largest team quoted online. */
    enterprise: { text: string; cta: string }
    trialNote: string
  }
}

const testimonialsEs: HomeCopy['testimonials'] = [
  {
    name: 'Felix G.',
    company: "Tony's Mar Restaurante",
    role: 'Dueño',
    image: '/images/testimonials/felix.jpg',
    imagePosition: 'object-top',
    quote:
      'Siempre descargando la asistencia a una USB, no había control de asistencia. Perdía los domingos batallando con fórmulas de Excel. Ahora cierro planilla en minutos y las muchachas ya no me piden “una corrección más”.',
    rating: 5,
  },
  {
    name: 'Cinthia López',
    company: 'Enlace',
    role: 'Jefa de Personal',
    image: '/images/testimonials/karla.jpg',
    imagePosition: 'object-top',
    quote:
      'Lo que más me quitaba la paz eran las deducciones IHSS, RAP e ISR a mano. Con SISU dejé de ser la máquina de Excel de la empresa.',
    rating: 5,
  },
  {
    name: 'Manuel Sierra',
    company: 'Agrocomercial Ferretero Eben-Ezer',
    role: 'Administrador',
    image: '/images/testimonials/roberto.jpg',
    imagePosition: 'object-top',
    quote:
      'El biométrico y la nómina en un solo servicio fue lo que nos terminó de convencer, redujo los errores y conflictos de fin de cada quincena. Remedio inmediato, verdaderamente.',
    rating: 5,
  },
  {
    name: 'Ligia Mejia',
    company: 'Rooster Cafe',
    role: 'Gerente de RRHH',
    image: '/images/testimonials/nancy.jpg',
    imagePosition: 'object-center',
    quote:
      'Antes necesitaba un experto para operar la gestión de recursos humanos. Desde que activé solamente reviso y listo. Recuperé mi tiempo… y un poco de paz.',
    rating: 5,
  },
  {
    name: 'Jorge Sierra',
    company: 'Grupo Gastro Cueva',
    role: 'Contador',
    image: '/images/testimonials/jorge.jpg',
    imagePosition: 'object-[center_20%]',
    quote:
      'Pasamos de pelear con deducciones y no contar con controles a tener un flujo claro. Se acabaron los reclamos por deducciones mal aplicadas.',
    rating: 5,
  },
]

const testimonialsEn: HomeCopy['testimonials'] = [
  {
    name: 'Felix G.',
    company: "Tony's Mar Restaurante",
    role: 'Owner',
    image: '/images/testimonials/felix.jpg',
    imagePosition: 'object-top',
    quote:
      'We used to dump attendance to a USB — no real attendance control. Sundays were lost fighting Excel formulas. Now I close payroll in minutes and the team stopped asking for “one more correction.”',
    rating: 5,
  },
  {
    name: 'Cinthia López',
    company: 'Enlace',
    role: 'People Lead',
    image: '/images/testimonials/karla.jpg',
    imagePosition: 'object-top',
    quote:
      'What stole my peace was calculating IHSS, RAP and income tax by hand. With SISU I stopped being the company’s Excel machine.',
    rating: 5,
  },
  {
    name: 'Manuel Sierra',
    company: 'Agrocomercial Ferretero Eben-Ezer',
    role: 'Administrator',
    image: '/images/testimonials/roberto.jpg',
    imagePosition: 'object-top',
    quote:
      'Biometrics and payroll in one service sealed the deal — fewer errors and fewer end-of-pay-period conflicts. Truly an immediate remedy.',
    rating: 5,
  },
  {
    name: 'Ligia Mejia',
    company: 'Rooster Cafe',
    role: 'HR Manager',
    image: '/images/testimonials/nancy.jpg',
    imagePosition: 'object-center',
    quote:
      'I used to need an expert to run HR. Since I activated, I just review and done. I got my time back — and a bit of peace.',
    rating: 5,
  },
  {
    name: 'Jorge Sierra',
    company: 'Grupo Gastro Cueva',
    role: 'Accountant',
    image: '/images/testimonials/jorge.jpg',
    imagePosition: 'object-[center_20%]',
    quote:
      'We went from fighting deductions with no controls to a clear flow. Claims about wrong deductions stopped.',
    rating: 5,
  },
]

const byLocale: Record<LandingLocale, HomeCopy> = {
  es: {
    metaKeywords:
      'software recursos humanos, RRHH, control de asistencia, reloj biométrico, huella digital, planillas, nómina, Honduras El Salvador Guatemala, Humano SISU',
    bannerAria: 'Anuncio',
    bannerText: '¿Te cansaste de cuadrar la planilla a mano?',
    bannerCta: 'Mira cómo dejarlo atrás',
    bannerClose: 'Cerrar',
    hero: {
      badgeLaws: 'Adaptado a leyes de CA (HN, SV, GT)',
      badgeSpeed: 'Implementación en 72 horas',
      badgeSupport: 'Soporte local',
      title:
        'Del reloj de asistencia a la planilla de pago, sin intervención manual',
      subtitle: 'Exclusivo para Honduras, El Salvador y Guatemala.',
      ctaQuote: 'Solicitar cotización',
      ctaTrial: 'Probar gratis',
      imageAlt: 'Profesional de RRHH con café y libretas de trabajo',
      imageCaption: 'Contrata hoy tu nueva asistente de RRHH. Digital y automatizada.',
      overlayTitle: 'Planilla quincenal',
      overlayStatus: 'Autorizada',
      overlayNetLabel: 'Neto a pagar',
      overlayNetValue: 'L 248,390',
      overlayTeam: '35 colaboradores',
    },
    socialProof: {
      titleLead: 'Lo que dicen nuestros clientes: ',
      titleAccent: 'el reloj de asistencia integrado a la nómina es la diferencia',
      aria: 'Testimonios de clientes',
    },
    testimonials: testimonialsEs,
    howItWorks: {
      eyebrow: 'Cómo funciona Humano SISU',
      titleLead: 'Sistema de recursos humanos con reloj biométrico de asistencia:',
      titleAccent:
        'huella o facial, planilla automática y menos tareas repetitivas de RRHH para MiPyMes.',
      steps: [
        {
          title: 'Reloj biométrico: el equipo marca entrada con huella o facial.',
          desc: 'El dispositivo captura el dato exacto, previniendo el robo de tiempo y alertando sobre patrones de tardanza.',
        },
        {
          title: 'El cerebro digital procesa',
          desc: 'Cruza las horas reales y calcula deducciones al centavo (IHSS, RAP, ISR) sin que toques una sola hoja de cálculo.',
        },
        {
          title: 'Nómina y comprobantes al instante',
          desc: 'Con un clic, se genera la planilla para gerencia y se envían vouchers PDF por email o WhatsApp a cada colaborador.',
        },
      ],
    },
    freeTools: {
      eyebrow: 'Herramientas gratuitas',
      title: 'Calculadoras del sistema de recursos humanos Humano SISU',
      lead: 'Valida deducciones de sueldo con las mismas reglas legales del software de RRHH Humano SISU. Cuando estés listo, activa el control de asistencia con huella y la nómina completa.',
    },
    aws: {
      title: 'Diseñado por ingenieros certificados AWS.',
      dataSecure: 'Datos cifrados en la nube de AWS.',
    },
    stickyWhatsApp: {
      label: 'Escríbenos por WhatsApp',
      aria: 'Abrir WhatsApp para escribir a Humano SISU',
      prefill: 'Hola, quiero información de Humano SISU',
    },
    pricing: {
      eyebrow: 'Precios',
      title: 'Un precio fijo al mes, sin cobro por empleado',
      lead: 'Todos los planes incluyen colaboradores ilimitados, planilla con IHSS, RAP e ISR, soporte local y actualizaciones de ley. Paga mes a mes sin permanencia, o el año con reloj biométrico incluido.',
      perMonth: 'al mes',
      annualOne: 'o {price} al año, con 1 reloj biométrico incluido',
      annualMany: 'o {price} al año, con {n} relojes biométricos incluidos',
      annualNoClock: 'o {price} al año',
      taxNote: 'ISV incluido. Precios en lempiras. En pago mensual, Esencial y Profesional llevan un arranque asistido único de {fee}.',
      quoteLabel: 'Cotiza',
      plans: {
        basic: {
          name: 'Esencial',
          desc: 'Para formalizar tu planilla desde hoy.',
          features: [
            'Planilla y deducciones de ley (IHSS, RAP, ISR)',
            '13.º y 14.º salario',
            'Asistencia, departamentos y reportes',
          ],
          cta: 'Ver plan Esencial',
        },
        pro: {
          name: 'Profesional',
          desc: 'Para cerrar también liquidaciones y contabilidad.',
          features: ['Todo lo del plan Esencial', 'Cesantías y liquidaciones', 'Contabilidad de planilla'],
          cta: 'Cotizar Profesional',
        },
        enterprise: {
          name: 'Empresarial',
          desc: 'Para equipos que quieren autogestión y desempeño.',
          features: [
            'Todo lo del plan Profesional',
            'Portal de empleados',
            'Evaluaciones de desempeño y descriptores de puesto',
          ],
          cta: 'Cotizar Empresarial',
        },
      },
      enterprise: {
        text: '¿Más de {max} colaboradores? Te armamos un precio a la medida.',
        cta: 'Cotiza aquí',
      },
      trialNote: 'Pruébalo gratis 30 días, sin tarjeta.',
    },
  },
  en: {
    metaKeywords:
      'human resources software, HR software, attendance control, biometric clock, fingerprint attendance, payroll, Honduras El Salvador Guatemala, Humano SISU',
    bannerAria: 'Announcement',
    bannerText: 'Tired of doing payroll by hand?',
    bannerCta: 'See how to stop',
    bannerClose: 'Close',
    hero: {
      badgeLaws: 'Built for CA labor rules (HN, SV, GT)',
      badgeSpeed: 'Go-live in 72 hours',
      badgeSupport: 'Local support',
      title:
        'From the attendance clock to payroll, without manual work',
      subtitle: 'Exclusive to Honduras, El Salvador, and Guatemala.',
      ctaQuote: 'Request a quote',
      ctaTrial: 'Try free',
      imageAlt: 'HR professional with coffee and notebooks',
      imageCaption: 'Hire your new digital HR assistant today. Automated.',
      overlayTitle: 'Biweekly payroll',
      overlayStatus: 'Authorized',
      overlayNetLabel: 'Net pay',
      overlayNetValue: 'L 248,390',
      overlayTeam: '35 employees',
    },
    socialProof: {
      titleLead: 'What our customers say: ',
      titleAccent: 'the attendance clock integrated with payroll is the difference',
      aria: 'Customer testimonials',
    },
    testimonials: testimonialsEn,
    howItWorks: {
      eyebrow: 'How Humano SISU works',
      titleLead: 'Human resources system with a biometric attendance clock:',
      titleAccent: 'fingerprint or facial, automatic payroll, and fewer repetitive HR tasks for SMBs.',
      steps: [
        {
          title: 'Biometric clock: the team clocks in with fingerprint or facial.',
          desc: 'The device captures exact punches, preventing time theft and flagging lateness patterns.',
        },
        {
          title: 'The digital brain processes',
          desc: 'It matches real hours and calculates deductions to the cent (IHSS, RAP, income tax) without a spreadsheet.',
        },
        {
          title: 'Payroll and vouchers instantly',
          desc: 'One click generates the payroll for management and sends PDF vouchers by email or WhatsApp to each employee.',
        },
      ],
    },
    freeTools: {
      eyebrow: 'Free tools',
      title: 'Free calculators from the Humano SISU HR system',
      lead: 'Validate payroll deductions with the same legal rules as Humano SISU HR software. When you are ready, activate fingerprint attendance control and full payroll.',
    },
    aws: {
      title: 'Designed by AWS-certified engineers.',
      dataSecure: 'Data encrypted in the AWS cloud.',
    },
    stickyWhatsApp: {
      label: 'Message us on WhatsApp',
      aria: 'Open WhatsApp to message Humano SISU',
      prefill: 'Hi, I want information about Humano SISU',
    },
    pricing: {
      eyebrow: 'Pricing',
      title: 'One fixed monthly price, no per-employee fees',
      lead: 'Every plan includes unlimited employees, payroll with IHSS, RAP and income tax, local support and legal updates. Pay monthly with no commitment, or yearly with a biometric clock included.',
      perMonth: 'per month',
      annualOne: 'or {price} per year, with 1 biometric clock included',
      annualMany: 'or {price} per year, with {n} biometric clocks included',
      annualNoClock: 'or {price} per year',
      taxNote: 'Sales tax (ISV) included. Prices in lempiras. On monthly billing, Essential and Professional include a one-time assisted start of {fee}.',
      quoteLabel: 'Quote',
      plans: {
        basic: {
          name: 'Essential',
          desc: 'Formalize your payroll today.',
          features: [
            'Payroll and statutory deductions (IHSS, RAP, income tax)',
            '13th and 14th month pay',
            'Attendance, departments and reports',
          ],
          cta: 'See Essential plan',
        },
        pro: {
          name: 'Professional',
          desc: 'Also handle severance and payroll accounting.',
          features: ['Everything in Essential', 'Severance and final settlements', 'Payroll accounting'],
          cta: 'Quote Professional',
        },
        enterprise: {
          name: 'Enterprise',
          desc: 'For teams that want self-service and performance reviews.',
          features: [
            'Everything in Professional',
            'Employee portal',
            'Performance reviews and job descriptions',
          ],
          cta: 'Quote Enterprise',
        },
      },
      enterprise: {
        text: 'More than {max} employees? We build a custom price for you.',
        cta: 'Get a quote',
      },
      trialNote: 'Try it free for 30 days, no credit card.',
    },
  },
}

export function getHomeCopy(locale: LandingLocale): HomeCopy {
  return byLocale[locale] ?? byLocale.es
}
