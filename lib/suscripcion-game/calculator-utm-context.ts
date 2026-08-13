import { RECIBO_ALERTAS_COPY } from './recibo-alertas-copy'

export type CalculatorUtmContext = {
  /** True when visitor arrived from a calculator bridge / hub CTA. */
  fromCalculator: boolean
  headline: string
  subheadline: string
  badge: string
  country?: string
}

const TOOL_PATTERNS: Array<{
  match: RegExp
  headline: string
  subheadline?: string
  country?: string
}> = [
  {
    match: /deducciones.*hnd|deducciones_hnd/i,
    headline: '¿Te cuadró el IHSS en tu último recibo?',
    subheadline: 'Activá alertas para no depender solo de lo que diga el recibo.',
    country: 'Honduras',
  },
  {
    match: /deducciones.*slv|deducciones_slv|el-salvador/i,
    headline: '¿Te cuadró el ISSS en tu último recibo?',
    subheadline: 'Activá alertas para no depender solo de lo que diga el recibo.',
    country: 'El Salvador',
  },
  {
    match: /deducciones.*gtm|deducciones_gtm|guatemala/i,
    headline: '¿Te cuadró el IGSS en tu último recibo?',
    subheadline: 'Activá alertas para no depender solo de lo que diga el recibo.',
    country: 'Guatemala',
  },
  {
    match: /aguinaldo/i,
    headline: '¿Sabés cuánto te toca de aguinaldo?',
    subheadline: 'Activá alertas para no perderte la fecha ni el monto.',
  },
  {
    match: /catorceavo|14vo/i,
    headline: '¿Sabés cuándo te corresponde el catorceavo?',
    subheadline: 'Te avisamos antes de que pase la fecha.',
  },
  {
    match: /prestaciones|finiquito/i,
    headline: '¿Validaste tus prestaciones?',
    subheadline: 'Activá alertas legales ligadas a lo que acabás de calcular.',
  },
]

function isCalculatorUtmSource(source: string): boolean {
  if (!source) return false
  // Hub footer uses calculadora-hub — cold copy (no post-calc claim).
  if (source === 'calculadora-hub') return false
  if (source.startsWith('calculadora')) return true
  if (/deducciones|aguinaldo|catorceavo|prestaciones|finiquito/i.test(source)) return true
  return false
}

export function getCalculatorUtmContext(utmSource?: string | null): CalculatorUtmContext {
  const source = (utmSource ?? '').trim()
  const fromCalculator = isCalculatorUtmSource(source)

  if (!fromCalculator) {
    return {
      fromCalculator: false,
      headline: RECIBO_ALERTAS_COPY.cold.headline,
      subheadline: RECIBO_ALERTAS_COPY.cold.subheadline,
      badge: RECIBO_ALERTAS_COPY.cold.badge,
    }
  }

  for (const pattern of TOOL_PATTERNS) {
    if (pattern.match.test(source)) {
      return {
        fromCalculator: true,
        headline: pattern.headline,
        subheadline: pattern.subheadline ?? RECIBO_ALERTAS_COPY.fromCalculator.subheadline,
        badge: pattern.country
          ? `${RECIBO_ALERTAS_COPY.fromCalculator.badge} · ${pattern.country}`
          : RECIBO_ALERTAS_COPY.fromCalculator.badge,
        country: pattern.country,
      }
    }
  }

  return {
    fromCalculator: true,
    headline: RECIBO_ALERTAS_COPY.fromCalculator.headline,
    subheadline: RECIBO_ALERTAS_COPY.fromCalculator.subheadline,
    badge: RECIBO_ALERTAS_COPY.fromCalculator.badge,
  }
}

export function readUtmSourceFromQuery(query: Record<string, string | string[] | undefined>): string {
  const raw = query.utm_source
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw[0] ?? ''
  return ''
}
