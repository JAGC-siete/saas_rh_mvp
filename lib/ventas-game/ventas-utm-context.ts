export type VentasUtmContext = {
  headline?: string
  subheadline?: string
}

const PATTERNS: Array<{ match: RegExp; context: VentasUtmContext }> = [
  {
    match: /info|secreto|mission|m5/i,
    context: {
      headline: 'Ya vio el costo del reprocesamiento. Estos son los números.',
      subheadline: 'Propuesta formal en PDF — nómina y asistencia según las leyes de su país.',
    },
  },
  {
    match: /activar|trial|motor/i,
    context: {
      headline: 'Su entorno de prueba está activo. Aquí la propuesta para operación real.',
      subheadline: 'Mismos parámetros legales, escala de su equipo y modalidad de contratación.',
    },
  },
  {
    match: /calculadora|calc_|deducc|prestac|benefit/i,
    context: {
      headline: 'Validó los números. Esta es la inversión para automatizarlos.',
      subheadline: 'Cotización exacta con IHSS, RAP e ISR locales — PDF listo para gerencia.',
    },
  },
]

export function getVentasUtmContext(utmSource?: string | null): VentasUtmContext {
  const source = (utmSource ?? '').trim()
  if (!source) return {}

  for (const { match, context } of PATTERNS) {
    if (match.test(source)) return context
  }

  return {}
}

export function readVentasUtmSource(query: Record<string, string | string[] | undefined>): string {
  const raw = query.utm_source
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw[0] ?? ''
  return ''
}
