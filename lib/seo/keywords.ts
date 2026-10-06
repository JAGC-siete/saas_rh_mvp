/**
 * Mapa de keywords por país y ruta (fase 0 del plan SEO, docs/seo/estrategia.md).
 *
 * Fuente: export de Search Console 2026-07-05 → 2026-10-03
 * (scripts/data/gsc-export-2026-10-03/queries.csv y page-query.csv). Excluidas: consultas de marca,
 * consultas con operadores -site:, números sueltos y seguimientos conversacionales ("si", "dame un ejemplo").
 * Consultas de /calcusisuhn (alias con 301) se asignan a /calculadora-deducciones.
 *
 * Todavía no se usa en title.ts: es la referencia para titles, H1 y el agente SEO semanal.
 */

export type KeywordCountry = 'HND' | 'SLV' | 'GTM' | 'MEX' | 'COL'

export type PayrollTerm = 'planilla' | 'nómina'

export interface CountryKeywordProfile {
  locale: 'es-HN' | 'es-SV' | 'es-GT' | 'es-MX' | 'es-CO'
  /** Término principal para "payroll" en titles y H1. */
  primaryTerm: PayrollTerm
  /** `reserved`: sin páginas hasta que el producto calcule esas leyes (2027). */
  status: 'active' | 'reserved'
}

export interface TargetQuery {
  query: string
  /** Impresiones en la ventana del export (0 = objetivo del plan sin datos aún). */
  impressions: number
  /** Posición media en la ventana del export; null si no hay datos. */
  position: number | null
}

export interface RouteKeywords {
  path: string
  country: KeywordCountry
  /** Consulta principal que debe ir al inicio del title. */
  primary: string
  targets: TargetQuery[]
}

export const KEYWORD_SOURCE = 'gsc-export-2026-10-03'

export const COUNTRY_KEYWORDS: Record<KeywordCountry, CountryKeywordProfile> = {
  HND: { locale: 'es-HN', primaryTerm: 'planilla', status: 'active' },
  SLV: { locale: 'es-SV', primaryTerm: 'planilla', status: 'active' },
  GTM: { locale: 'es-GT', primaryTerm: 'planilla', status: 'active' },
  MEX: { locale: 'es-MX', primaryTerm: 'nómina', status: 'reserved' },
  COL: { locale: 'es-CO', primaryTerm: 'nómina', status: 'reserved' },
}

export const ROUTE_KEYWORDS: RouteKeywords[] = [
  {
    path: '/',
    country: 'HND',
    primary: 'sistema de planilla honduras',
    // Las consultas genéricas con "nómina" rankean en pos. 40+: el término de la gente que aún no nos encuentra.
    targets: [
      { query: 'gestión de nómina en honduras', impressions: 2, position: 50.5 },
      { query: 'soluciones de nómina en honduras', impressions: 2, position: 41.5 },
      { query: 'servicios de nómina en honduras', impressions: 1, position: 45 },
      { query: 'servicio de cálculo de salarios en honduras', impressions: 1, position: 11 },
    ],
  },
  {
    path: '/deducciones-honduras-ihss-rap-isr',
    country: 'HND',
    primary: 'deducciones de ley honduras',
    targets: [
      { query: 'cuanto es la deduccion del ihss en honduras 2026', impressions: 28, position: 10.3 },
      { query: 'como se calcula el rap en honduras 2026', impressions: 7, position: 7.7 },
      { query: 'como calcular el rap en honduras', impressions: 6, position: 9.2 },
      { query: 'deducciones de ley en honduras', impressions: 2, position: 5.5 },
      { query: 'cuanto te quita el seguro de tu sueldo', impressions: 1, position: 1 },
      { query: 'que es salario ordinario', impressions: 1, position: 4 },
    ],
  },
  {
    path: '/recursos/guia-calcular-isr-rap-honduras-2026',
    country: 'HND',
    primary: 'como se calcula el rap en honduras 2026',
    targets: [
      { query: 'como se calcula el rap en honduras 2026', impressions: 39, position: 4.7 },
      { query: 'techo del rap 2026', impressions: 23, position: 9.6 },
      { query: 'como calcular el rap en honduras', impressions: 16, position: 6.9 },
      { query: 'techo rap 2026', impressions: 12, position: 9.4 },
      { query: 'que es el rap honduras', impressions: 2, position: 2.5 },
      { query: 'calculo del rap honduras 2026', impressions: 1, position: 4 },
      { query: 'como funciona el rap en honduras', impressions: 1, position: 3 },
    ],
  },
  {
    path: '/calculadora-deducciones',
    country: 'HND',
    primary: 'calculadora isr honduras',
    targets: [
      { query: 'calculadora isr honduras', impressions: 13, position: 8.8 },
      { query: 'calculadora rap', impressions: 3, position: 3 },
      { query: 'calculadora de isr', impressions: 2, position: 6 },
      { query: 'deduccion del seguro social', impressions: 2, position: 4.5 },
      { query: 'calculadora isr 2026', impressions: 1, position: 10 },
      { query: 'calculo del seguro social', impressions: 1, position: 6 },
    ],
  },
  {
    path: '/calculadora-prestaciones',
    country: 'HND',
    primary: 'calculadora de prestaciones honduras',
    targets: [{ query: 'calculadora de prestaciones honduras', impressions: 1, position: 36 }],
  },
  {
    path: '/recursos/cumplimiento-legal-errores-13vo-14vo-salario',
    country: 'HND',
    primary: '13vo y 14vo salario honduras',
    targets: [{ query: '13vo', impressions: 1, position: 8 }],
  },
  {
    path: '/recursos/auditoria-nomina-fugas-dinero-horas-extras',
    country: 'HND',
    primary: 'como detectar fugas de dinero en una empresa',
    targets: [{ query: 'como detectar fugas de dinero en una empresa', impressions: 7, position: 10.4 }],
  },
  {
    path: '/calculadora-deducciones-el-salvador',
    country: 'SLV',
    primary: 'calculadora de impuestos el salvador',
    targets: [{ query: 'calculadora de impuestos el salvador', impressions: 1, position: 69 }],
  },
  {
    path: '/calculadora-deducciones-guatemala',
    country: 'GTM',
    primary: 'calculadora igss guatemala',
    // Sin consultas reales todavía hacia la calculadora; las de Guatemala caen en / y /en con pos. 40+.
    targets: [
      { query: 'gestion de nomina guatemala', impressions: 1, position: 73 },
      { query: 'payroll services in guatemala', impressions: 1, position: 41 },
    ],
  },
]

export function keywordsForPath(path: string): RouteKeywords | undefined {
  return ROUTE_KEYWORDS.find((r) => r.path === path)
}
