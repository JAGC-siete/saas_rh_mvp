export type CalculatorUtmContext = {
  headline?: string
  subheadline?: string
  country?: string
}

const TOOL_PATTERNS: Array<{ match: RegExp; context: CalculatorUtmContext }> = [
  {
    match: /deducciones.*hnd|deducciones_hnd/i,
    context: {
      headline: '¿Te cuadró el IHSS en tu último recibo?',
      country: 'Honduras',
    },
  },
  {
    match: /deducciones.*slv|deducciones_slv|el-salvador/i,
    context: {
      headline: '¿Te cuadró el ISSS en tu último recibo?',
      country: 'El Salvador',
    },
  },
  {
    match: /deducciones.*gtm|deducciones_gtm|guatemala/i,
    context: {
      headline: '¿Te cuadró el IGSS en tu último recibo?',
      country: 'Guatemala',
    },
  },
  {
    match: /aguinaldo/i,
    context: {
      headline: '¿Sabés cuánto te toca de aguinaldo?',
      subheadline: 'Activá alertas para no perderte la fecha ni el monto.',
    },
  },
  {
    match: /catorceavo|14vo/i,
    context: {
      headline: '¿Sabés cuándo te corresponde el catorceavo?',
      subheadline: 'Te avisamos antes de que pase la fecha.',
    },
  },
  {
    match: /prestaciones|finiquito/i,
    context: {
      headline: '¿Validaste tus prestaciones?',
      subheadline: 'Guardá el cálculo y recibí alertas legales en tu correo.',
    },
  },
]

export function getCalculatorUtmContext(utmSource?: string | null): CalculatorUtmContext {
  const source = (utmSource ?? '').trim()
  if (!source) return {}

  for (const { match, context } of TOOL_PATTERNS) {
    if (match.test(source)) {
      return context
    }
  }

  if (source.startsWith('calculadora_')) {
    return {
      subheadline: 'Recibí recordatorios legales ligados a lo que acabas de calcular.',
    }
  }

  return {}
}

export function readUtmSourceFromQuery(query: Record<string, string | string[] | undefined>): string {
  const raw = query.utm_source
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw[0] ?? ''
  return ''
}
