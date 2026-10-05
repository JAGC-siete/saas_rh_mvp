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
  home: 'Nómina con IHSS/RAP/ISR y asistencia biométrica para HN, SV y GT. Sin Excel. Prueba 30 días gratis — sin tarjeta.',
  activate: 'Activa Humano SISU en minutos: planilla local (HN/SV/GT), asistencia y deducciones. Trial gratis, sin tarjeta de crédito.',
  activarGracias:
    'Confirmación de trial Humano SISU. Revisá tu correo para las credenciales del entorno de prueba.',
  affiliates: 'Únete al programa de afiliados de Humano SISU. Gana comisiones recomendando la mejor solución de nómina para MIPYMES en la región.',
  calculator: 'Calculadoras gratis de deducciones e indemnización para Honduras, El Salvador y Guatemala. Mismo motor legal que Humano SISU.',
  calculatorSlv: 'Calculadora ISR El Salvador: ISSS, AFP y sueldo neto en USD. Motor de nómina Humano SISU. Automatiza planilla en El Salvador.',
  calculatorGtm: 'Calculadora sueldo neto Guatemala: IGSS e ISR en quetzales. Mismo motor de nómina Humano SISU. Prueba gratis.',
  privacy: 'Política de privacidad de Humano SISU. Conoce cómo protegemos y manejamos tus datos personales y de tus empleados.',
  subscription: 'Alertas gratis de aguinaldo, catorceavo y cambios en deducciones para quien revisa su recibo en Honduras, El Salvador y Guatemala.',
  login: 'Inicia sesión en tu cuenta de Humano SISU. Accede a tu dashboard, gestiona empleados, nómina y más.',
  dashboard: 'Dashboard principal de Humano SISU. Visualiza estadísticas, empleados, asistencia y nómina en un solo lugar.',
  employees: 'Gestiona tus empleados de forma eficiente. Agrega, edita y organiza la información de tu equipo.',
  payroll: 'Gestiona tu nómina de forma automatizada. Calcula IHSS, RAP, ISR y genera comprobantes automáticamente.',
  attendance: 'Control de asistencia biométrico y digital. Registra checadas, gestiona horarios y genera reportes.',
  reports: 'Reportes y análisis detallados de tu empresa. Visualiza estadísticas de asistencia, nómina y más.',
  alternativaOdoo: 'Alternativa o complemento a Odoo en Honduras: biométrico + nómina local (HN, SV, GT) con integración disponible. Prueba gratis.',
  biometricoNomina: 'Integra biométricos con nómina regional. Deducciones automáticas, sin Excel ni errores. Activar gratis hoy — sin tarjeta.',
  implementacion48h: 'Puesta en marcha express: cuenta hoy, biométrico en ≤72 h, migración y capacitación incluidas. Garantía 30 días. Cotizá ya.',
  deduccionesHonduras:
    'Cómo se calcula el RAP e IHSS en Honduras 2026: techos, % y tabla ISR. Usa la calculadora gratis o automatiza la planilla sin Excel.',
  recursos: 'Guías prácticas de RRHH y nómina local: IHSS, RAP, ISR, biométrico y automatización para MiPyMes en Centroamérica.',
  ventas: 'Cotización sin costo para nómina y asistencia biométrica en Honduras, El Salvador y Guatemala. Recibe propuesta en PDF al instante.',
  ventasGracias:
    'Confirmación de cotización Humano SISU. Revisá tu correo para el PDF y las credenciales de acceso.',
  gracias: 'Confirmación de pago recibida. Tu sistema Humano SISU se activará en las próximas horas.',
  info: 'Automatizá asistencia, nómina y deducciones (IHSS, RAP, ISR) en HN, SV y GT. Cerrá planilla sin estrés. Sin compromiso.',
  paz: 'Dejá de perder domingos en Excel. Nómina con deducciones de ley y asistencia biométrica. Recuperá la paz al cerrar planilla.',
  viernes:
    'Método para digitalizar RR.HH. en MiPyMes: asistencia, nómina y deducciones sin apagar la operación. Claves prácticas gratis.',
}

/**
 * Get description for a specific page
 */
export function getPageDescription(page: keyof typeof pageDescriptions): string {
  return pageDescriptions[page] || DEFAULT_DESCRIPTION
}

