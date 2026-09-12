import type { CommercialPlanType } from '../billing/plans'
import type { QuotationQuote } from './types'
import { roundMoney } from './pricing'
import {
  isMicroEmployeeSegment,
  isMonthlyModalityAvailable,
  type VentasBusinessRules,
} from './business-rules'

export type VentasProductKind = 'basic' | 'regular'

/** Módulos del plan básico (membresía anual, sin reloj). */
export const VENTAS_BASIC_MODULE_LABELS = [
  'Expedientes digitales',
  'Asistencia por input manual',
  'Recibos de nómina',
] as const

export type VentasProductSelection = {
  kind: VentasProductKind
  isMicro: boolean
  includeTerminals: boolean
  /** Alias de includeTerminals (payload legado). */
  complementBiometric: boolean
  affiliateMembership: boolean
  includeEnterprise: boolean
  chargeHardware: boolean
  forceAnnual: boolean
  applyMembershipDiscount: boolean
  commercialPlanType: CommercialPlanType
}

export function resolveVentasProductSelection(params: {
  employeesCount: number
  complementBiometric?: boolean
  includeTerminals?: boolean
  affiliateMembership?: boolean
  includeEnterprise?: boolean
  rules?: Partial<VentasBusinessRules> | null
}): VentasProductSelection {
  const includeTerminals =
    params.includeTerminals === true || params.complementBiometric === true
  const includeEnterprise = params.includeEnterprise === true
  const kind: VentasProductKind = includeTerminals ? 'regular' : 'basic'
  const affiliateMembership = includeTerminals && params.affiliateMembership === true
  const isMicro = isMicroEmployeeSegment(params.employeesCount, params.rules)

  return {
    kind,
    isMicro,
    includeTerminals,
    complementBiometric: includeTerminals,
    affiliateMembership,
    includeEnterprise,
    chargeHardware: includeTerminals,
    forceAnnual: !includeTerminals,
    applyMembershipDiscount: affiliateMembership,
    commercialPlanType: includeEnterprise ? 'enterprise' : includeTerminals ? 'premium' : 'basic',
  }
}

export function ventasProductKindFromQuote(
  quote: Pick<QuotationQuote, 'product_kind' | 'employees_count' | 'business_rules'>
): VentasProductKind {
  if (quote.product_kind === 'basic' || quote.product_kind === 'regular') return quote.product_kind
  return 'regular'
}

export function couponDiscountAmountFromQuote(quote: QuotationQuote): number {
  if (!quote.coupon_applied) return 0
  const membership = quote.membership_applied ? quote.membership_discount_amount || 0 : 0
  return roundMoney((quote.annual_discount_amount || 0) - membership)
}

export function isMonthlyAllowedForProduct(
  product: VentasProductSelection,
  employeesCount: number,
  rules?: Partial<VentasBusinessRules> | null
): boolean {
  if (product.forceAnnual) return false
  return isMonthlyModalityAvailable(employeesCount, rules)
}
