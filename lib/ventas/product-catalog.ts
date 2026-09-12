import type { CommercialPlanType } from '../billing/plans'
import type { QuotationQuote } from './types'
import { roundMoney } from './pricing'
import {
  isMicroEmployeeSegment,
  isMonthlyModalityAvailable,
  type VentasBusinessRules,
} from './business-rules'

export type VentasProductKind = 'basic' | 'regular'

/** Módulos de la membresía anual (product_kind = basic, sin reloj). */
export const VENTAS_BASIC_MODULE_LABELS = [
  'Expedientes digitales',
  'Asistencia por marcas a mano',
  'Recibos de nómina',
] as const

/** Payload canónico de /membresia-anual = clocks OFF en el motor. */
export const VENTAS_BASIC_QUOTE_FLAGS = {
  billing_modality: 'annual' as const,
  terminals_count: 0,
  include_terminals: false,
  complement_biometric: false,
  affiliate_membership: true,
  include_enterprise: false,
}

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
  /** Suma basic_annual_price al rango con relojes. Sin relojes esa cifra ya es el total. */
  chargeMembershipFee: boolean
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
  const affiliateMembership = params.affiliateMembership === true
  const stackOnRange = includeTerminals && affiliateMembership
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
    applyMembershipDiscount: stackOnRange,
    chargeMembershipFee: stackOnRange,
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
