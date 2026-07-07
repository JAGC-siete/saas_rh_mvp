export type ActivarUtmContext = {
  headline?: string
  subheadline?: string
}

const PATTERNS: Array<{ match: RegExp; context: ActivarUtmContext }> = [
  {
    match: /info|secreto|m5|mission/i,
    context: {
      headline: 'Viste el reprocesamiento. El cielo es lo contrario.',
      subheadline:
        'Subí a un entorno de prueba con las leyes de tu país — sin Excel de por medio, con paz de verdad.',
    },
  },
  {
    match: /calculadora|calc_/i,
    context: {
      headline: 'Ya validaste los números. ¿Y si la planilla corriera sola?',
      subheadline: 'Tocá las nubes del motor legal en vivo — empleados ficticios, cero tarjeta.',
    },
  },
  {
    match: /ventas|cotiz/i,
    context: {
      headline: 'Antes de decidir, tocá el cielo.',
      subheadline: '30 días para ver si alcanzás la paz que hoy se pierde en Excel.',
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
