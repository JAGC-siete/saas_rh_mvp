import type { CountryCode } from '../country/supported'

export type CurrencyCode = 'HNL' | 'USD' | 'GTQ'

export interface VentasPricingTier {
  id?: string
  min_employees: number
  max_employees: number
  price: number
  is_active?: boolean
  sort_order?: number
}

export interface VentasConfig {
  id: string
  is_active: boolean
  currency: CurrencyCode
  coupon_code: string | null
  /** 0.45 means 45% */
  coupon_discount_pct: number | null
  tiers: VentasPricingTier[]
}

export interface QuotationRequest {
  contact_email: string
  contact_name?: string
  company_name?: string
  phone?: string
  /** País de operación (misma semántica que /activar: nómina, festivos, zona horaria). */
  country_code?: CountryCode
  employees_count: number
  billing_modality?: 'annual' | 'monthly'
  terminals_count?: number
  sector_rubro?: string
  coupon_code?: string
  consent_newsletter?: boolean
}

export interface QuotationQuote {
  currency: CurrencyCode
  /** Precio anual del software (antes de descuento) */
  annual_subtotal: number
  /** Descuento aplicado al software (monto anual) */
  annual_discount_amount: number
  /** Total anual del software (después de descuento) */
  annual_total: number
  /** Total mensual del software (= annual_total/12) */
  monthly_software_total: number
  /** Fee mensual por continuidad de hardware (solo mensual) */
  monthly_hardware_fee: number
  /** Total mensual final (= monthly_software_total + monthly_hardware_fee) */
  monthly_total: number
  coupon_applied: boolean
  discount_pct_applied: number
  tier: { min_employees: number; max_employees: number }
  billing_modality: 'annual' | 'monthly'
  terminals_count: number
}

export interface QuotationUrgencyOffer {
  is_active: boolean
  quoted_total: number
  discount_amount: number
  discounted_total: number
  expires_at: string
}

export interface QuotationResponse {
  success: boolean
  message: string
  quote_id?: string
  quote?: QuotationQuote
  urgency_offer?: QuotationUrgencyOffer
}

