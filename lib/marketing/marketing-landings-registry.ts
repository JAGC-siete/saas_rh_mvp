/**
 * Registro central de landings de marketing / campañas.
 * Usar para auditoría, limpieza y decisiones de retiro o redirect.
 */

export type MarketingLandingStatus =
  | 'active'
  | 'experimental'
  | 'underperforming'
  | 'awareness-only'
  | 'deprecated'
  | 'candidate-retire'

export type MarketingLandingKind =
  | 'conversion'
  | 'lead-magnet'
  | 'viral-satire'
  | 'seo'
  | 'calculator'
  | 'commercial'

export interface MarketingLandingEntry {
  /** Ruta pública canónica */
  path: string
  /** Archivo de página en pages/ si aplica */
  pageFile?: string
  /** Aliases o redirects conocidos */
  aliases?: string[]
  name: string
  kind: MarketingLandingKind
  status: MarketingLandingStatus
  purpose: string
  primaryCta: string
  launched?: string
  notes?: string
}

/** Orden: campañas experimentales primero, luego core. */
export const MARKETING_LANDINGS: MarketingLandingEntry[] = [
  {
    path: '/viernes',
    pageFile: 'pages/viernes.tsx',
    name: 'Viernes (conversión domingo/Excel)',
    kind: 'conversion',
    status: 'experimental',
    purpose:
      'Landing de conversión: dolor domingo + insight digitalizar vs automatizar + checklist + trial.',
    primaryCta: '/activar',
    launched: '2026-07-07',
    notes: 'Reemplazo conceptual de /secreto y /paz. Medir leads y activaciones 14 días.',
  },
  {
    path: '/secreto',
    pageFile: 'pages/info.tsx',
    aliases: ['/info'],
    name: 'Secreto (sobre sellado TOFU)',
    kind: 'lead-magnet',
    status: 'underperforming',
    purpose: 'Lead magnet gamificado; email sequence info.',
    primaryCta: 'Formulario → secuencia email',
    launched: '2026-07',
    notes: '0 conversiones en 5 días al aire. Candidato a redirect → /viernes.',
  },
  {
    path: '/paz',
    pageFile: 'pages/paz.tsx',
    name: 'Paz (Railway Peace parodia)',
    kind: 'viral-satire',
    status: 'awareness-only',
    purpose: 'Campaña satírica awareness; video + redes.',
    primaryCta: '/activar (solo al final)',
    launched: '2026-07',
    notes: 'Sin captura de lead; video placeholder. Candidato a retiro o solo tráfico paid social.',
  },
  {
    path: '/',
    pageFile: 'pages/index.tsx',
    name: 'Home principal',
    kind: 'seo',
    status: 'active',
    purpose: 'SEO + conversión B2B principal.',
    primaryCta: '/activar',
  },
  {
    path: '/activar',
    pageFile: 'pages/activar.tsx',
    name: 'Activar trial',
    kind: 'commercial',
    status: 'active',
    purpose: 'BOFU — activación de trial.',
    primaryCta: 'Formulario activar',
  },
  {
    path: '/ventas',
    pageFile: 'pages/ventas.tsx',
    name: 'Cotización',
    kind: 'commercial',
    status: 'active',
    purpose: 'BOFU — cotización PDF.',
    primaryCta: 'Formulario ventas',
  },
  {
    path: '/calculadora',
    aliases: ['/calcusisuhn', '/calcusisusv', '/calcusisuguate'],
    name: 'Calculadoras (hub + país)',
    kind: 'calculator',
    status: 'active',
    purpose: 'TOFU herramienta gratis; validación motor legal.',
    primaryCta: 'Uso herramienta → lead opcional',
  },
  {
    path: '/suscripcion',
    name: 'Suscripción / precios',
    kind: 'commercial',
    status: 'active',
    purpose: 'Pricing y suscripción.',
    primaryCta: 'Formulario suscripción',
  },
  {
    path: '/alternativa-odoo-honduras',
    name: 'Alternativa Odoo',
    kind: 'seo',
    status: 'active',
    purpose: 'SEO comparativo.',
    primaryCta: '/activar',
  },
  {
    path: '/sistema-biometrico-nomina',
    name: 'Biométrico + nómina',
    kind: 'seo',
    status: 'active',
    purpose: 'SEO producto.',
    primaryCta: '/activar',
  },
  {
    path: '/implementacion-48-horas',
    name: 'Implementación 72h',
    kind: 'seo',
    status: 'active',
    purpose: 'SEO implementación.',
    primaryCta: '/activar',
  },
  {
    path: '/deducciones-honduras-ihss-rap-isr',
    name: 'Deducciones Honduras',
    kind: 'seo',
    status: 'active',
    purpose: 'SEO deducciones HN.',
    primaryCta: '/activar',
  },
  {
    path: '/afiliados',
    name: 'Afiliados',
    kind: 'commercial',
    status: 'active',
    purpose: 'Programa afiliados.',
    primaryCta: 'Formulario afiliados',
  },
]

export function getMarketingLanding(path: string): MarketingLandingEntry | undefined {
  const normalized = path.split('?')[0].replace(/\/$/, '') || '/'
  return MARKETING_LANDINGS.find(
    (entry) =>
      entry.path === normalized || entry.aliases?.some((alias) => alias === normalized)
  )
}

export function getLandingsByStatus(status: MarketingLandingStatus): MarketingLandingEntry[] {
  return MARKETING_LANDINGS.filter((entry) => entry.status === status)
}
