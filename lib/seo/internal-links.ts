/** Enlaces internos hacia landings SEO/Ads y contenido, para evitar páginas huérfanas. */

export interface GuideLink {
  href: string
  label: string
  /** Descripción corta para cards (opcional). */
  description?: string
}

/** Guías y landings estratégicas (cluster SEO + Google Ads). */
export const GUIDE_LINKS: Record<string, GuideLink> = {
  recursos: {
    href: '/recursos',
    label: 'Artículos y guías',
    description: 'Contenido sobre automatización de RH y nómina local'
  },
  deduccionesHonduras: {
    href: '/deducciones-honduras-ihss-rap-isr',
    label: 'IHSS, RAP e ISR en Honduras',
    description: 'Guía completa de deducciones de ley con preguntas frecuentes'
  },
  biometricoNomina: {
    href: '/sistema-biometrico-nomina',
    label: 'Biométrico + nómina',
    description: 'Asistencia y planilla integradas en un solo sistema'
  },
  implementacion48h: {
    href: '/implementacion-48-horas',
    label: 'Implementación en 48 h',
    description: 'Activa asistencia y nómina sin esperas'
  },
  alternativaOdoo: {
    href: '/alternativa-odoo-honduras',
    label: 'Alternativa a Odoo',
    description: 'Compara Humano SISU con Odoo para RH regional'
  }
} as const

/** Orden de las landings para el footer global. */
export const FOOTER_GUIDE_KEYS: Array<keyof typeof GUIDE_LINKS> = [
  'recursos',
  'deduccionesHonduras',
  'biometricoNomina',
  'implementacion48h',
  'alternativaOdoo'
]

/** Cross-links "También te puede interesar" por landing (clave = ruta actual). */
export const RELATED_GUIDES: Record<string, Array<keyof typeof GUIDE_LINKS>> = {
  '/alternativa-odoo-honduras': ['implementacion48h', 'biometricoNomina', 'deduccionesHonduras'],
  '/sistema-biometrico-nomina': ['deduccionesHonduras', 'implementacion48h', 'alternativaOdoo'],
  '/implementacion-48-horas': ['alternativaOdoo', 'biometricoNomina', 'recursos'],
  '/deducciones-honduras-ihss-rap-isr': ['biometricoNomina', 'recursos', 'alternativaOdoo']
}
