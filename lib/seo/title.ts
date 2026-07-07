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
  home: 'Humano SISU | Software de Recursos Humanos y Control de Asistencia | HN, SV, GT',
  activate: 'Activa SISU | Toca el cielo | Humano SISU',
  affiliates: 'Programa de Afiliados | Humano SISU',
  calculator: 'Calculadora ISR Honduras y Calculadora RAP | IHSS · Humano SISU',
  calculatorSlv: 'Calculadora ISR El Salvador | ISSS, AFP y sueldo neto | Humano SISU',
  calculatorGtm: 'Calculadora sueldo neto Guatemala | IGSS e ISR | Humano SISU',
  privacy: 'Política de Privacidad | Humano SISU',
  subscription: 'Suscripción | Planes y Precios | Humano SISU',
  login: 'Iniciar Sesión | Humano SISU',
  dashboard: 'Dashboard | Humano SISU',
  employees: 'Gestión de Empleados | Humano SISU',
  payroll: 'Nómina | Gestión de Planilla | Humano SISU',
  attendance: 'Asistencia | Control de Asistencia | Humano SISU',
  reports: 'Reportes y Análisis | Humano SISU',
  // New strategic pages (aligned with Google Ads hero messaging)
  alternativaOdoo: 'Software RH regional | Biométrico, nómina y ley local | Humano SISU',
  biometricoNomina: 'Sistema biométrico + nómina | HN, SV y GT | Humano SISU',
  ventas: 'Cotización nómina y asistencia | PDF al instante | Humano SISU',
  gracias: 'Confirmación de activación | Humano SISU',
  info: 'Solicitar información | Software nómina y asistencia HN SV GT | Humano SISU',
  implementacion48h: 'Automatiza asistencia y payroll | Ahorra horas | Humano SISU',
  deduccionesHonduras: 'IHSS, RAP, ISR automático | Sin cálculos manuales | Humano SISU',
  recursos: 'Recursos | Automatización RH y nómina local | Humano SISU',
  paz: 'La forma pacífica de cerrar planilla | Humano SISU',
  viernes: 'Cierra planilla en 4 minutos, no en 4 horas | Humano SISU',
}

/**
 * Get title for a specific page
 */
export function getPageTitle(page: keyof typeof pageTitles): string {
  return pageTitles[page] || DEFAULT_TITLE
}

