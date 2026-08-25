import { createAdminClient } from '../../supabase/server'
import { loadEnabledOdooConnection, isOdooKeyExpired } from './connection'
import { createOdooTransport } from './factory'
import { OdooTransportError, sanitizeOdooErrorMessage } from './types'

const MAX_ATTEMPTS = 5
const STALE_PROCESSING_MS = 10 * 60 * 1000

type OutboxRow = {
  id: string
  company_id: string
  kind: 'employee' | 'journal_entry'
  payload: Record<string, unknown>
  attempts: number
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function sisuIdFromPayload(row: OutboxRow): string | null {
  const raw =
    row.kind === 'employee' ? row.payload.sisu_id : row.payload.sisu_journal_entry_id
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

async function claimOutboxRow(
  supabase: ReturnType<typeof createAdminClient>,
  outboxId: string
): Promise<(OutboxRow & { status: string }) | null> {
  const { data, error } = await supabase
    .from('odoo_outbox')
    .update({
      status: 'processing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', outboxId)
    .eq('status', 'pending')
    .select('id, company_id, kind, payload, attempts, status')
    .maybeSingle()

  if (error || !data) return null
  return {
    id: data.id,
    company_id: data.company_id,
    kind: data.kind,
    payload: asRecord(data.payload),
    attempts: data.attempts ?? 0,
    status: data.status,
  }
}

async function markSent(
  supabase: ReturnType<typeof createAdminClient>,
  row: OutboxRow,
  odooId: number,
  odooModel: string
) {
  await supabase
    .from('odoo_outbox')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)

  const sisuId = sisuIdFromPayload(row)
  if (!sisuId) return

  await supabase.from('odoo_id_map').upsert(
    {
      company_id: row.company_id,
      entity: row.kind,
      sisu_id: sisuId,
      odoo_id: odooId,
      odoo_model: odooModel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'company_id,entity,sisu_id' }
  )
}

async function markFailure(
  supabase: ReturnType<typeof createAdminClient>,
  row: OutboxRow,
  error: unknown,
  dead: boolean
): Promise<'dead' | 'retry'> {
  const raw = error instanceof Error ? error.message : String(error)
  const message = sanitizeOdooErrorMessage(raw)
  const attempts = (row.attempts ?? 0) + 1
  const status = dead || attempts >= MAX_ATTEMPTS ? 'dead' : 'pending'
  await supabase
    .from('odoo_outbox')
    .update({
      status,
      attempts,
      last_error: message.slice(0, 2000),
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
  return status === 'dead' ? 'dead' : 'retry'
}

export async function reclaimStaleOdooOutbox(): Promise<number> {
  const supabase = createAdminClient()
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MS).toISOString()
  const { data, error } = await supabase
    .from('odoo_outbox')
    .update({
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'processing')
    .lt('updated_at', cutoff)
    .select('id')

  if (error) return 0
  return data?.length ?? 0
}

export async function processOdooOutboxRow(
  outboxId: string
): Promise<'sent' | 'dead' | 'retry' | 'skip'> {
  const supabase = createAdminClient()
  const claimed = await claimOutboxRow(supabase, outboxId)
  if (!claimed) return 'skip'

  const row: OutboxRow = {
    id: claimed.id,
    company_id: claimed.company_id,
    kind: claimed.kind,
    payload: claimed.payload,
    attempts: claimed.attempts,
  }

  const conn = await loadEnabledOdooConnection(row.company_id)
  if (!conn) {
    return markFailure(supabase, row, 'Odoo connection missing or disabled', true)
  }
  if (isOdooKeyExpired(conn.keyExpiresAt)) {
    return markFailure(supabase, row, 'Odoo API key expired', true)
  }

  try {
    const transport = createOdooTransport(conn)
    if (row.kind === 'employee') {
      const result = asRecord(
        await transport.call('humano.sisu.bridge', 'upsert_employee', { vals: row.payload })
      )
      const odooId = Number(result.odoo_id)
      if (!Number.isFinite(odooId)) {
        throw new OdooTransportError('upsert_employee missing odoo_id', 502, true)
      }
      await markSent(supabase, row, odooId, 'hr.employee')
      return 'sent'
    }

    const result = asRecord(
      await transport.call('humano.sisu.bridge', 'import_payroll_move', { vals: row.payload })
    )
    const odooId = Number(result.odoo_move_id)
    if (!Number.isFinite(odooId)) {
      throw new OdooTransportError('import_payroll_move missing odoo_move_id', 502, true)
    }
    await markSent(supabase, row, odooId, 'account.move')
    return 'sent'
  } catch (err) {
    const dead = err instanceof OdooTransportError && !err.retryable
    return markFailure(supabase, row, err, dead)
  }
}

export async function processPendingOdooOutbox(limit = 25): Promise<{
  processed: number
  sent: number
  dead: number
  retry: number
}> {
  const supabase = createAdminClient()
  await reclaimStaleOdooOutbox()

  const { data, error } = await supabase
    .from('odoo_outbox')
    .select('id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error || !data?.length) {
    return { processed: 0, sent: 0, dead: 0, retry: 0 }
  }

  let sent = 0
  let dead = 0
  let retry = 0
  for (const row of data) {
    const result = await processOdooOutboxRow(row.id)
    if (result === 'sent') sent += 1
    else if (result === 'dead') dead += 1
    else if (result === 'retry') retry += 1
  }
  return { processed: data.length, sent, dead, retry }
}
