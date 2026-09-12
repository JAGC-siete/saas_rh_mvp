import type { CommercialPlanType } from './plans'

export function planTypeFromQuoteFlags(params: {
  includeTerminals?: boolean
  includeEnterprise?: boolean
  productKind?: string | null
  commercialPlanType?: string | null
}): CommercialPlanType {
  const explicit = (params.commercialPlanType || '').trim().toLowerCase()
  if (explicit === 'enterprise' || explicit === 'premium' || explicit === 'basic') {
    return explicit
  }
  if (params.includeEnterprise) return 'enterprise'
  if (params.includeTerminals || params.productKind === 'regular') return 'premium'
  return 'basic'
}

/**
 * Fallback legado: cotizaciones sin flags de producto.
 * Nuevas cotizaciones deben usar planTypeFromQuoteFlags.
 */
export function planTypeFromEmployeesCount(employeesCount: number): CommercialPlanType {
  if (employeesCount <= 50) return 'basic'
  if (employeesCount <= 100) return 'premium'
  return 'enterprise'
}
