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
  employees_count: number
  terminals_count?: number
  tipo_establecimiento?: string
  coupon_code?: string
  consent_newsletter?: boolean
}

export interface QuotationQuote {
  currency: CurrencyCode
  subtotal: number
  discount_amount: number
  total: number
  coupon_applied: boolean
  discount_pct_applied: number
  tier: { min_employees: number; max_employees: number }
}

export interface QuotationResponse {
  success: boolean
  message: string
  quote_id?: string
  quote?: QuotationQuote
}

