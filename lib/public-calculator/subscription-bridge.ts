import type { CalculatorTool } from '../analytics/calculator-events'

const SUSCRIPCION_PATH = '/suscripcion'

export function appendSuscripcionUtmParams(
  tool: CalculatorTool,
  campaign: 'footer' | 'post-calc' | 'sticky'
): string {
  const params = new URLSearchParams({
    utm_source: `calculadora_${tool}`,
    utm_medium: 'bridge',
    utm_campaign: campaign,
  })
  return `${SUSCRIPCION_PATH}?${params.toString()}`
}

export const CALCULATOR_SUBSCRIPTION_BRIDGE = {
  title: '¿Te sirvió la calculadora?',
  body: 'Suscríbete y recibe guías de nómina, alertas legales (13vo, 14vo, deducciones) y novedades de Humano SISU para PyMEs en Honduras, El Salvador y Guatemala.',
  ctaLabel: 'Suscribirme gratis',
  pricingLabel: 'Ver planes y cotización',
  pricingHref: '/ventas?utm_source=calculadoras&utm_medium=bridge&utm_campaign=suscripcion-pricing',
  activarLabel: 'Probar software gratis 30 días',
} as const
