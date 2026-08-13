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
    path: '/domingos-sin-planilla',
    pageFile: 'pages/viernes.tsx',
    aliases: ['/viernes', '/domingo', '/domingo-sin-planilla', '/planilla-sin-domingos'],
    name: 'Domingos sin planilla (conversión domingo/Excel)',
    kind: 'conversion',
    status: 'experimental',
    purpose:
      'Landing de conversión: dolor domingo + insight digitalizar vs automatizar + checklist + trial.',
    primaryCta: '/activar',
    launched: '2026-07-07',
    notes:
      'Warm: recuperar el viernes. Pack/secuencia info (Paper Bridge) con opener viernes. Source DB: viernes. Canonical slug descriptivo.',
  },
  {
    path: '/cerrar-planilla-en-paz',
    pageFile: 'pages/info.tsx',
    aliases: ['/secreto', '/info'],
    name: 'Cerrar planilla en paz (sobre sellado TOFU)',
    kind: 'lead-magnet',
    status: 'underperforming',
    purpose: 'Lead magnet gamificado; misma secuencia info (paces / Paper Bridge).',
    primaryCta: 'Formulario → secuencia email info',
    launched: '2026-07',
    notes:
      'Comparte secuencia info con /domingos-sin-planilla (opener distinto). Canonical slug descriptivo.',
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
    aliases: [
      '/calculadora-deducciones',
      '/calculadora-deducciones-el-salvador',
      '/calculadora-deducciones-guatemala',
      '/calcusisuhn',
      '/calcusisusv',
      '/calcusisuguate',
    ],
    name: 'Calculadoras (hub + país)',
    kind: 'calculator',
    status: 'active',
    purpose: 'TOFU herramienta gratis; canónico calculadora-deducciones*; calcusisu* → 301.',
    primaryCta: 'Uso herramienta → lead opcional',
  },
  {
    path: '/suscripcion',
    name: 'Alertas de sueldo',
    kind: 'commercial',
    status: 'active',
    purpose: 'Cold TOFU: alertas legales de recibo (post-calcu o direct).',
    primaryCta: 'Activar alertas gratis',
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
