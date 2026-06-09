import type { SupabaseClient } from '@supabase/supabase-js'
import { audit } from '../audit'
import { planTypeFromEmployeesCount } from './tier-to-plan'

export type PaymentKind = 'deposit' | 'subscription' | 'adjustment'

export interface ActivateFromQuoteParams {
  companyId: string
  amountHnl: number
  reference: string
  createdBy?: string | null
  quoteId?: string | null
  paidAt?: string
  paymentKind?: PaymentKind
  planType?: string | null
  employeesCount?: number | null
}

export interface ActivateFromQuoteResult {
  payment_id: string
  quote_id: string
  payment_status: string
  activated: boolean
  plan_type: string | null
}

export async function activateFromQuote(
  supabase: SupabaseClient,
  params: ActivateFromQuoteParams
): Promise<ActivateFromQuoteResult> {
  const planType =
    params.planType ??
    (params.employeesCount != null ? planTypeFromEmployeesCount(params.employeesCount) : null)

  const { data, error } = await supabase.rpc('activate_from_quote', {
    p_company_id: params.companyId,
    p_amount_hnl: params.amountHnl,
    p_reference: params.reference,
    p_created_by: params.createdBy ?? null,
    p_quote_id: params.quoteId ?? null,
    p_paid_at: params.paidAt ?? new Date().toISOString(),
    p_payment_kind: params.paymentKind ?? 'deposit',
    p_plan_type: planType,
  })

  if (error) {
    const code = error.message || 'ACTIVATION_FAILED'
    if (code.includes('QUOTE_NOT_FOUND')) throw new Error('QUOTE_NOT_FOUND')
    if (code.includes('COMPANY_NOT_FOUND')) throw new Error('COMPANY_NOT_FOUND')
    if (code.includes('QUOTE_COMPANY_MISMATCH')) throw new Error('QUOTE_COMPANY_MISMATCH')
    if (code.includes('INVALID_AMOUNT')) throw new Error('INVALID_AMOUNT')
    throw new Error(error.message || 'ACTIVATION_FAILED')
  }

  const result = data as ActivateFromQuoteResult

  if (params.createdBy) {
    try {
      await audit(supabase, {
        user_id: params.createdBy,
        company_id: params.companyId,
        event: result.activated ? 'subscription_activated' : 'deposit_received',
        meta: {
          payment_id: result.payment_id,
          quote_id: result.quote_id,
          amount_hnl: params.amountHnl,
          payment_kind: params.paymentKind ?? 'deposit',
          reference: params.reference,
          activated: result.activated,
          plan_type: result.plan_type,
        },
      })
    } catch {
      // audit is best-effort
    }
  }

  return result
}
