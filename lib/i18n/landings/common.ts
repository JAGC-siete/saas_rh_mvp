import type { LandingLocale } from '../locale'

export type CommonCopy = {
  contact: string
  joinCommunity: string
  followBlurb: string
  guides: string
  aboutBlurb: string
  aboutCopyright: string
  privacyNotice: string
  privacyNoticeStrong: string
  privacy: string
  terms: string
  rightsReserved: string
  cookies: {
    aria: string
    message: string
    accept: string
    reject: string
    privacyLink: string
    manage: string
  }
  guideLabels: {
    recursos: string
    deduccionesHonduras: string
    biometricoNomina: string
    implementacion48h: string
    alternativaOdoo: string
    domingosSinPlanilla: string
    planBasico: string
  }
}

const byLocale: Record<LandingLocale, CommonCopy> = {
  es: {
    contact: 'Contacto',
    joinCommunity: 'Únete a la Comunidad',
    followBlurb: 'Síguenos en nuestras redes sociales para conocer las últimas actualizaciones',
    guides: 'Guías y recursos',
    aboutBlurb: 'Tecnología de Recursos Humanos integrada para MiPyMes en Centroamérica',
    aboutCopyright: '© 2026 SISU RRHH exclusivo El Salvador | Guatemala | Honduras.',
    privacyNotice: 'Protegemos tu información.',
    privacyNoticeStrong: 'Solo será utilizada para contactarte',
    privacy: 'Política de Privacidad',
    terms: 'Términos de servicio',
    rightsReserved: '© 2026 Humano SISU. Todos los derechos reservados.',
    cookies: {
      aria: 'Consentimiento de cookies',
      message:
        'Usamos cookies técnicas para que el sitio funcione. Con tu permiso, también cookies de analítica y marketing (Google Analytics, Google Ads y Meta Pixel).',
      accept: 'Aceptar',
      reject: 'Solo técnicas',
      privacyLink: 'Política de privacidad',
      manage: 'Gestionar cookies',
    },
    guideLabels: {
      recursos: 'Artículos y guías',
      deduccionesHonduras: 'IHSS, RAP e ISR en Honduras',
      biometricoNomina: 'Biométrico + nómina',
      implementacion48h: 'Implementación biométrica en 72 h',
      alternativaOdoo: 'Complemento a Odoo',
      domingosSinPlanilla: 'Domingos sin planilla',
      planBasico: 'Membresía anual',
    },
  },
  en: {
    contact: 'Contact',
    joinCommunity: 'Join the community',
    followBlurb: 'Follow us on social for the latest updates',
    guides: 'Guides & resources',
    aboutBlurb: 'Integrated HR technology for SMBs in Central America',
    aboutCopyright: '© 2026 SISU HR — exclusive to El Salvador | Guatemala | Honduras.',
    privacyNotice: 'We protect your information.',
    privacyNoticeStrong: 'It will only be used to contact you',
    privacy: 'Privacy Policy',
    terms: 'Terms of service',
    rightsReserved: '© 2026 Humano SISU. All rights reserved.',
    cookies: {
      aria: 'Cookie consent',
      message:
        'We use technical cookies so the site works. With your permission, we also use analytics and marketing cookies (Google Analytics, Google Ads, and Meta Pixel).',
      accept: 'Accept',
      reject: 'Essential only',
      privacyLink: 'Privacy policy',
      manage: 'Manage cookies',
    },
    guideLabels: {
      recursos: 'Articles & guides',
      deduccionesHonduras: 'IHSS, RAP & income tax in Honduras',
      biometricoNomina: 'Biometrics + payroll',
      implementacion48h: 'Biometric go-live in 72 h',
      alternativaOdoo: 'Odoo complement',
      domingosSinPlanilla: 'Sundays without payroll',
      planBasico: 'Annual membership',
    },
  },
}

export function getCommonCopy(locale: LandingLocale): CommonCopy {
  return byLocale[locale] ?? byLocale.es
}
