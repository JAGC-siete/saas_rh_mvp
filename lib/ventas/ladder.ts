import type { CurrencyCode, QuotationQuote } from './types'
import { roundMoney } from './pricing'
import { convertVentasMoney, VENTAS_PRICE_LIST_CURRENCY } from './currency'
import {
  mergeVentasBusinessRules,
  type VentasBillingModality,
  type VentasBusinessRules,
} from './business-rules'

/**
 * Escalera de precios (2026-10): tres planes con empleados ilimitados.
 * Las claves internas coinciden con plan_catalog / plan_features.
 */
export const LADDER_PLAN_KEYS = ['basic', 'pro', 'enterprise'] as const
export type LadderPlanKey = (typeof LADDER_PLAN_KEYS)[number]

export const LADDER_PLAN_NAMES: Record<LadderPlanKey, string> = {
  basic: 'Esencial',
  pro: 'Profesional',
  enterprise: 'Empresarial',
}

/** companies.plan_type que recibe el cliente al pagar (pro se llama premium ahí). */
export const LADDER_COMMERCIAL_PLAN_TYPE: Record<LadderPlanKey, 'basic' | 'premium' | 'enterprise'> = {
  basic: 'basic',
  pro: 'premium',
  enterprise: 'enterprise',
}

export const LADDER_PLAN_MODULES: Record<LadderPlanKey, string[]> = {
  basic: [
    'Planilla y deducciones de ley (IHSS, RAP, ISR)',
    '13.º y 14.º salario',
    'Asistencia, departamentos y reportes',
  ],
  pro: [
    'Todo lo del plan Esencial',
    'Cesantías y liquidaciones',
    'Contabilidad de planilla',
  ],
  enterprise: [
    'Todo lo del plan Profesional',
    'Portal de empleados',
    'Evaluaciones de desempeño y descriptores de puesto',
  ],
}

/** Arranque asistido en dólares (lista fija para El Salvador). */
export const LADDER_ONBOARDING_FEE_USD = 99

export type LadderPlanPrice = {
  plan_key: LadderPlanKey
  name: string
  description: string
  /** HNL con ISV, redondeado. */
  monthly_price_hnl: number
  annual_price_hnl: number
  /** Lista fija en dólares (El Salvador). */
  monthly_price_usd: number
  annual_price_usd: number
  included_terminals_annual: number
}

/** Mismos valores que la migración 20261022180000_plan_catalog_ladder_prices. */
export const FALLBACK_LADDER_PLANS: LadderPlanPrice[] = [
  {
    plan_key: 'basic',
    name: 'Esencial',
    description: 'Planilla, deducciones de ley, 13.º y 14.º salario, asistencia, departamentos y reportes',
    monthly_price_hnl: 1300,
    annual_price_hnl: 15600,
    monthly_price_usd: 49,
    annual_price_usd: 588,
    included_terminals_annual: 1,
  },
  {
    plan_key: 'pro',
    name: 'Profesional',
    description: 'Esencial + cesantías y liquidaciones + contabilidad de planilla',
    monthly_price_hnl: 3500,
    annual_price_hnl: 42000,
    monthly_price_usd: 129,
    annual_price_usd: 1548,
    included_terminals_annual: 1,
  },
  {
    plan_key: 'enterprise',
    name: 'Empresarial',
    description: 'Profesional + portal de empleados, evaluaciones de desempeño y descriptores de puesto',
    monthly_price_hnl: 6700,
    annual_price_hnl: 80400,
    monthly_price_usd: 249,
    annual_price_usd: 2988,
    included_terminals_annual: 1,
  },
]

export function isLadderPlanKey(v: unknown): v is LadderPlanKey {
  return typeof v === 'string' && (LADDER_PLAN_KEYS as readonly string[]).includes(v)
}

export function parseLadderPlanKey(v: unknown): LadderPlanKey | null {
  if (typeof v !== 'string') return null
  const key = v.trim().toLowerCase()
  if (isLadderPlanKey(key)) return key
  if (key === 'esencial') return 'basic'
  if (key === 'profesional' || key === 'premium') return 'pro'
  if (key === 'empresarial') return 'enterprise'
  return null
}

function positiveOr(raw: unknown, fallback: number): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/**
 * Filas de plan_catalog → precios de la escalera. Un plan sin precio válido
 * usa su fallback para que la cotización nunca salga en cero.
 */
export function parseLadderPlans(rows: unknown): LadderPlanPrice[] {
  const byKey = new Map<string, Record<string, unknown>>()
  if (Array.isArray(rows)) {
    for (const row of rows) {
      const key = (row as Record<string, unknown>)?.plan_key
      if (typeof key === 'string') byKey.set(key, row as Record<string, unknown>)
    }
  }
  return FALLBACK_LADDER_PLANS.map((fallback) => {
    const row = byKey.get(fallback.plan_key)
    if (!row) return fallback
    const monthlyHnl = positiveOr(row.monthly_price_hnl, fallback.monthly_price_hnl)
    const monthlyUsd = positiveOr(row.monthly_price_usd, fallback.monthly_price_usd)
    const included = Number(row.included_terminals_annual)
    return {
      plan_key: fallback.plan_key,
      name: typeof row.name === 'string' && row.name.trim() ? row.name.trim() : fallback.name,
      description:
        typeof row.description === 'string' && row.description.trim()
          ? row.description.trim()
          : fallback.description,
      monthly_price_hnl: monthlyHnl,
      annual_price_hnl: positiveOr(row.annual_price_hnl, roundMoney(monthlyHnl * 12)),
      monthly_price_usd: monthlyUsd,
      annual_price_usd: positiveOr(row.annual_price_usd, roundMoney(monthlyUsd * 12)),
      included_terminals_annual:
        Number.isFinite(included) && included >= 0 ? Math.trunc(included) : fallback.included_terminals_annual,
    }
  })
}

export async function loadLadderPlans(supabase: { from: (table: string) => any }): Promise<LadderPlanPrice[]> {
  try {
    const { data, error } = await supabase
      .from('plan_catalog')
      .select(
        'plan_key, name, description, monthly_price_hnl, annual_price_hnl, monthly_price_usd, annual_price_usd, included_terminals_annual'
      )
      .in('plan_key', [...LADDER_PLAN_KEYS])
    if (error) return FALLBACK_LADDER_PLANS
    return parseLadderPlans(data)
  } catch {
    return FALLBACK_LADDER_PLANS
  }
}

export function findLadderPlan(plans: LadderPlanPrice[], key: LadderPlanKey): LadderPlanPrice {
  return plans.find((p) => p.plan_key === key) || FALLBACK_LADDER_PLANS.find((p) => p.plan_key === key)!
}

/** Montos publicados redondos: dólares al entero, quetzales a Q 5. */
export function roundPublishedPrice(amount: number, currency: CurrencyCode): number {
  if (currency === 'USD') return Math.round(amount)
  if (currency === 'GTQ') return Math.round(amount / 5) * 5
  return roundMoney(amount)
}

function fromHnl(amountHnl: number, currency: CurrencyCode): number {
  if (currency === VENTAS_PRICE_LIST_CURRENCY) return roundMoney(amountHnl)
  return roundPublishedPrice(convertVentasMoney(amountHnl, VENTAS_PRICE_LIST_CURRENCY, currency), currency)
}

/** Precio mensual y anual del plan en la moneda del país. El anual siempre es 12 meses. */
export function ladderPlanPrices(
  plan: LadderPlanPrice,
  currency: CurrencyCode
): { monthly: number; annual: number } {
  if (currency === 'USD') {
    return { monthly: plan.monthly_price_usd, annual: plan.annual_price_usd }
  }
  if (currency === 'HNL') {
    return { monthly: plan.monthly_price_hnl, annual: plan.annual_price_hnl }
  }
  const monthly = fromHnl(plan.monthly_price_hnl, currency)
  return { monthly, annual: roundMoney(monthly * 12) }
}

export function ladderTerminalUnitPrice(
  currency: CurrencyCode,
  rules?: Partial<VentasBusinessRules> | null
): number {
  return fromHnl(mergeVentasBusinessRules(rules).hardware_sale_unit_price, currency)
}

export function ladderOnboardingFeeApplies(plan: LadderPlanKey, modality: VentasBillingModality): boolean {
  return modality === 'monthly' && plan !== 'enterprise'
}

export function ladderOnboardingFee(
  currency: CurrencyCode,
  rules?: Partial<VentasBusinessRules> | null
): number {
  if (currency === 'USD') return LADDER_ONBOARDING_FEE_USD
  return fromHnl(mergeVentasBusinessRules(rules).onboarding_fee_hnl, currency)
}

export function ladderNeedsCustomQuote(
  employeesCount: number,
  rules?: Partial<VentasBusinessRules> | null
): boolean {
  return employeesCount > mergeVentasBusinessRules(rules).max_auto_quote_employees
}

export function isLadderQuote(quote: Pick<QuotationQuote, 'pricing_model'>): boolean {
  return quote.pricing_model === 'ladder'
}

/**
 * Cotización de la escalera en la moneda del país. Reutiliza QuotationQuote para que
 * correo, PDF y activación sigan funcionando; los campos del modelo viejo
 * (afiliación, cupón, continuidad de hardware) quedan en cero.
 */
export function computeLadderQuote(params: {
  plan: LadderPlanPrice
  billingModality: VentasBillingModality
  terminalsCount: number
  employeesCount: number
  currency: CurrencyCode
  rules?: Partial<VentasBusinessRules> | null
}): QuotationQuote {
  const rules = mergeVentasBusinessRules(params.rules)
  const { plan, billingModality, currency } = params
  const employees = Math.max(1, Math.trunc(Number(params.employeesCount) || 1))
  const terminals = Math.min(
    rules.max_auto_quote_terminals,
    Math.max(0, Math.trunc(Number(params.terminalsCount) || 0))
  )
  const { monthly, annual } = ladderPlanPrices(plan, currency)
  const included = billingModality === 'annual' ? Math.min(terminals, plan.included_terminals_annual) : 0
  const extra = terminals - included
  const unitPrice = ladderTerminalUnitPrice(currency, rules)
  const onboarding = ladderOnboardingFeeApplies(plan.plan_key, billingModality)
    ? ladderOnboardingFee(currency, rules)
    : 0

  return {
    pricing_model: 'ladder',
    plan_key: plan.plan_key,
    plan_name: plan.name,
    currency,
    annual_subtotal: annual,
    annual_discount_amount: 0,
    annual_total: annual,
    monthly_software_total: monthly,
    monthly_hardware_fee: 0,
    monthly_total: monthly,
    hardware_sale_total: roundMoney(extra * unitPrice),
    hardware_sale_unit_price: unitPrice,
    hardware_sale_discount_pct: 0,
    onboarding_fee: onboarding,
    coupon_applied: false,
    discount_pct_applied: 0,
    coupon_code_applied: null,
    include_terminals: terminals > 0,
    complement_biometric: terminals > 0,
    include_enterprise: false,
    enterprise_applied: false,
    enterprise_annual_price: 0,
    commercial_plan_type: LADDER_COMMERCIAL_PLAN_TYPE[plan.plan_key],
    tier: {
      min_employees: employees,
      max_employees: employees,
      included_terminals_max: plan.included_terminals_annual,
    },
    hardware_mode: included > 0 ? 'included' : 'sale',
    business_rules: rules,
    billing_modality: billingModality,
    terminals_count: terminals,
    terminals_included_count: included,
    terminals_extra_count: extra,
    employees_count: employees,
  }
}

/**
 * Lo que el cliente paga para arrancar:
 * - mensual: primer mes + relojes + arranque asistido;
 * - anual: el año completo + relojes adicionales (el depósito es la mitad).
 */
export function ladderFirstPaymentTotal(quote: QuotationQuote): number {
  const hardware = Number(quote.hardware_sale_total) || 0
  if (quote.billing_modality === 'monthly') {
    return roundMoney(quote.monthly_total + hardware + (Number(quote.onboarding_fee) || 0))
  }
  return roundMoney(quote.annual_total + hardware)
}

export function ventasLadderCustomQuoteMessage(rules?: Partial<VentasBusinessRules> | null): string {
  const max = mergeVentasBusinessRules(rules).max_auto_quote_employees
  return `Para más de ${max} colaboradores preparamos una cotización a medida. Escríbenos por WhatsApp y te la enviamos.`
}

export function ventasLadderTooManyTerminalsMessage(maxTerminals: number): string {
  return `Para más de ${maxTerminals} relojes cotizamos aparte. Escríbenos por WhatsApp y te confirmamos el monto.`
}
