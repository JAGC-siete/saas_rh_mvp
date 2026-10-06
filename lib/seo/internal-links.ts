/** Enlaces internos hacia landings SEO/Ads y contenido, para evitar páginas huérfanas. */

import { DEDUCTION_CALCULATOR_PUBLIC_PATHS } from '../marketing/calculator-public-paths'

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
    label: 'Implementación biométrica en 72 h',
    description: 'Activación inmediata, migración de datos y garantía de 30 días'
  },
  alternativaOdoo: {
    href: '/alternativa-odoo-honduras',
    label: 'Complemento a Odoo',
    description: 'Nómina local y biométrico integrados con Odoo'
  },
  planBasico: {
    href: '/membresia-anual',
    label: 'Membresía anual (sin reloj)',
    description: 'L. 6,500/año: recibos, asistencia sin reloj y empleados ilimitados'
  },
  domingosSinPlanilla: {
    href: '/domingos-sin-planilla',
    label: 'Domingos sin planilla',
    description: 'Método para digitalizar y automatizar RR.HH. sin apagar la operación'
  },
  calculadoraHonduras: {
    href: DEDUCTION_CALCULATOR_PUBLIC_PATHS.HND,
    label: 'Calculadora de deducciones Honduras',
    description: 'IHSS, RAP e ISR sobre tu salario'
  },
  calculadoraElSalvador: {
    href: DEDUCTION_CALCULATOR_PUBLIC_PATHS.SLV,
    label: 'Calculadora de deducciones El Salvador',
    description: 'ISSS, AFP y renta sobre tu salario'
  },
  calculadoraGuatemala: {
    href: DEDUCTION_CALCULATOR_PUBLIC_PATHS.GTM,
    label: 'Calculadora de deducciones Guatemala',
    description: 'IGSS e ISR sobre tu salario'
  }
} as const

/** Orden de las landings para el footer global. */
export const FOOTER_GUIDE_KEYS: Array<keyof typeof GUIDE_LINKS> = [
  'recursos',
  'deduccionesHonduras',
  'biometricoNomina',
  'implementacion48h',
  'alternativaOdoo',
  'domingosSinPlanilla',
  'planBasico'
]

/** Cross-links "También te puede interesar" por landing (clave = ruta actual). */
export const RELATED_GUIDES: Record<string, Array<keyof typeof GUIDE_LINKS>> = {
  '/alternativa-odoo-honduras': ['implementacion48h', 'biometricoNomina', 'deduccionesHonduras'],
  '/sistema-biometrico-nomina': ['deduccionesHonduras', 'implementacion48h', 'alternativaOdoo'],
  '/implementacion-48-horas': ['alternativaOdoo', 'biometricoNomina', 'recursos'],
  '/deducciones-honduras-ihss-rap-isr': ['biometricoNomina', 'recursos', 'alternativaOdoo'],
  '/membresia-anual': ['biometricoNomina', 'deduccionesHonduras', 'implementacion48h'],
  '/': ['biometricoNomina', 'deduccionesHonduras', 'implementacion48h'],
  '/activar': ['biometricoNomina', 'implementacion48h', 'deduccionesHonduras'],
  '/cerrar-planilla-en-paz': ['deduccionesHonduras', 'biometricoNomina', 'domingosSinPlanilla'],
  '/info': ['deduccionesHonduras', 'biometricoNomina', 'domingosSinPlanilla'],
  '/calculadora': ['deduccionesHonduras', 'biometricoNomina', 'recursos'],
  '/calculadora-deducciones': ['deduccionesHonduras', 'calculadoraElSalvador', 'calculadoraGuatemala'],
  '/calculadora-deducciones-el-salvador': ['calculadoraGuatemala', 'calculadoraHonduras', 'biometricoNomina'],
  '/calculadora-deducciones-guatemala': ['calculadoraElSalvador', 'calculadoraHonduras', 'biometricoNomina'],
  '/recursos': ['deduccionesHonduras', 'biometricoNomina', 'alternativaOdoo'],
  '/paz': ['domingosSinPlanilla', 'deduccionesHonduras', 'biometricoNomina'],
}
