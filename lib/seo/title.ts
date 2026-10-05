/**
 * Helper functions for generating consistent SEO titles
 */

const DEFAULT_TITLE = 'Sistema Nómina SV, GT y HN | Biométrico + Software | Implementación express | Humano SISU'
const BRAND = 'Humano SISU'

export interface TitleOptions {
  primaryKeyword?: string
  secondaryKeywords?: string
  description?: string
  brand?: string
}

/**
 * Generates a SEO-optimized title tag
 * Format: [Primary Keyword] | [Secondary Keywords] | [Brand]
 * 
 * @param options - Title generation options
 * @returns Formatted title string
 */
export function generateTitle(options: TitleOptions = {}): string {
  const {
    primaryKeyword,
    secondaryKeywords,
    description,
    brand = BRAND
  } = options

  if (primaryKeyword && secondaryKeywords) {
    return `${primaryKeyword} | ${secondaryKeywords} | ${brand}`
  }

  if (primaryKeyword) {
    return `${primaryKeyword} | ${brand}`
  }

  if (description) {
    return `${description} | ${brand}`
  }

  return DEFAULT_TITLE
}

/**
 * Predefined titles for common pages
 */
export const pageTitles = {
  // Keyword-first ≤~60 chars for SERP CTR (brand at end).
  home: 'Software RRHH Honduras 2026 | Nómina + biométrico | Prueba gratis',
  activate: 'Probar nómina gratis 30 días | Sin tarjeta | Humano SISU',
  activarGracias: 'Trial activado | Llaves enviadas | Humano SISU',
  affiliates: 'Programa de Afiliados | Humano SISU',
  calculator: 'Calculadoras laborales gratis HN SV GT | IHSS ISSS IGSS 2026',
  calculatorSlv: 'Calculadora ISR El Salvador 2026 | ISSS AFP | GRATIS',
  calculatorGtm: 'Calculadora sueldo neto Guatemala 2026 | IGSS ISR | GRATIS',
  privacy: 'Política de Privacidad | Humano SISU',
  subscription: 'Alertas legales sobre tu sueldo | Humano SISU',
  login: 'Iniciar Sesión | Humano SISU',
  dashboard: 'Dashboard | Humano SISU',
  employees: 'Gestión de Empleados | Humano SISU',
  payroll: 'Nómina | Gestión de Planilla | Humano SISU',
  attendance: 'Asistencia | Control de Asistencia | Humano SISU',
  reports: 'Reportes y Análisis | Humano SISU',
  alternativaOdoo: 'Alternativa Odoo Honduras | Nómina local + biométrico | Humano SISU',
  biometricoNomina: 'Sistema biométrico + nómina 2026 | HN SV GT | Prueba gratis',
  ventas: 'Cotización nómina y asistencia | PDF al instante | Humano SISU',
  ventasGracias: 'Propuesta enviada | PDF y acceso | Humano SISU',
  gracias: 'Confirmación de activación | Humano SISU',
  info: 'Cerrar planilla sin estrés | Nómina HN SV GT | Humano SISU',
  implementacion48h: 'Implementación nómina en 72 h | Activación inmediata | Humano SISU',
  deduccionesHonduras: 'IHSS RAP ISR Honduras 2026 | Automático sin Excel | Humano SISU',
  recursos: 'Guías RRHH y nómina Honduras | IHSS RAP ISR | Humano SISU',
  paz: 'Cerrar planilla en paz | Nómina sin Excel | Humano SISU',
  viernes: 'Domingos sin planilla | Método RRHH MiPyMe | Humano SISU',
}

/**
 * Get title for a specific page
 */
export function getPageTitle(page: keyof typeof pageTitles): string {
  return pageTitles[page] || DEFAULT_TITLE
}

