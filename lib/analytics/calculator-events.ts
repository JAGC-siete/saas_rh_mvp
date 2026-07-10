import { trackGA4Event } from './ga4'
import { fireGoogleAdsLeadConversion, trackCTAClick } from './googleAds'
import { trackCalculatorCompleteRegistration } from './metaPixel'

export type CalculatorTool =
  | 'deducciones_hnd'
  | 'deducciones_slv'
  | 'deducciones_gtm'
  | 'aguinaldo_hnd'
  | 'catorceavo_hnd'
  | 'prestaciones_hnd'

export type CalculatorAudience = 'empleado' | 'empresa'

function fireLeadConversion(): void {
  fireGoogleAdsLeadConversion()
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

/** Lead capturado vía PDF/email — conversión principal (Google Ads + Meta CompleteRegistration). */
export function trackCalcLeadSubmit(params: {
  tool: CalculatorTool
  eventId: string
  email: string
  audience?: CalculatorAudience | null
  hasPhone?: boolean
  hasCompany?: boolean
  phone?: string
  firstName?: string
}): void {
  fireLeadConversion()

  trackCalculatorCompleteRegistration({
    eventId: params.eventId,
    email: params.email,
    tool: params.tool,
    phone: params.phone,
    firstName: params.firstName,
  })

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
