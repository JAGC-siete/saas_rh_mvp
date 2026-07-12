/**
 * Helper functions for generating breadcrumbs and BreadcrumbList schema
 */

import { generateBreadcrumbListSchema } from './schema'

export interface Breadcrumb {
  name: string
  url: string
}

/**
 * Generate breadcrumbs for a given path
 */
export function generateBreadcrumbs(path: string): Breadcrumb[] {
  const breadcrumbs: Breadcrumb[] = [
    { name: 'Inicio', url: '/' }
  ]

  // Remove leading/trailing slashes and split
  const segments = path.replace(/^\/|\/$/g, '').split('/').filter(Boolean)

  // Build breadcrumbs from segments
  let currentPath = ''
  segments.forEach((segment) => {
    currentPath += `/${segment}`
    
    // Convert segment to readable name
    const name = formatSegmentName(segment)
    
    breadcrumbs.push({
      name,
      url: currentPath
    })
  })

  return breadcrumbs
}

/**
 * Format URL segment to readable breadcrumb name
 */
function formatSegmentName(segment: string): string {
  const cleanSegment = segment.split('?')[0].split('#')[0]
  const known: Record<string, string> = {
    'cerrar-planilla-en-paz': 'Cerrar planilla en paz',
    'planilla-sin-domingos': 'Planilla sin domingos',
    'politica-de-privacidad': 'Política de privacidad',
    'terminos-de-servicio': 'Términos de servicio',
    'alternativa-odoo-honduras': 'Software RH regional',
    'sistema-biometrico-nomina': 'Sistema biométrico con nómina',
    'implementacion-48-horas': 'Implementación express',
    'deducciones-honduras-ihss-rap-isr': 'Deducciones IHSS RAP ISR',
    calculadora: 'Calculadoras laborales',
    recursos: 'Recursos',
    afiliados: 'Afiliados',
    activar: 'Activar',
    suscripcion: 'Alertas de sueldo',
    paz: 'Paz al cerrar planilla',
  }
  if (known[cleanSegment]) return known[cleanSegment]

  return cleanSegment
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Generate breadcrumbs with Schema.org markup
 */
export function generateBreadcrumbsWithSchema(path: string) {
  const breadcrumbs = generateBreadcrumbs(path)
  const schema = generateBreadcrumbListSchema(
    breadcrumbs.map(b => ({ name: b.name, url: b.url }))
  )
  
  return {
    breadcrumbs,
    schema
  }
}

