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
  body: 'Recibí por correo recordatorios de aguinaldo, catorceavo y cambios en deducciones — para no depender solo de lo que diga tu recibo.',
  ctaLabel: 'Activar alertas gratis',
  shareLabel: 'Compartir',
  pricingLabel: 'Ver todas las calculadoras',
  pricingHref: '/calculadora?utm_source=calculadoras&utm_medium=bridge&utm_campaign=suscripcion-hub',
} as const
