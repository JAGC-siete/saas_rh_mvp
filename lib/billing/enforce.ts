import { startOfMonth } from 'date-fns'
import { createAdminClient } from '../supabase/server'
import { PAID_PLAN_TYPES, TRIAL_PLAN_TYPE, normalizePlanType } from './plans'
import { BULK_VOUCHER_EMAIL_PAID_FEATURE_CODE } from './messages'

export type BillingAction = 'create_employee' | 'generate_payroll' | 'view_reports' | 'send_voucher'

export interface PlanLimits {
  pdfs: number
  vouchers: number
  attendance: number
  employees: number
}

export interface SubscriptionStatus {
  status: 'trial' | 'active' | 'past_due' | 'canceled'
  plan: string
  trial_end?: string
  isActive: boolean
  inTrial: boolean
}

export async function requirePlanAndQuota(
  supabase: any, 
  company_id: string, 
  action: BillingAction
): Promise<SubscriptionStatus> {
  // Use admin client to bypass RLS when checking subscription
  const adminSupabase = createAdminClient()
  
  // 1) Get subscription status from companies table (not company_subscriptions)
  const { data: company, error: companyError } = await adminSupabase
    .from('companies')
    .select('plan_type, subscription_status, subscription_start_date, subscription_end_date, settings, is_active')
    .eq('id', company_id)
    .single()

  if (companyError) {
    console.error('Error fetching company subscription:', companyError)
    throw new Error('SUBSCRIPTION_ERROR')
  }

  if (!company) {
    throw new Error('SUBSCRIPTION_ERROR')
  }

  const now = new Date()
  
  // Determine status based on plan_type and subscription_status
  let status: 'trial' | 'active' | 'past_due' | 'canceled' = 'trial'
  let isActive = false
  let inTrial = false
  
  // Check if company is active
  if (!company.is_active) {
    throw new Error('PLAN_REQUIRED')
  }

  // Normalize plan_type once (DB also has a CHECK constraint that enforces the
  // commercial list defined in lib/billing/plans.ts).
  const normalizedPlan = normalizePlanType(company.plan_type) ?? 'basic'

  // Determine subscription status
  if (normalizedPlan === TRIAL_PLAN_TYPE) {
    status = 'trial'
    // Check trial end date from settings
    const settings = company.settings as any
    const trialActivatedAt = settings?.trial_activated_at
    if (trialActivatedAt) {
      const trialEnd = new Date(trialActivatedAt)
      trialEnd.setDate(trialEnd.getDate() + 30) // 30 days trial
      inTrial = trialEnd > now
      if (!inTrial) {
        throw new Error('PLAN_REQUIRED')
      }
    } else {
      // If no trial_activated_at, allow as trial (backward compatibility)
      inTrial = true
    }
  } else if (company.subscription_status === 'active') {
    status = 'active'
    isActive = true
    // Check if subscription hasn't expired
    if (company.subscription_end_date) {
      const endDate = new Date(company.subscription_end_date)
      if (endDate < now) {
        status = 'past_due'
        isActive = false
      }
    }
  } else if (company.subscription_status === 'inactive' || !company.subscription_status) {
    // Plan is not trial and subscription is inactive: any paid plan must have an active subscription.
    if ((PAID_PLAN_TYPES as readonly string[]).includes(normalizedPlan)) {
      throw new Error('PLAN_REQUIRED')
    }
    // Otherwise treat as trial (defensive fallback; shouldn't happen with the CHECK constraint).
    status = 'trial'
    inTrial = true
  } else {
    status = company.subscription_status as any
  }

  if (!(inTrial || isActive)) {
    throw new Error('PLAN_REQUIRED')
  }

  // 2) Get plan limits (MVP: hardcoded; later: plan_limits table)
  const limits: PlanLimits = {
    pdfs: 3000,
    vouchers: 3000,
    attendance: 100000,
    employees: 1000
  }

  // 3) Get current month usage (use admin client for consistency)
  const month = startOfMonth(now).toISOString().slice(0, 10)
  const { data: meter, error: meterError } = await adminSupabase
    .from('company_meters')
    .select('pdfs_generated, vouchers_sent, attendances_recorded, employees_created')
    .eq('company_id', company_id)
    .eq('month', month)
    .maybeSingle()

  if (meterError) {
    console.error('Error fetching usage meter:', meterError)
    // Continue without enforcement if meter fails
  }

  // 4) Check limits based on action
  if (action === 'generate_payroll' && meter && meter.pdfs_generated >= limits.pdfs) {
    throw new Error('PDF_LIMIT_REACHED')
  }
  
  if (action === 'send_voucher' && meter && meter.vouchers_sent >= limits.vouchers) {
    throw new Error('VOUCHER_LIMIT_REACHED')
  }
  
  if (action === 'create_employee' && meter && meter.employees_created >= limits.employees) {
    throw new Error('EMPLOYEE_LIMIT_REACHED')
  }

  // 5) Return subscription status
  const settings = company.settings as any
  const trialActivatedAt = settings?.trial_activated_at
  let trialEnd: string | undefined
  if (trialActivatedAt) {
    const endDate = new Date(trialActivatedAt)
    endDate.setDate(endDate.getDate() + 30)
    trialEnd = endDate.toISOString()
  }

  return {
    status,
    plan: normalizedPlan,
    trial_end: trialEnd,
    isActive,
    inTrial
  }
}

/** Bloquea envío masivo de recibos por correo en plan trial (función de pago). */
export async function requirePaidPlanForBulkVoucherEmail(
  supabase: any,
  company_id: string
): Promise<SubscriptionStatus> {
  const subscription = await requirePlanAndQuota(supabase, company_id, 'view_reports')

  if (subscription.inTrial || subscription.plan === TRIAL_PLAN_TYPE) {
    throw new Error(BULK_VOUCHER_EMAIL_PAID_FEATURE_CODE)
  }

  return subscription
}

export async function incrementUsage(
  supabase: any,
  company_id: string,
  action: BillingAction
): Promise<void> {
  const month = startOfMonth(new Date()).toISOString().slice(0, 10)
  
  let field: string
  switch (action) {
    case 'generate_payroll':
      field = 'pdfs_generated'
      break
    case 'send_voucher':
      field = 'vouchers_sent'
      break
    case 'create_employee':
      field = 'employees_created'
      break
    case 'view_reports':
      // No usage tracking for view_reports
      return
    default:
      return
  }

  try {
    await supabase.rpc('inc_meter', {
      p_company_id: company_id,
      p_month: month,
      p_field: field
    })
  } catch (error) {
    console.error('Error incrementing usage meter:', error)
    // Don't throw - usage tracking failure shouldn't break the main operation
  }
}

export function getBillingErrorCode(error: string): number {
  switch (error) {
    case 'PLAN_REQUIRED':
      return 402 // Payment Required
    case 'PAID_FEATURE_REQUIRED':
      return 402
    case 'PDF_LIMIT_REACHED':
    case 'VOUCHER_LIMIT_REACHED':
    case 'EMPLOYEE_LIMIT_REACHED':
      return 429 // Too Many Requests
    case 'SUBSCRIPTION_ERROR':
      return 500 // Internal Server Error
    default:
      return 400 // Bad Request
  }
}
