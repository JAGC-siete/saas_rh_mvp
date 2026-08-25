import { createAdminClient } from '../../supabase/server'
import { addOdooSyncJob } from '../../queues/odooSyncQueue'
import { loadEnabledOdooConnection } from './connection'

export { ODOO_EMPLOYEE_SYNC_FIELDS, employeeSyncFieldsChanged } from './employee-sync-fields'

export type OdooOutboxKind = 'employee' | 'journal_entry'

export async function enqueueOdooOutbox(input: {
  companyId: string
  kind: OdooOutboxKind
  jobKey: string
  payload: Record<string, unknown>
}): Promise<string | null> {
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('odoo_outbox')
    .select('id, status')
    .eq('company_id', input.companyId)
    .eq('job_key', input.jobKey)
    .in('status', ['pending', 'processing'])
    .maybeSingle()

  if (existing?.status === 'processing') {
    return existing.id
  }

  if (existing?.id) {
    await supabase
      .from('odoo_outbox')
      .update({
        payload: input.payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    addOdooSyncJob(existing.id)
    return existing.id
  }

  const { data, error } = await supabase
    .from('odoo_outbox')
    .insert({
      company_id: input.companyId,
      kind: input.kind,
      job_key: input.jobKey,
      payload: input.payload,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !data) {
    console.warn('[odoo] outbox insert failed:', error?.message)
    return null
  }
  addOdooSyncJob(data.id)
  return data.id
}

export async function enqueueEmployeeOdooSync(employee: {
  id: string
  company_id: string
  name: string
  dni: string
  email?: string | null
  status?: string | null
}): Promise<void> {
  const conn = await loadEnabledOdooConnection(employee.company_id)
  if (!conn) return

  await enqueueOdooOutbox({
    companyId: employee.company_id,
    kind: 'employee',
    jobKey: `employee:${employee.id}`,
    payload: {
      sisu_id: employee.id,
      name: employee.name,
      identification_id: employee.dni,
      work_email: employee.email || null,
      active: employee.status !== 'inactive',
      ...(conn.odooCompanyId != null ? { company_id: conn.odooCompanyId } : {}),
    },
  })
}
