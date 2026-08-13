import type { LandingLocale } from '../locale'

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
    lead: string
    ctaQuote: string
    ctaTrial: string
    finePrint: string
    nextPayday: string
    imageAlt: string
    imageCaption: string
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
    designedBy: string
    dataSecureLabel: string
    dataSecure: string
    guarantee: string
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
      'El biométrico y la nómina en un solo servicio fué lo que nos terminó de convencer, redujo los errores y conflictos de fin de cada quincena. Remedio inmediato, verdaderamente.',
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
    bannerText: '¿Problemas de Recursos Humanos 😰?',
    bannerCta: 'Dale click aquí',
    bannerClose: 'Cerrar',
    hero: {
      badgeLaws: 'Adaptado a leyes de CA (HN, SV, GT)',
      badgeSpeed: 'Implementación rápida',
      badgeSupport: 'Soporte local',
      title: 'SISU — Tecnología de Recursos Humanos integrada para MiPyMes en Centroamérica',
      subtitle: 'Exclusivo para Honduras, El Salvador y Guatemala.',
      lead: 'Sistema de RRHH integrado. Del reloj biométrico de asistencia (huella o facial) a la planilla, sin intervención manual.',
      ctaQuote: 'Solicitar cotización',
      ctaTrial: 'Probar gratis',
      finePrint: 'Cotización sin costo. Prueba con límites del trial según política vigente.',
      nextPayday: 'Próximo cierre de planilla (referencia):',
      imageAlt: 'Profesional de RRHH en oficina, con café y libretas de trabajo',
      imageCaption: 'Contrata hoy tu nueva asistente de RRHH. Digital y Automatizado.',
    },
    socialProof: {
      titleLead: 'Clientes de SISU lo certifican: ',
      titleAccent:
        'el control de asistencia con huella y el reloj biométrico integrados a la nómina son la ventaja verdadera',
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
          desc: 'Cruza las horas reales y calcula deducciones al centavo (IHSS, RAP, ISR) sin que toqués una sola hoja de cálculo.',
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
      title: 'Potenciada con la tecnología de la nube utilizada por gigantes mundiales como Netflix o Airbnb.',
      designedBy: 'Diseñada por ingenieros certificados',
      dataSecureLabel: 'Datos seguros:',
      dataSecure: 'Infraestructura AWS regional encriptada',
      guarantee: 'Garantía de calidad y seguridad certificada por AWS',
    },
  },
  en: {
    metaKeywords:
      'human resources software, HR software, attendance control, biometric clock, fingerprint attendance, payroll, Honduras El Salvador Guatemala, Humano SISU',
    bannerAria: 'Announcement',
    bannerText: 'HR headaches 😰?',
    bannerCta: 'Click here',
    bannerClose: 'Close',
    hero: {
      badgeLaws: 'Built for CA labor rules (HN, SV, GT)',
      badgeSpeed: 'Fast implementation',
      badgeSupport: 'Local support',
      title: 'SISU — Integrated HR technology for SMBs in Central America',
      subtitle: 'Exclusive to Honduras, El Salvador, and Guatemala.',
      lead: 'Integrated HR system. From biometric attendance clock (fingerprint or facial) to payroll, without manual busywork.',
      ctaQuote: 'Request a quote',
      ctaTrial: 'Try free',
      finePrint: 'No-cost quote. Trial limits follow the current policy.',
      nextPayday: 'Next payroll close (reference):',
      imageAlt: 'HR professional in an office with coffee and notebooks',
      imageCaption: 'Hire your new digital HR assistant today. Automated.',
    },
    socialProof: {
      titleLead: 'SISU customers confirm it: ',
      titleAccent:
        'fingerprint attendance control and a biometric clock tied to payroll are the real advantage',
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
      title: 'Powered by the same cloud technology used by global giants like Netflix and Airbnb.',
      designedBy: 'Designed by certified engineers',
      dataSecureLabel: 'Secure data:',
      dataSecure: 'Encrypted regional AWS infrastructure',
      guarantee: 'Quality and security assurance certified by AWS',
    },
  },
}

export function getHomeCopy(locale: LandingLocale): HomeCopy {
  return byLocale[locale] ?? byLocale.es
}
