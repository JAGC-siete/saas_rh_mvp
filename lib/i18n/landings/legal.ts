import type { LandingLocale } from '../locale'

export type LegalPageCopy = {
  metaTitle: string
  metaDescription: string
  breadcrumbHome: string
  breadcrumbLabel: string
  backHome: string
  title: string
  lastUpdated: string
  /** Shown for EN when Spanish body remains authoritative. */
  authorityBanner: string | null
  headings: string[]
  intro: string
  cookiesParagraphs: string[]
}

export type LegalCopy = {
  privacy: LegalPageCopy
  terms: LegalPageCopy
}

const byLocale: Record<LandingLocale, LegalCopy> = {
  es: {
    privacy: {
      metaTitle: 'Política de Privacidad | Humano SISU',
      metaDescription:
        'Política de privacidad y manejo de datos de Humano SISU. Contacto, conservación y derechos de datos en El Salvador, Guatemala y Honduras.',
      breadcrumbHome: 'Inicio',
      breadcrumbLabel: 'Política de privacidad',
      backHome: '← Volver al inicio',
      title: 'Política de Privacidad',
      lastUpdated: 'Última actualización: 13 de septiembre de 2026',
      authorityBanner: null,
      headings: [
        '1) Responsable',
        '2) Datos que recopilamos',
        '3) Finalidades',
        '4) Base legal',
        '5) Conservación',
        '6) Destinatarios y encargados',
        '7) Cookies',
        '8) Tus derechos',
        '9) Seguridad',
        '10) Cambios a esta política',
      ],
      intro:
        'Humano SISU (“nosotros”), con operación en El Salvador, Guatemala y Honduras. Contacto: humanosisu@humanosisu.net | 504 32226773',
      cookiesParagraphs: [
        'Usamos cookies técnicas necesarias para que el sitio funcione (sesión, preferencia de tema, consentimiento).',
        'Con tu consentimiento explícito (banner Aceptar) cargamos cookies y tecnologías similares de analítica y marketing: Google Analytics 4, Google Ads y Meta Pixel. Si elegís “Solo técnicas”, esos scripts no se cargan.',
        'Podés cambiar tu elección en cualquier momento con “Gestionar cookies” en el pie de página.',
      ],
    },
    terms: {
      metaTitle: 'Términos de servicio | Humano SISU',
      metaDescription:
        'Términos de uso del sitio y del software Humano SISU (nómina y recursos humanos) en El Salvador, Guatemala y Honduras.',
      breadcrumbHome: 'Inicio',
      breadcrumbLabel: 'Términos de servicio',
      backHome: '← Volver al inicio',
      title: 'Términos de servicio',
      lastUpdated: 'Última actualización: 15 de abril de 2026',
      authorityBanner: null,
      headings: [
        '1) Quién ofrece el servicio',
        '2) Uso del sitio web',
        '3) Cuenta, prueba y suscripción',
        '4) Exactitud y cumplimiento normativo',
        '5) Disponibilidad y soporte',
        '6) Limitación de responsabilidad',
        '7) Datos personales',
        '8) Cambios',
      ],
      intro:
        'Humano SISU es un software de gestión de recursos humanos y nómina orientado a empresas en El Salvador, Guatemala y Honduras. Contacto: humanosisu@humanosisu.net | 504 32226773 (WhatsApp).',
      cookiesParagraphs: [],
    },
  },
  en: {
    privacy: {
      metaTitle: 'Privacy Policy | Humano SISU',
      metaDescription:
        'Humano SISU privacy policy and data handling. Contact, retention, and data rights in El Salvador, Guatemala, and Honduras.',
      breadcrumbHome: 'Home',
      breadcrumbLabel: 'Privacy policy',
      backHome: '← Back to home',
      title: 'Privacy Policy',
      lastUpdated: 'Last updated: September 13, 2026',
      authorityBanner: 'Spanish legal text is authoritative; English summary available for chrome and headings.',
      headings: [
        '1) Controller',
        '2) Data we collect',
        '3) Purposes',
        '4) Legal basis',
        '5) Retention',
        '6) Recipients and processors',
        '7) Cookies',
        '8) Your rights',
        '9) Security',
        '10) Changes to this policy',
      ],
      intro:
        'Humano SISU (“we”), operating in El Salvador, Guatemala, and Honduras. Contact: humanosisu@humanosisu.net | 504 32226773',
      cookiesParagraphs: [
        'We use technical cookies needed for the site to work (session, theme preference, consent).',
        'With your explicit consent (Accept on the banner) we load analytics and marketing cookies: Google Analytics 4, Google Ads, and Meta Pixel. If you choose “Essential only”, those scripts do not load.',
        'You can change your choice at any time with “Manage cookies” in the footer.',
      ],
    },
    terms: {
      metaTitle: 'Terms of service | Humano SISU',
      metaDescription:
        'Terms of use for the Humano SISU site and software (payroll and HR) in El Salvador, Guatemala, and Honduras.',
      breadcrumbHome: 'Home',
      breadcrumbLabel: 'Terms of service',
      backHome: '← Back to home',
      title: 'Terms of service',
      lastUpdated: 'Last updated: April 15, 2026',
      authorityBanner: 'Spanish legal text is authoritative; English summary available for chrome and headings.',
      headings: [
        '1) Who provides the service',
        '2) Website use',
        '3) Account, trial, and subscription',
        '4) Accuracy and regulatory compliance',
        '5) Availability and support',
        '6) Limitation of liability',
        '7) Personal data',
        '8) Changes',
      ],
      intro:
        'Humano SISU is HR and payroll management software for companies in El Salvador, Guatemala, and Honduras. Contact: humanosisu@humanosisu.net | 504 32226773 (WhatsApp).',
      cookiesParagraphs: [],
    },
  },
}

export function getLegalCopy(locale: LandingLocale): LegalCopy {
  return byLocale[locale] ?? byLocale.es
}
