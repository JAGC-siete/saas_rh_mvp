/**
 * Rutas de marketing que deben renderizarse en el servidor (SEO).
 * El resto de páginas públicas legacy mantienen gate de hidratación en _app.
 */

import { INFO_FUNNEL_PUBLIC_PATH } from '../marketing/info-funnel-path'
import {
  ALL_DEDUCTION_CALCULATOR_INTERNAL_PATHS,
  ALL_DEDUCTION_CALCULATOR_PUBLIC_PATHS,
} from '../marketing/calculator-public-paths'

const PUBLIC_SSR_EXACT = new Set([
  '/',
  '/activar',
  '/ventas',
  '/gracias',
  INFO_FUNNEL_PUBLIC_PATH,
  '/info',
  '/afiliados',
  '/alternativa-odoo-honduras',
  '/sistema-biometrico-nomina',
  '/implementacion-48-horas',
  '/deducciones-honduras-ihss-rap-isr',
  '/politicadeprivacidad',
  '/terminos-de-servicio',
  '/suscripcion',
  '/paz',
  '/calculadora',
  ...ALL_DEDUCTION_CALCULATOR_PUBLIC_PATHS,
  ...ALL_DEDUCTION_CALCULATOR_INTERNAL_PATHS,
  '/calculadora-prestaciones',
  '/calculadora-aguinaldo-honduras',
  '/calculadora-catorceavo-honduras',
])

export function isPublicMarketingRoute(pathname: string): boolean {
  if (PUBLIC_SSR_EXACT.has(pathname)) return true
  if (pathname.startsWith('/recursos')) return true
  if (pathname.startsWith(`${INFO_FUNNEL_PUBLIC_PATH}/m/`)) return true
  if (pathname.startsWith('/info/m/')) return true
  return false
}
