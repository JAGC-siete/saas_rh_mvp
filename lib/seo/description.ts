/**
 * Helper functions for generating consistent SEO meta descriptions with CTAs
 */

const DEFAULT_DESCRIPTION = 'Deja de perder tiempo en planilla. Asistencia + nómina local (El Salvador, Guatemala, Honduras): deducciones y comprobantes en un solo lugar. Prueba gratis.'

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
  home: 'Humano SISU: software de recursos humanos y control de asistencia para Honduras, El Salvador y Guatemala. Nómina, biometría y deducciones legales. Activar gratis.',
  activate: 'Activa tu cuenta en Humano SISU y comienza a automatizar tu nómina. Configuración en minutos, sin complicaciones.',
  affiliates: 'Únete al programa de afiliados de Humano SISU. Gana comisiones recomendando la mejor solución de nómina para MIPYMES en la región.',
  calculator: 'Calculadora ISR Honduras y calculadora RAP gratis. IHSS, deducciones y sueldo neto con el motor de nómina Humano SISU.',
  calculatorSlv: 'Calculadora ISR El Salvador: ISSS, AFP y sueldo neto en USD. Motor de nómina Humano SISU. Automatiza planilla en El Salvador.',
  calculatorGtm: 'Calculadora sueldo neto Guatemala: IGSS e ISR en quetzales. Mismo motor de nómina Humano SISU. Prueba gratis.',
  privacy: 'Política de privacidad de Humano SISU. Conoce cómo protegemos y manejamos tus datos personales y de tus empleados.',
  subscription: 'Elige el plan perfecto para tu empresa. Desde startups hasta empresas establecidas, tenemos el plan ideal para ti.',
  login: 'Inicia sesión en tu cuenta de Humano SISU. Accede a tu dashboard, gestiona empleados, nómina y más.',
  dashboard: 'Dashboard principal de Humano SISU. Visualiza estadísticas, empleados, asistencia y nómina en un solo lugar.',
  employees: 'Gestiona tus empleados de forma eficiente. Agrega, edita y organiza la información de tu equipo.',
  payroll: 'Gestiona tu nómina de forma automatizada. Calcula IHSS, RAP, ISR y genera comprobantes automáticamente.',
  attendance: 'Control de asistencia biométrico y digital. Registra checadas, gestiona horarios y genera reportes.',
  reports: 'Reportes y análisis detallados de tu empresa. Visualiza estadísticas de asistencia, nómina y más.',
  // New strategic pages (aligned with Google Ads hero messaging)
  alternativaOdoo: 'Olvida las hojas de cálculo. Deducciones de ley (IHSS, RAP, INFOP) con activación inmediata y soporte en tu país. Prueba gratis ahora.',
  biometricoNomina: 'Integra tus biométricos con software regional. Automatiza deducciones y nómina local. Sin cálculos manuales, sin errores. Activar gratis hoy.',
  implementacion48h: 'Activación inmediata y biométrico en 72 h. Migración, capacitación y garantía de 30 días incluidas. Humano SISU.',
  deduccionesHonduras: 'Integra biométricos con Humano SISU. Automatiza IHSS, RAP, ISR en Honduras. Sin cálculos manuales. Activar gratis hoy, sin tarjeta.',
  recursos: 'Artículos sobre automatización de RH y nómina local. Guías, mejores prácticas y tendencias para MIPYMES.',
  ventas: 'Cotización sin costo para nómina y asistencia biométrica en Honduras, El Salvador y Guatemala. Recibe propuesta en PDF al instante.',
  gracias: 'Confirmación de pago recibida. Tu sistema Humano SISU se activará en las próximas horas.',
  info: 'Solicita información sobre Humano SISU: nómina automatizada, asistencia biométrica y deducciones de ley en Honduras, El Salvador y Guatemala. Sin compromiso.',
}

/**
 * Get description for a specific page
 */
export function getPageDescription(page: keyof typeof pageDescriptions): string {
  return pageDescriptions[page] || DEFAULT_DESCRIPTION
}

