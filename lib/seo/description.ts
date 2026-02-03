/**
 * Helper functions for generating consistent SEO meta descriptions with CTAs
 */

const DEFAULT_DESCRIPTION = 'Control de asistencia + Cálculo de nómina 100% Honduras. Cálculo IHSS, RAP, ISR y comprobantes en un solo sistema. Implementación en 48h o menos.'

export interface DescriptionOptions {
  valueProposition?: string
  cta?: string
  additionalBenefit?: string
}

/**
 * Generates a SEO-optimized meta description with CTA
 * Format: [Value Proposition] [CTA] [Additional Benefit]
 * 
 * @param options - Description generation options
 * @returns Formatted description string (max 160 characters)
 */
export function generateDescription(options: DescriptionOptions = {}): string {
  const {
    valueProposition = 'RH en automático y digital: asistencia, nómina con deducciones IHSS, RAP, ISR exactas',
    cta = 'Prueba gratis 30 días',
    additionalBenefit = 'comprobantes de pago enviados directo a tus empleados'
  } = options

  const description = `${valueProposition}. ${cta}. ${additionalBenefit}.`
  
  // Ensure description is within SEO limits (160 chars recommended)
  if (description.length > 160) {
    return description.substring(0, 157) + '...'
  }

  return description
}

/**
 * Predefined descriptions for common pages
 */
export const pageDescriptions = {
  home: DEFAULT_DESCRIPTION,
  activate: 'Activa tu cuenta en Humano SISU y comienza a automatizar tu nómina. Configuración en minutos, sin complicaciones.',
  affiliates: 'Únete al programa de afiliados de Humano SISU. Gana comisiones recomendando la mejor solución de nómina para MIPYMES en Honduras.',
  calculator: 'Calcula automáticamente las deducciones de IHSS, RAP e ISR para tus empleados. Herramienta gratuita y precisa.',
  privacy: 'Política de privacidad de Humano SISU. Conoce cómo protegemos y manejamos tus datos personales y de tus empleados.',
  subscription: 'Elige el plan perfecto para tu empresa. Desde startups hasta empresas establecidas, tenemos el plan ideal para ti.',
  login: 'Inicia sesión en tu cuenta de Humano SISU. Accede a tu dashboard, gestiona empleados, nómina y más.',
  dashboard: 'Dashboard principal de Humano SISU. Visualiza estadísticas, empleados, asistencia y nómina en un solo lugar.',
  employees: 'Gestiona tus empleados de forma eficiente. Agrega, edita y organiza la información de tu equipo.',
  payroll: 'Gestiona tu nómina de forma automatizada. Calcula IHSS, RAP, ISR y genera comprobantes automáticamente.',
  attendance: 'Control de asistencia biométrico y digital. Registra checadas, gestiona horarios y genera reportes.',
  reports: 'Reportes y análisis detallados de tu empresa. Visualiza estadísticas de asistencia, nómina y más.',
  // New strategic pages
  alternativaOdoo: 'Alternativa a Odoo para MIPYMES en Honduras. Biométrico integrado + Nómina localizada. Implementación 48h vs semanas de Odoo. Compara gratis.',
  biometricoNomina: 'Sistema biométrico con nómina integrada. Todo en uno: control asistencia + cálculo IHSS, RAP, ISR. 100% hondureño. Prueba gratis.',
  implementacion48h: 'Implementación de nómina en 48 horas garantizada. Biométrico + Software configurado y funcionando. Más rápido que Odoo. Solicita demo.',
  deduccionesHonduras: 'Cálculo automático de IHSS, RAP e ISR según ley hondureña. Más preciso que Excel. Genera comprobantes automáticos. Prueba gratis.',
}

/**
 * Get description for a specific page
 */
export function getPageDescription(page: keyof typeof pageDescriptions): string {
  return pageDescriptions[page] || DEFAULT_DESCRIPTION
}

