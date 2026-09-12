import type { CurrencyCode, QuotationQuote, VentasPricingTier } from './types'
import { roundMoney } from './pricing'
import { hardwareFeeMonthly } from './modality-includes'
import {
  computeAnnualHardwareCharges,
  mergeVentasBusinessRules,
  shouldChargeHardwareContinuity,
  type VentasBillingModality,
  type VentasBusinessRules,
} from './business-rules'
import { convertVentasMoney, VENTAS_PRICE_LIST_CURRENCY } from './currency'
import {
  resolveVentasProductSelection,
  type VentasProductSelection,
} from './product-catalog'

export function computeVentasQuotationQuote(params: {
  employeesCount: number
  billingModality: VentasBillingModality
  terminalsCount: number
  complementBiometric?: boolean
  includeTerminals?: boolean
  affiliateMembership?: boolean
  includeEnterprise?: boolean
  enterpriseAnnualPrice?: number
  listCurrency: CurrencyCode
  tier: VentasPricingTier
  businessRules: VentasBusinessRules
  coupon: {
    applied: boolean
    discountPct: number
    code: string | null
  }
}): { quote: QuotationQuote; product: VentasProductSelection } {
  const rules = mergeVentasBusinessRules(params.businessRules)
  const product = resolveVentasProductSelection({
    employeesCount: params.employeesCount,
    complementBiometric: params.complementBiometric,
    includeTerminals: params.includeTerminals,
    affiliateMembership: params.affiliateMembership,
    includeEnterprise: params.includeEnterprise,
    rules,
  })

  const billingModality: VentasBillingModality = product.forceAnnual
    ? 'annual'
    : params.billingModality

  const tierHardware = {
    annual_terminal_mode: params.tier.annual_terminal_mode ?? 'auto',
    included_terminals_max: params.tier.included_terminals_max ?? null,
  }
  const ruleOpts = { rules, tier: tierHardware }

  const annualSubtotal =
    product.kind === 'basic'
      ? roundMoney(rules.basic_annual_price)
      : roundMoney(Number(params.tier.price))

  const membershipFee = product.chargeMembershipFee ? roundMoney(rules.basic_annual_price) : 0
  const enterpriseList = product.includeEnterprise
    ? roundMoney(
        Number.isFinite(params.enterpriseAnnualPrice)
          ? Number(params.enterpriseAnnualPrice)
          : rules.enterprise_annual_price
      )
    : 0

  const contractedAnnual = roundMoney(annualSubtotal + membershipFee + enterpriseList)
  const membershipPct = product.applyMembershipDiscount ? rules.membership_discount_pct : 0
  const membershipDiscountAmount = product.applyMembershipDiscount
    ? roundMoney(contractedAnnual * membershipPct)
    : 0

  const couponPct = product.kind === 'basic' ? 0 : params.coupon.applied ? params.coupon.discountPct : 0
  const couponBase = product.applyMembershipDiscount
    ? roundMoney(contractedAnnual - membershipDiscountAmount)
    : annualSubtotal
  const couponDiscountAmount = roundMoney(couponBase * couponPct)
  const softwareDiscountAmount = roundMoney(membershipDiscountAmount + couponDiscountAmount)
  const annualTotal = product.applyMembershipDiscount
    ? roundMoney(contractedAnnual - softwareDiscountAmount)
    : roundMoney(annualSubtotal - couponDiscountAmount + membershipFee + enterpriseList)
  const monthlySoftwareTotal = roundMoney(annualTotal / 12)

  const terminalsForPricing = product.chargeHardware
    ? Math.max(1, Math.floor(Number(params.terminalsCount) || 0))
    : 0

  let monthlyHardwareFee = 0
  let hardwareSaleTotalAmount = 0
  let hardwareSaleUnitPrice: number | undefined
  let hardwareSaleDiscountPct: number | undefined
  let includedCount = 0
  let extraCount = 0
  let hardwareMode = computeAnnualHardwareCharges({
    modality: billingModality,
    employeesCount: params.employeesCount,
    terminalsCount: 0,
    rules,
    tier: tierHardware,
  }).mode

  if (product.chargeHardware) {
    const hwQuote = hardwareFeeMonthly(terminalsForPricing, rules, tierHardware)
    const monthlyHardwareFeeList = shouldChargeHardwareContinuity(
      billingModality,
      params.employeesCount,
      ruleOpts
    )
      ? hwQuote.fee
      : 0
    monthlyHardwareFee = convertVentasMoney(
      monthlyHardwareFeeList,
      VENTAS_PRICE_LIST_CURRENCY,
      params.listCurrency
    )
    const hwCharges = computeAnnualHardwareCharges({
      modality: billingModality,
      employeesCount: params.employeesCount,
      terminalsCount: terminalsForPricing,
      rules,
      tier: tierHardware,
    })
    hardwareMode = hwCharges.mode
    includedCount = hwCharges.includedCount
    extraCount = hwCharges.extraCount
    if (hwCharges.sale) {
      hardwareSaleTotalAmount = convertVentasMoney(
        hwCharges.sale.total,
        VENTAS_PRICE_LIST_CURRENCY,
        params.listCurrency
      )
      hardwareSaleUnitPrice = convertVentasMoney(
        hwCharges.sale.unitPrice,
        VENTAS_PRICE_LIST_CURRENCY,
        params.listCurrency
      )
      hardwareSaleDiscountPct = hwCharges.sale.discountPct
    }
  }

  const quote: QuotationQuote = {
    currency: params.listCurrency,
    annual_subtotal: annualSubtotal,
    annual_discount_amount: softwareDiscountAmount,
    annual_total: annualTotal,
    monthly_software_total: monthlySoftwareTotal,
    monthly_hardware_fee: monthlyHardwareFee,
    monthly_total: roundMoney(monthlySoftwareTotal + monthlyHardwareFee),
    hardware_sale_total: hardwareSaleTotalAmount,
    hardware_sale_unit_price: hardwareSaleUnitPrice,
    hardware_sale_discount_pct: hardwareSaleDiscountPct,
    coupon_applied: product.kind !== 'basic' && params.coupon.applied,
    discount_pct_applied: couponPct,
    coupon_code_applied: params.coupon.applied ? params.coupon.code : null,
    product_kind: product.kind,
    membership_applied: product.applyMembershipDiscount && membershipDiscountAmount > 0,
    membership_discount_pct: product.applyMembershipDiscount ? membershipPct : 0,
    membership_discount_amount: membershipDiscountAmount,
    membership_annual_price: membershipFee,
    complement_biometric: product.includeTerminals,
    include_terminals: product.includeTerminals,
    include_enterprise: product.includeEnterprise,
    enterprise_applied: product.includeEnterprise,
    enterprise_annual_price: enterpriseList,
    commercial_plan_type: product.commercialPlanType,
    tier: {
      min_employees: params.tier.min_employees,
      max_employees: params.tier.max_employees,
      annual_terminal_mode: tierHardware.annual_terminal_mode,
      included_terminals_max: tierHardware.included_terminals_max,
    },
    hardware_mode: hardwareMode,
    business_rules: rules,
    billing_modality: billingModality,
    terminals_count: terminalsForPricing,
    terminals_included_count: includedCount,
    terminals_extra_count: extraCount,
    employees_count: params.employeesCount,
  }

  return { quote, product }
}
