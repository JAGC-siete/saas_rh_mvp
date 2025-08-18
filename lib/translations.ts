export type Language = 'es' | 'en'

export interface Translations {
  // Header/Navigation
  nav: {
    inicio: string
    servicios: string
    precios: string
    demo: string
    activar: string
  }
  
  // Landing Page
  landing: {
    hero: {
      title: string
      subtitle: string
      cta: string
      ctaDemo: string
    }
    services: {
      title: string
      subtitle: string
      asistencia: {
        title: string
        description: string
        cta: string
      }
      planilla: {
        title: string
        description: string
        cta: string
      }
      reportes: {
        title: string
        description: string
        cta: string
      }
      socialProof: string
    }
    pricing: {
      title: string
      subtitle: string
      trial: string
      cta: string
    }
    footer: {
      privacy: string
      copyright: string
      protection: string
    }
  }
  
  // Activar Page
  activar: {
    hero: {
      title: string
      subtitle: string
      backButton: string
    }
    testimonial: {
      quote: string
      security: string
    }
    howItWorks: {
      title: string
      step1: {
        title: string
        description: string
      }
      step2: {
        title: string
        description: string
      }
      step3: {
        title: string
        description: string
      }
    }
    guarantee: {
      title: string
      description: string
    }
    modules: {
      title: string
      asistencia: {
        title: string
        description: string
      }
      planilla: {
        title: string
        description: string
      }
      vouchers: {
        title: string
        description: string
      }
    }
    form: {
      title: string
      empresa: {
        label: string
        help: string
        placeholder: string
        error: string
        errorLength: string
      }
      nombre: {
        label: string
        help: string
        placeholder: string
        error: string
        errorLength: string
      }
      whatsapp: {
        label: string
        help: string
        placeholder: string
        error: string
        errorFormat: string
      }
      email: {
        label: string
        help: string
        placeholder: string
        error: string
        errorFormat: string
      }
      empleados: {
        label: string
        help: string
      }
      trial: {
        label: string
      }
      submit: {
        loading: string
        default: string
      }
      help: string
      errors: string
    }
    success: {
      title: string
      message: string
      thanks: string
      community: string
      share: string
      social: string
      backButton: string
    }
    trust: {
      acceso: {
        title: string
        description: string
      }
      compromiso: {
        title: string
        description: string
      }
      soporte: {
        title: string
        description: string
      }
    }
  }
}

export const translations: Record<Language, Translations> = {
  es: {
    nav: {
      inicio: 'Inicio',
      servicios: 'Servicios',
      precios: 'Precios',
      demo: 'Demo',
      activar: 'Activar'
    },
    landing: {
      hero: {
        title: 'RH automático en menos de 24 horas',
        subtitle: 'Asistencia, planilla y reportes funcionando. Sin tarjeta. Sin compromiso.',
        cta: 'Solicitar Prueba',
        ctaDemo: 'Ver demo en vivo'
      },
      services: {
        title: 'Todo lo que necesitas para RH',
        subtitle: 'Módulos integrados que funcionan desde el primer día',
        asistencia: {
          title: 'Asistencia en tiempo real',
          description: 'Entradas/salidas, tardanza con justificación, geolocalización',
          cta: 'Solicitar Demo'
        },
        planilla: {
          title: 'Planilla legal HN',
          description: 'IHSS, RAP, ISR automático. Cumple STSS Honduras',
          cta: 'Solicitar Demo'
        },
        reportes: {
          title: 'Reportes ejecutivos',
          description: 'Dashboard con métricas de productividad y cumplimiento',
          cta: 'Solicitar Demo'
        },
        socialProof: 'Pruébalo: 99% menos tiempo corrigiendo errores, IHSS, RAP, ISR, 2025 en 1 click, Cumplimiento STSS desde implementación'
      },
      pricing: {
        title: 'Precios transparentes',
        subtitle: 'Sin sorpresas, sin costos ocultos',
        trial: 'Prueba gratis por 7 días',
        cta: 'Solicitar Demo'
      },
      footer: {
        privacy: 'Política de Privacidad',
        copyright: '© 2025 Humano SISU. Todos los derechos reservados.',
        protection: 'Protegemos tu información. Sin spam, sin venta de datos. Solo para contactarte.'
      }
    },
    activar: {
      hero: {
        title: 'Activa tu RH automático hoy',
        subtitle: 'Asistencia y planilla funcionando en menos de 24 h. Sin tarjeta. Sin compromiso.',
        backButton: 'Volver a inicio'
      },
      testimonial: {
        quote: '"Paragon Financial redujo 80% el tiempo de planilla con SISU."',
        security: 'Seguridad: datos cifrados, roles y auditoría. Soporte por WhatsApp.'
      },
      howItWorks: {
        title: 'Cómo funciona (3 pasos)',
        step1: {
          title: 'Déjanos tus datos',
          description: 'Empresa, WhatsApp y email. Solo eso necesitamos para empezar.'
        },
        step2: {
          title: 'Acceso inmediato',
          description: 'A tu entorno de prueba con datos demo funcionando.'
        },
        step3: {
          title: 'Operativo en 24h',
          description: 'Te lo dejamos corriendo con tus empleados reales.'
        }
      },
      guarantee: {
        title: '🛡️ Garantía de implementación',
        description: 'Si no te lo dejamos funcionando, lo cerramos y listo. Cero costo.'
      },
      modules: {
        title: 'Módulos incluidos en el trial',
        asistencia: {
          title: 'Asistencia en tiempo real',
          description: 'Entradas/salidas, tardanza con justificación.'
        },
        planilla: {
          title: 'Planilla legal HN',
          description: 'IHSS, RAP, ISR; planilla de ejemplo lista.'
        },
        vouchers: {
          title: 'Vouchers',
          description: 'Activables al pasar a plan.'
        }
      },
      form: {
        title: 'Activa tu sistema (1 paso)',
        empresa: {
          label: 'Empresa *',
          help: 'Nombre legal de tu empresa o negocio',
          placeholder: 'Mi Empresa S.A.',
          error: '¿Cómo se llama tu empresa?',
          errorLength: 'El nombre de la empresa debe tener al menos 2 caracteres'
        },
        nombre: {
          label: 'Tu nombre *',
          help: 'Nombre completo de la persona de contacto',
          placeholder: 'María González',
          error: '¿Cuál es tu nombre?',
          errorLength: 'Tu nombre debe tener al menos 2 caracteres'
        },
        whatsapp: {
          label: 'WhatsApp (para login a tu entorno de prueba) *',
          help: 'Formato: +504 9999-9999 (código de área + números con guión)',
          placeholder: '+504 9999-9999',
          error: '¿Cuál es tu número de WhatsApp?',
          errorFormat: 'Formato: +504 9999-9999 (código de área + números con guión)'
        },
        email: {
          label: 'Email (credenciales + facturación) *',
          help: 'Te enviaremos las credenciales de acceso y facturación aquí',
          placeholder: 'admin@miempresa.com',
          error: '¿Cuál es tu email?',
          errorFormat: 'Ingresa un email válido (ej: admin@empresa.com)'
        },
        empleados: {
          label: '# empleados (estimado para dimensionar)',
          help: 'empleados'
        },
        trial: {
          label: '✅ Deseo activar un entorno de prueba automatizado por 7 días. Sin costo.'
        },
        submit: {
          loading: 'Creando tu entorno...',
          default: '🚀 Activar mi sistema ahora'
        },
        help: 'Entorno de prueba por 7 días. Sin costo, sin compromiso.',
        errors: '⚠️ Por favor, corrige los errores antes de continuar'
      },
      success: {
        title: '¡Listo, {nombre}!',
        message: 'Estamos configurando tu entorno de Recursos Humanos. Te mandaremos el acceso por WhatsApp y mail.',
        thanks: '¡Gracias por confiar en SISU!',
        community: 'Tu sistema estará listo en las próximas horas. Mientras tanto, únete a nuestra comunidad.',
        share: 'Comparte SISU con otros empresarios y ayúdanos a automatizar la comunidad de RH en Honduras 🇭🇳',
        social: 'Síguenos en redes sociales',
        backButton: 'Volver a inicio'
      },
      trust: {
        acceso: {
          title: 'Acceso inmediato',
          description: 'Dashboard funcionando en segundos'
        },
        compromiso: {
          title: 'Sin compromiso',
          description: 'Prueba gratis por 7 días'
        },
        soporte: {
          title: 'Soporte incluido',
          description: 'Te ayudamos a implementar'
        }
      }
    }
  },
  en: {
    nav: {
      inicio: 'Home',
      servicios: 'Services',
      precios: 'Pricing',
      demo: 'Demo',
      activar: 'Activate'
    },
    landing: {
      hero: {
        title: 'Automated HR in less than 24 hours',
        subtitle: 'Attendance, payroll and reports working. No card required. No commitment.',
        cta: 'Request Trial',
        ctaDemo: 'See live demo'
      },
      services: {
        title: 'Everything you need for HR',
        subtitle: 'Integrated modules that work from day one',
        asistencia: {
          title: 'Real-time attendance',
          description: 'Clock in/out, tardiness with justification, geolocation',
          cta: 'Request Demo'
        },
        planilla: {
          title: 'Legal payroll HN',
          description: 'Automatic IHSS, RAP, ISR. STSS Honduras compliant',
          cta: 'Request Demo'
        },
        reportes: {
          title: 'Executive reports',
          description: 'Dashboard with productivity and compliance metrics',
          cta: 'Request Demo'
        },
        socialProof: 'Try it: 99% less time fixing errors, IHSS, RAP, ISR, 2025 in 1 click, STSS compliance since implementation'
      },
      pricing: {
        title: 'Transparent pricing',
        subtitle: 'No surprises, no hidden costs',
        trial: 'Free trial for 7 days',
        cta: 'Request Demo'
      },
      footer: {
        privacy: 'Privacy Policy',
        copyright: '© 2025 Humano SISU. All rights reserved.',
        protection: 'We protect your information. No spam, no data selling. Only to contact you.'
      }
    },
    activar: {
      hero: {
        title: 'Activate your automated HR today',
        subtitle: 'Attendance and payroll working in less than 24h. No card required. No commitment.',
        backButton: 'Back to home'
      },
      testimonial: {
        quote: '"Paragon Financial reduced 80% of payroll time with SISU."',
        security: 'Security: encrypted data, roles and auditing. WhatsApp support.'
      },
      howItWorks: {
        title: 'How it works (3 steps)',
        step1: {
          title: 'Give us your data',
          description: 'Company, WhatsApp and email. That\'s all we need to start.'
        },
        step2: {
          title: 'Immediate access',
          description: 'To your trial environment with working demo data.'
        },
        step3: {
          title: 'Operational in 24h',
          description: 'We leave it running with your real employees.'
        }
      },
      guarantee: {
        title: '🛡️ Implementation guarantee',
        description: 'If we don\'t get it working, we close it and that\'s it. Zero cost.'
      },
      modules: {
        title: 'Modules included in trial',
        asistencia: {
          title: 'Real-time attendance',
          description: 'Clock in/out, tardiness with justification.'
        },
        planilla: {
          title: 'Legal payroll HN',
          description: 'IHSS, RAP, ISR; sample payroll ready.'
        },
        vouchers: {
          title: 'Vouchers',
          description: 'Activable when moving to plan.'
        }
      },
      form: {
        title: 'Activate your system (1 step)',
        empresa: {
          label: 'Company *',
          help: 'Legal name of your company or business',
          placeholder: 'My Company Inc.',
          error: 'What\'s your company name?',
          errorLength: 'Company name must have at least 2 characters'
        },
        nombre: {
          label: 'Your name *',
          help: 'Full name of the contact person',
          placeholder: 'John Smith',
          error: 'What\'s your name?',
          errorLength: 'Your name must have at least 2 characters'
        },
        whatsapp: {
          label: 'WhatsApp (for login to your trial environment) *',
          help: 'Format: +504 9999-9999 (area code + numbers with dash)',
          placeholder: '+504 9999-9999',
          error: 'What\'s your WhatsApp number?',
          errorFormat: 'Format: +504 9999-9999 (area code + numbers with dash)'
        },
        email: {
          label: 'Email (credentials + billing) *',
          help: 'We\'ll send you access credentials and billing here',
          placeholder: 'admin@mycompany.com',
          error: 'What\'s your email?',
          errorFormat: 'Enter a valid email (e.g: admin@company.com)'
        },
        empleados: {
          label: '# employees (estimate for sizing)',
          help: 'employees'
        },
        trial: {
          label: '✅ I want to activate an automated trial environment for 7 days. No cost.'
        },
        submit: {
          loading: 'Creating your environment...',
          default: '🚀 Activate my system now'
        },
        help: 'Trial environment for 7 days. No cost, no commitment.',
        errors: '⚠️ Please fix the errors before continuing'
      },
      success: {
        title: 'Ready, {nombre}!',
        message: 'We are configuring your Human Resources environment. We\'ll send you access via WhatsApp and email.',
        thanks: 'Thank you for trusting SISU!',
        community: 'Your system will be ready in the next few hours. Meanwhile, join our community.',
        share: 'Share SISU with other entrepreneurs and help us grow the HR community in Honduras 🇭🇳',
        social: 'Follow us on social media',
        backButton: 'Back to home'
      },
      trust: {
        acceso: {
          title: 'Immediate access',
          description: 'Dashboard working in seconds'
        },
        compromiso: {
          title: 'No commitment',
          description: 'Free trial for 7 days'
        },
        soporte: {
          title: 'Support included',
          description: 'We help you implement'
        }
      }
    }
  }
}

export function getTranslation(lang: Language, key: string): string {
  const keys = key.split('.')
  let value: any = translations[lang]
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      return key // Return key if translation not found
    }
  }
  
  return typeof value === 'string' ? value : key
}

export function formatTranslation(lang: Language, key: string, params: Record<string, string> = {}): string {
  let text = getTranslation(lang, key)
  
  // Replace parameters like {nombre} with actual values
  Object.entries(params).forEach(([param, value]) => {
    text = text.replace(new RegExp(`{${param}}`, 'g'), value)
  })
  
  return text
}
