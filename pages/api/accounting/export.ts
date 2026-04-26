import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { withGeneralRateLimit } from '../../../lib/security/rate-limiting'
import { createAdminClient } from '../../../lib/supabase/server'

/**
 * GET /api/accounting/export
 *
 * Exporta journal entries como CSV o JSON.
 * Query: journal_entry_id (o journal_entry_ids comma-separated), format=csv|json
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireCompanyAccess(req, res)
    const { journal_entry_id, journal_entry_ids, format } = req.query

    const ids = (
      journal_entry_ids
        ? (journal_entry_ids as string).split(',').map((s) => s.trim()).filter(Boolean)
        : journal_entry_id
          ? [journal_entry_id as string]
          : []
    )

    if (ids.length === 0) {
      return res.status(400).json({
        error: 'journal_entry_id o journal_entry_ids es requerido'
      })
    }

    const exportFormat = (format as string)?.toLowerCase() === 'csv' ? 'csv' : 'json'

    const supabase = createAdminClient()

    const { data: entries, error: entriesError } = await supabase
      .from('journal_entries')
      .select('id, company_id, entry_date, description, status, currency')
      .in('id', ids)

    if (entriesError || !entries?.length) {
      return res.status(404).json({ error: 'Partida(s) no encontrada(s)' })
    }

    const companyId = entries[0].company_id
    if (
      auth.role !== 'super_admin' &&
      auth.companyId &&
      auth.companyId !== companyId
    ) {
      return res.status(403).json({
        error: 'No tiene permiso para exportar partidas de esta empresa'
      })
    }

    const validIds = entries.map((e: any) => e.id)
    const { data: lines } = await supabase
      .from('journal_entry_lines')
      .select('journal_entry_id, account_id, debit_amount, credit_amount, cost_center_type, description')
      .in('journal_entry_id', validIds)

    const accountIds = [...new Set((lines ?? []).map((l: any) => l.account_id).filter(Boolean))]
    const { data: accounts } =
      accountIds.length > 0
        ? await supabase
            .from('chart_of_accounts')
            .select('id, code, name')
            .in('id', accountIds)
        : { data: [] }

    const accountMap = new Map((accounts ?? []).map((a: any) => [a.id, a]))

    const exportData = entries.map((e: any) => {
      const entryLines = (lines ?? []).filter((l: any) => l.journal_entry_id === e.id)
      return {
        id: e.id,
        entry_date: e.entry_date,
        description: e.description,
        status: e.status,
        currency: e.currency,
        lines: entryLines.map((l: any) => {
          const acc = accountMap.get(l.account_id)
          return {
            account_code: acc?.code,
            account_name: acc?.name,
            cost_center_type: l.cost_center_type,
            debit_amount: Number(l.debit_amount),
            credit_amount: Number(l.credit_amount),
            description: l.description
          }
        })
      }
    })

    if (exportFormat === 'csv') {
      const rows: string[][] = []
      for (const entry of exportData) {
        rows.push([`Partida: ${entry.description}`, entry.entry_date, entry.status, ''])
        rows.push(['Código', 'Nombre', 'Centro Costo', 'Debe', 'Haber'])
        for (const line of entry.lines) {
          rows.push([
            line.account_code ?? '',
            line.account_name ?? '',
            line.cost_center_type ?? '',
            String(line.debit_amount > 0 ? line.debit_amount : ''),
            String(line.credit_amount > 0 ? line.credit_amount : '')
          ])
        }
        rows.push([])
      }

      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="partidas-contables.csv"')
      return res.status(200).send('\uFEFF' + csv)
    }

    return res.status(200).json({ entries: exportData })
  } catch (err) {
    console.error('Error en export:', err)
    const message = err instanceof Error ? err.message : 'Error interno'
    return res.status(500).json({ error: message })
  }
}

export default withGeneralRateLimit(['GET'])(handler)
