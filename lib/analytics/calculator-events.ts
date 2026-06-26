import { trackGA4Event } from './ga4'
import { trackCTAClick } from './googleAds'

const SEND_TO_LEAD = process.env.NEXT_PUBLIC_GADS_SEND_TO_LEAD

export type CalculatorTool =
  | 'deducciones_hnd'
  | 'deducciones_slv'
  | 'deducciones_gtm'
  | 'aguinaldo_hnd'
  | 'catorceavo_hnd'
  | 'prestaciones_hnd'

export type CalculatorAudience = 'empleado' | 'empresa'

function fireLeadConversion(): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  const sendTo = SEND_TO_LEAD?.trim()
  if (!sendTo) return
  window.gtag('event', 'conversion', { send_to: sendTo })
}

/** Cálculo completado con éxito (engagement). */
export function trackCalcComplete(params: {
  tool: CalculatorTool
  value?: number
  modo?: string
  audience?: CalculatorAudience | null
}): void {
  trackGA4Event('calc_complete', {
    event_category: 'Calculator',
    event_label: params.tool,
    tool: params.tool,
    ...(params.audience ? { audience: params.audience } : {}),
    ...(params.modo ? { modo: params.modo } : {}),
    ...(params.value !== undefined ? { value: params.value } : {}),
  })
}

/** Lead capturado vía PDF/email — conversión principal para Google Ads. */
export function trackCalcLeadSubmit(params: {
  tool: CalculatorTool
  audience?: CalculatorAudience | null
  hasPhone?: boolean
  hasCompany?: boolean
}): void {
  fireLeadConversion()

  trackGA4Event('calc_lead_submit', {
    event_category: 'Lead',
    event_label: params.tool,
    tool: params.tool,
    ...(params.audience ? { audience: params.audience } : {}),
    has_phone: params.hasPhone ?? false,
    has_company: params.hasCompany ?? false,
  })
}

/** Clic en CTA Activar desde calculadora. */
export function trackCalcActivarClick(tool: CalculatorTool, placement: string): void {
  trackCTAClick(`activar_${tool}`, `calc_${tool}_${placement}`)
}
