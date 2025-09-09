import { startOfMonth } from 'date-fns'

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
  // 1) Get subscription status
  const { data: sub, error: subError } = await supabase
    .from('company_subscriptions')
    .select('status, plan, trial_end')
    .eq('company_id', company_id)
    .single()

  if (subError && subError.code !== 'PGRST116') {
    console.error('Error fetching subscription:', subError)
    throw new Error('SUBSCRIPTION_ERROR')
  }

  const now = new Date()
  const inTrial = sub && sub.status === 'trial' && new Date(sub.trial_end) > now
  const isActive = sub && sub.status === 'active'

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

  // 3) Get current month usage
  const month = startOfMonth(now).toISOString().slice(0, 10)
  const { data: meter, error: meterError } = await supabase
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
  return {
    status: sub?.status || 'trial',
    plan: sub?.plan || 'basic',
    trial_end: sub?.trial_end,
    isActive,
    inTrial
  }
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
