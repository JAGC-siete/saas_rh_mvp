import type { CurrencyCode, VentasPricingTier } from './types'

export function normalizeCouponCode(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().toLowerCase()
}

export function roundMoney(n: number): number {
  const v = Number.isFinite(n) ? n : 0
  return Math.round(v * 100) / 100
}

export function clampInt(n: number, min: number, max: number): number {
  const v = Number.isFinite(n) ? Math.trunc(n) : 0
  return Math.max(min, Math.min(max, v))
}

export function resolveTierByEmployees(
  tiers: VentasPricingTier[],
  employeesCount: number
): VentasPricingTier | null {
  const n = employeesCount
  const active = (tiers || []).filter((t) => (t?.is_active ?? true) === true)
  for (const tier of active) {
    if (n >= tier.min_employees && n <= tier.max_employees) return tier
  }
  return null
}

export function formatMoney(currency: CurrencyCode, amount: number): string {
  const formatted = roundMoney(amount).toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (currency === 'USD') return `$${formatted}`
  if (currency === 'GTQ') return `Q ${formatted}`
  return `L. ${formatted}`
}

