/**
 * Rutas de marketing que deben renderizarse en el servidor (SEO).
 * El resto de páginas públicas legacy mantienen gate de hidratación en _app.
 */

const PUBLIC_SSR_EXACT = new Set([
  '/',
  '/activar',
  '/ventas',
  '/gracias',
  '/info',
  '/afiliados',
  '/alternativa-odoo-honduras',
  '/sistema-biometrico-nomina',
  '/implementacion-48-horas',
  '/deducciones-honduras-ihss-rap-isr',
  '/politicadeprivacidad',
  '/terminos-de-servicio',
  '/suscripcion',
  '/calculadora',
  '/calculadora-deducciones',
  '/calculadora-deducciones-el-salvador',
  '/calculadora-deducciones-guatemala',
  '/calculadora-prestaciones',
  '/calculadora-aguinaldo-honduras',
  '/calculadora-catorceavo-honduras',
])

export function isPublicMarketingRoute(pathname: string): boolean {
  if (PUBLIC_SSR_EXACT.has(pathname)) return true
  if (pathname.startsWith('/recursos')) return true
  if (pathname.startsWith('/info/m/')) return true
  return false
}
