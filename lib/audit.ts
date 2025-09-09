export interface AuditEvent {
  user_id: string
  company_id: string
  event: string
  meta?: Record<string, any>
}

export async function audit(supabase: any, event: AuditEvent): Promise<void> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        actor_user_id: event.user_id,
        company_id: event.company_id,
        event: event.event,
        meta: event.meta || {},
        occurred_at: new Date().toISOString()
      })

    if (error) {
      console.error('Audit logging failed:', error)
      // Don't throw - audit failures shouldn't break main operations
    }
  } catch (error) {
    console.error('Audit logging error:', error)
    // Don't throw - audit failures shouldn't break main operations
  }
}

// Convenience functions for common audit events
export async function auditLogin(supabase: any, user_id: string, company_id: string) {
  return audit(supabase, {
    user_id,
    company_id,
    event: 'login',
    meta: { timestamp: new Date().toISOString() }
  })
}

export async function auditTrialStarted(supabase: any, user_id: string, company_id: string) {
  return audit(supabase, {
    user_id,
    company_id,
    event: 'trial_started',
    meta: { timestamp: new Date().toISOString() }
  })
}

export async function auditPayrollGenerated(supabase: any, user_id: string, company_id: string, period: string) {
  return audit(supabase, {
    user_id,
    company_id,
    event: 'payroll_generated',
    meta: { period, timestamp: new Date().toISOString() }
  })
}

export async function auditVoucherSent(supabase: any, user_id: string, company_id: string, employee_id: string) {
  return audit(supabase, {
    user_id,
    company_id,
    event: 'voucher_sent',
    meta: { employee_id, timestamp: new Date().toISOString() }
  })
}

export async function auditEmployeeCreated(supabase: any, user_id: string, company_id: string, employee_id: string) {
  return audit(supabase, {
    user_id,
    company_id,
    event: 'employee_created',
    meta: { employee_id, timestamp: new Date().toISOString() }
  })
}

export async function auditInviteSent(supabase: any, user_id: string, company_id: string, invite_email: string) {
  return audit(supabase, {
    user_id,
    company_id,
    event: 'invite_sent',
    meta: { invite_email, timestamp: new Date().toISOString() }
  })
}
