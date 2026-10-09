export type ActivarUtmContext = {
  headline?: string
  subheadline?: string
}

const PATTERNS: Array<{ match: RegExp; context: ActivarUtmContext }> = [
  {
    match: /info|secreto|m5|mission/i,
    context: {
      subheadline:
        'Prueba tu planilla con las leyes de tu país, sin Excel de por medio.',
    },
  },
  {
    match: /calculadora|calc_/i,
    context: {
      subheadline: 'Mira esos mismos cálculos en una planilla completa, con empleados de ejemplo y sin tarjeta.',
    },
  },
  {
    match: /ventas|cotiz/i,
    context: {
      subheadline: '30 días para comprobar cuánto tiempo te ahorras frente a Excel.',
    },
  },
]

export function getActivarUtmContext(utmSource?: string | null): ActivarUtmContext {
  const source = (utmSource ?? '').trim()
  if (!source) return {}

  for (const { match, context } of PATTERNS) {
    if (match.test(source)) return context
  }

  return {}
}

export function readActivarUtmSource(query: Record<string, string | string[] | undefined>): string {
  const raw = query.utm_source
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw[0] ?? ''
  return ''
}
