import { trackGA4Event } from './ga4'
import { trackCTAClick } from './googleAds'

export type CalculatorTool =
  | 'deducciones_hnd'
  | 'deducciones_slv'
  | 'deducciones_gtm'
  | 'aguinaldo_hnd'
  | 'catorceavo_hnd'
  | 'prestaciones_hnd'

/** Cálculo completado con éxito (engagement; marcar como Key event opcional en GA4). */
export function trackCalcComplete(params: {
  tool: CalculatorTool
  value?: number
  modo?: string
}): void {
  trackGA4Event('calc_complete', {
    event_category: 'Calculator',
    event_label: params.tool,
    tool: params.tool,
    ...(params.modo ? { modo: params.modo } : {}),
    ...(params.value !== undefined ? { value: params.value } : {}),
  })
}

/** Lead capturado vía PDF/email en calculadora (conversión de lead). */
export function trackCalcLeadSubmit(params: {
  tool: CalculatorTool
  hasPhone?: boolean
  hasCompany?: boolean
}): void {
  trackGA4Event('calc_lead_submit', {
    event_category: 'Lead',
    event_label: params.tool,
    tool: params.tool,
    has_phone: params.hasPhone ?? false,
    has_company: params.hasCompany ?? false,
  })
}

/** Clic en CTA Activar desde calculadora. */
export function trackCalcActivarClick(tool: CalculatorTool, placement: string): void {
  trackCTAClick(`activar_${tool}`, `calc_${tool}_${placement}`)
}
