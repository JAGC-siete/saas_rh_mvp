/**
 * Rutas de marketing que deben renderizarse en el servidor (SEO).
 * El resto de páginas públicas legacy mantienen gate de hidratación en _app.
 */

import { isPublicLandingRoute } from '../landings/paths'
import { isPublicMercadoRoute } from '../mercado/paths'
import { INFO_FUNNEL_PUBLIC_PATH } from '../marketing/info-funnel-path'
import { VIERNES_PUBLIC_PATH, VIERNES_INTERNAL_PATH } from '../marketing/viernes-copy'
import { PRIVACY_PUBLIC_PATH, PRIVACY_LEGACY_PATH, TERMS_PUBLIC_PATH } from '../marketing/legal-paths'
import {
  ALL_DEDUCTION_CALCULATOR_INTERNAL_PATHS,
  ALL_DEDUCTION_CALCULATOR_LEGACY_PATHS,
  ALL_DEDUCTION_CALCULATOR_PUBLIC_PATHS,
} from '../marketing/calculator-public-paths'

const PUBLIC_SSR_EXACT = new Set([
  '/',
  '/activar',
  '/activar/gracias',
  '/ventas',
  '/ventas/gracias',
  '/plan-basico',
  '/membresia-anual',
  '/gracias',
  INFO_FUNNEL_PUBLIC_PATH,
  '/info',
  '/secreto',
  '/afiliados',
  '/alternativa-odoo-honduras',
  '/sistema-biometrico-nomina',
  '/implementacion-48-horas',
  '/deducciones-honduras-ihss-rap-isr',
  PRIVACY_PUBLIC_PATH,
  PRIVACY_LEGACY_PATH,
  TERMS_PUBLIC_PATH,
  '/suscripcion',
  '/paz',
  VIERNES_PUBLIC_PATH,
  VIERNES_INTERNAL_PATH,
  '/calculadora',
  ...ALL_DEDUCTION_CALCULATOR_PUBLIC_PATHS,
  ...ALL_DEDUCTION_CALCULATOR_INTERNAL_PATHS,
  ...ALL_DEDUCTION_CALCULATOR_LEGACY_PATHS,
  '/calculadora-prestaciones',
  '/calculadora-aguinaldo-honduras',
  '/calculadora-catorceavo-honduras',
  '/demo-local',
])

const PUBLIC_KIOSK_DISABLED = new Set([
  '/attendance/register',
  '/attendance/public',
  '/app/attendance/register',
])

function barePublicPath(pathname: string): string {
  return pathname === '/en' ? '/' : pathname.startsWith('/en/') ? pathname.slice(3) : pathname
}

export function isPublicKioskDisabledRoute(pathname: string): boolean {
  return PUBLIC_KIOSK_DISABLED.has(barePublicPath(pathname))
}

/** Herramientas públicas de mostrador (sin auth, sin marketing chrome). */
export function isPublicToolRoute(pathname: string): boolean {
  const bare = barePublicPath(pathname)
  return bare === '/tools' || bare.startsWith('/tools/')
}

/**
 * Landings publicadas por empresas cliente (/p/[slug]) y directorio público
 * Mercado Municipal (/mercado, /mercado/[slug]).
 * Shell propio: SSR, sin Auth, sin CookieBanner ni analytics de Humano SISU.
 */
export function isPublicTenantLandingRoute(pathname: string): boolean {
  const bare = barePublicPath(pathname)
  return isPublicLandingRoute(bare) || isPublicMercadoRoute(bare)
}

export function isPublicMarketingRoute(pathname: string): boolean {
  // /en rewrites strip prefix for page matching; still accept prefixed paths if seen.
  const bare = barePublicPath(pathname)
  if (PUBLIC_SSR_EXACT.has(bare)) return true
  if (bare.startsWith('/recursos')) return true
  if (bare.startsWith(`${INFO_FUNNEL_PUBLIC_PATH}/m/`)) return true
  if (bare.startsWith('/info/m/')) return true
  if (bare.startsWith('/secreto/m/')) return true
  return false
}
