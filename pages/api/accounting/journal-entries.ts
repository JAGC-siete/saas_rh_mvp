import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { withGeneralRateLimit } from '../../../lib/security/rate-limiting'
import { createAdminClient } from '../../../lib/supabase/server'

/**
 * GET /api/accounting/journal-entries
 *
 * Lista journal entries por payroll_run_id.
 * Query: payroll_run_id
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireCompanyAccess(req, res)
    const { payroll_run_id } = req.query

    if (!payroll_run_id || typeof payroll_run_id !== 'string') {
      return res.status(400).json({
        error: 'payroll_run_id es requerido'
      })
    }

    const supabase = createAdminClient()

    const { data: run } = await supabase
      .from('payroll_runs')
      .select('company_id')
      .eq('id', payroll_run_id)
      .single()

    if (!run) {
      return res.status(404).json({ error: 'Corrida de nómina no encontrada' })
    }

    const companyId = run.company_id
    if (
      auth.role !== 'super_admin' &&
      auth.companyId &&
      auth.companyId !== companyId
    ) {
      return res.status(403).json({
        error: 'No tiene permiso para ver las partidas de esta empresa'
      })
    }

    const { data: entries, error: entriesError } = await supabase
      .from('journal_entries')
      .select('id, entry_date, description, status, currency, source_reference')
      .eq('payroll_run_id', payroll_run_id)
      .eq('company_id', companyId)
      .order('created_at')

    if (entriesError) {
      console.error('Error fetching journal entries:', entriesError)
      return res.status(500).json({
        error: 'Error obteniendo partidas contables',
        details: entriesError.message
      })
    }

    const entriesList = entries ?? []

    const lineIds = entriesList.flatMap((e: any) => [e.id])
    if (lineIds.length === 0) {
      return res.status(200).json({
        entries: entriesList.map((e: any) => ({ ...e, lines: [] })),
        statutory_trace: null
      })
    }

    const { data: lines } = await supabase
      .from('journal_entry_lines')
      .select('journal_entry_id, account_id, debit_amount, credit_amount, cost_center_type, description')
      .in('journal_entry_id', entriesList.map((e: any) => e.id))

    const accountIds = [...new Set((lines ?? []).map((l: any) => l.account_id).filter(Boolean))]
    const { data: accounts } =
      accountIds.length > 0
        ? await supabase
            .from('chart_of_accounts')
            .select('id, code, name')
            .in('id', accountIds)
        : { data: [] }

    const accountMap = new Map((accounts ?? []).map((a: any) => [a.id, a]))

    const linesByEntry = new Map<string, any[]>()
    for (const l of lines ?? []) {
      const acc = accountMap.get(l.account_id)
      const arr = linesByEntry.get(l.journal_entry_id) ?? []
      arr.push({
        ...l,
        account_code: acc?.code,
        account_name: acc?.name
      })
      linesByEntry.set(l.journal_entry_id, arr)
    }

    const enriched = entriesList.map((e: any) => ({
      ...e,
      lines: linesByEntry.get(e.id) ?? []
    }))

    const statutoryTrace =
      entriesList
        .map(
          (e: { source_reference?: { statutory?: unknown } | null }) =>
            e.source_reference?.statutory
        )
        .find(Boolean) ?? null

    return res.status(200).json({
      entries: enriched,
      statutory_trace: statutoryTrace
    })
  } catch (err) {
    console.error('Error en journal-entries:', err)
    const message = err instanceof Error ? err.message : 'Error interno'
    return res.status(500).json({ error: message })
  }
}

export default withGeneralRateLimit(['GET'])(handler)
