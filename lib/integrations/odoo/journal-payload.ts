import { createAdminClient } from '../../supabase/server'
import { loadEnabledOdooConnection } from './connection'
import { OdooHttpError } from './access'

export type PayrollMovePayload = {
  sisu_journal_entry_id: string
  date: string
  ref: string
  journal_code: string
  currency: string
  company_id?: number
  lines: Array<{
    account_code: string
    name: string
    debit: number
    credit: number
  }>
}

export function mapSisuLinesToOdooPayload(input: {
  journalEntryId: string
  date: string
  ref: string
  journalCode: string
  currency: string
  odooCompanyId?: number | null
  lines: Array<{
    account_id: string
    debit: number
    credit: number
    name?: string | null
  }>
  accountMap: Map<string, string>
}): { payload: PayrollMovePayload; missingAccountIds: string[] } {
  const missingAccountIds: string[] = []
  const mappedLines: PayrollMovePayload['lines'] = []
  for (const line of input.lines) {
    const odooCode = input.accountMap.get(line.account_id)
    if (!odooCode) {
      missingAccountIds.push(line.account_id)
      continue
    }
    mappedLines.push({
      account_code: odooCode,
      name: line.name || input.ref || 'SISU payroll',
      debit: line.debit,
      credit: line.credit,
    })
  }
  return {
    missingAccountIds,
    payload: {
      sisu_journal_entry_id: input.journalEntryId,
      date: input.date,
      ref: input.ref,
      journal_code: input.journalCode,
      currency: input.currency,
      ...(input.odooCompanyId != null ? { company_id: input.odooCompanyId } : {}),
      lines: mappedLines,
    },
  }
}

export async function buildPayrollMovePayloads(
  companyId: string,
  runId: string
): Promise<Array<{ jobKey: string; payload: PayrollMovePayload }>> {
  const conn = await loadEnabledOdooConnection(companyId)
  if (!conn) {
    throw new OdooHttpError('Odoo no está configurado o está deshabilitado', 400)
  }

  const supabase = createAdminClient()
  const { data: entries, error: entriesError } = await supabase
    .from('journal_entries')
    .select('id, entry_date, description, currency, status')
    .eq('payroll_run_id', runId)
    .eq('company_id', companyId)
    .neq('status', 'void')
    .order('created_at')

  if (entriesError) {
    throw new OdooHttpError('Error leyendo partidas contables', 500)
  }
  if (!entries?.length) {
    throw new OdooHttpError('No hay partidas para esta corrida. Genere asientos primero.', 400)
  }

  const entryIds = entries.map((e) => e.id)
  const { data: lines } = await supabase
    .from('journal_entry_lines')
    .select('journal_entry_id, account_id, debit_amount, credit_amount, description')
    .in('journal_entry_id', entryIds)

  const { data: maps } = await supabase
    .from('odoo_account_map')
    .select('sisu_account_id, odoo_account_code')
    .eq('company_id', companyId)

  const codeBySisu = new Map(
    (maps ?? []).map((m) => [m.sisu_account_id as string, m.odoo_account_code as string])
  )

  const missing = new Set<string>()
  const payloads: Array<{ jobKey: string; payload: PayrollMovePayload }> = []

  for (const entry of entries) {
    const entryLines = (lines ?? []).filter((l) => l.journal_entry_id === entry.id)
    if (entryLines.length === 0) {
      throw new OdooHttpError(`La partida ${entry.id} no tiene líneas`, 400)
    }
    const mapped = mapSisuLinesToOdooPayload({
      journalEntryId: entry.id,
      date: entry.entry_date,
      ref: entry.description || entry.id,
      journalCode: conn.journalCode,
      currency: entry.currency || 'HNL',
      odooCompanyId: conn.odooCompanyId,
      accountMap: codeBySisu,
      lines: entryLines.map((line) => ({
        account_id: line.account_id as string,
        debit: Number(line.debit_amount) || 0,
        credit: Number(line.credit_amount) || 0,
        name: (line.description as string) || (entry.description as string),
      })),
    })
    for (const id of mapped.missingAccountIds) missing.add(id)
    payloads.push({
      jobKey: `journal_entry:${entry.id}`,
      payload: mapped.payload,
    })
  }

  if (missing.size > 0) {
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name')
      .in('id', [...missing])
    const labels = (accounts ?? [])
      .map((a) => `${a.code} ${a.name}`.trim())
      .join(', ')
    throw new OdooHttpError(
      `Faltan cuentas en el mapa Odoo: ${labels || [...missing].join(', ')}`,
      400
    )
  }

  return payloads
}
