import type { CurrencyCode, QuotationQuote } from './types'
import { roundMoney } from './pricing'

/** Precio lista de hardware y cuotas de continuidad están definidos en HNL. */
export const VENTAS_PRICE_LIST_CURRENCY: CurrencyCode = 'HNL'

/**
 * Tipos de cambio comerciales (unidades de moneda local por 1 USD).
 * Override: VENTAS_FX_HNL_PER_USD, VENTAS_FX_GTQ_PER_USD.
 */
function hnlPerUsd(): number {
  const raw = Number(process.env.VENTAS_FX_HNL_PER_USD)
  return Number.isFinite(raw) && raw > 0 ? raw : 24.7
}

function gtqPerUsd(): number {
  const raw = Number(process.env.VENTAS_FX_GTQ_PER_USD)
  return Number.isFinite(raw) && raw > 0 ? raw : 7.75
}

function toUsd(amount: number, from: CurrencyCode): number {
  if (from === 'USD') return amount
  if (from === 'HNL') return amount / hnlPerUsd()
  return amount / gtqPerUsd()
}

function fromUsd(amountUsd: number, to: CurrencyCode): number {
  if (to === 'USD') return amountUsd
  if (to === 'HNL') return amountUsd * hnlPerUsd()
  return amountUsd * gtqPerUsd()
}

/** Convierte un monto entre monedas del motor de ventas (pivot USD). */
export function convertVentasMoney(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): number {
  if (from === to) return roundMoney(amount)
  return roundMoney(fromUsd(toUsd(amount, from), to))
}

/** Sustantivo para footer / copy: lempiras | dólares | quetzales. */
export function currencyNoun(currency: CurrencyCode): string {
  if (currency === 'USD') return 'dólares'
  if (currency === 'GTQ') return 'quetzales'
  return 'lempiras'
}

export function pricesInCurrencyFooter(currency: CurrencyCode): string {
  return `Precios en ${currencyNoun(currency)}`
}

/**
 * Traduce montos de la cotización a la moneda del país (email + PDF).
 * No muta el objeto original.
 */
export function localizeQuotationQuote(
  quote: QuotationQuote,
  from: CurrencyCode,
  to: CurrencyCode
): QuotationQuote {
  if (from === to) return { ...quote, currency: to }

  return {
    ...quote,
    currency: to,
    annual_subtotal: convertVentasMoney(quote.annual_subtotal, from, to),
    annual_discount_amount: convertVentasMoney(quote.annual_discount_amount, from, to),
    annual_total: convertVentasMoney(quote.annual_total, from, to),
    monthly_software_total: convertVentasMoney(quote.monthly_software_total, from, to),
    monthly_hardware_fee: convertVentasMoney(quote.monthly_hardware_fee, from, to),
    monthly_total: convertVentasMoney(quote.monthly_total, from, to),
    hardware_sale_total: convertVentasMoney(quote.hardware_sale_total, from, to),
    hardware_sale_unit_price:
      typeof quote.hardware_sale_unit_price === 'number'
        ? convertVentasMoney(quote.hardware_sale_unit_price, from, to)
        : quote.hardware_sale_unit_price,
  }
}
