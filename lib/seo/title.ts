/**
 * Helper functions for generating consistent SEO titles
 */

const DEFAULT_TITLE = 'Nómina Automatizada Honduras | IHSS, RAP, ISR | Humano SISU'
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
  home: DEFAULT_TITLE,
  activate: 'Activar Cuenta | Nómina Automatizada Honduras | Humano SISU',
  affiliates: 'Programa de Afiliados | Humano SISU',
  calculator: 'Calculadora de Deducciones | IHSS, RAP, ISR | Humano SISU',
  privacy: 'Política de Privacidad | Humano SISU',
  subscription: 'Suscripción | Planes y Precios | Humano SISU',
  login: 'Iniciar Sesión | Humano SISU',
  dashboard: 'Dashboard | Humano SISU',
  employees: 'Gestión de Empleados | Humano SISU',
  payroll: 'Nómina | Gestión de Planilla | Humano SISU',
  attendance: 'Asistencia | Control de Asistencia | Humano SISU',
  reports: 'Reportes y Análisis | Humano SISU',
}

/**
 * Get title for a specific page
 */
export function getPageTitle(page: keyof typeof pageTitles): string {
  return pageTitles[page] || DEFAULT_TITLE
}

