import { NextApiRequest, NextApiResponse } from 'next'
import { requireAccountingAccess } from '../../../../lib/accounting/api-access'
import { findForeignAccountIds } from '../../../../lib/accounting/access-rules'
import { withGeneralRateLimit } from '../../../../lib/security/rate-limiting'
import { createAdminClient } from '../../../../lib/supabase/server'

/**
 * PATCH /api/accounting/mappings/[id]
 *
 * Actualiza debit_account_id y/o credit_account_id de un mapping.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireAccountingAccess(req, res)
    if (!auth) return
    const { id } = req.query
    const { debit_account_id, credit_account_id } = req.body || {}

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'id es requerido' })
    }

    const supabase = createAdminClient()

    const { data: existing, error: fetchError } = await supabase
      .from('accounting_mappings')
      .select('id, company_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Mapeo no encontrado' })
    }

    const companyId = existing.company_id
    if (
      auth.role !== 'super_admin' &&
      auth.companyId &&
      auth.companyId !== companyId
    ) {
      return res.status(403).json({
        error: 'No tiene permiso para editar este mapeo'
      })
    }

    const updates: Record<string, unknown> = {}
    if (debit_account_id !== undefined) updates.debit_account_id = debit_account_id || null
    if (credit_account_id !== undefined) updates.credit_account_id = credit_account_id || null

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Debe enviar debit_account_id o credit_account_id' })
    }

    const requestedAccountIds = [updates.debit_account_id, updates.credit_account_id].filter(
      (v): v is string => typeof v === 'string' && v.length > 0
    )
    if (requestedAccountIds.length > 0) {
      const { data: ownedAccounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', companyId)
        .in('id', requestedAccountIds)

      if (
        accountsError ||
        findForeignAccountIds(
          requestedAccountIds,
          (ownedAccounts ?? []).map((a: { id: string }) => a.id)
        ).length > 0
      ) {
        return res.status(400).json({
          error: 'Esa cuenta no pertenece al catálogo de tu empresa. Elige una cuenta de la lista.'
        })
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('accounting_mappings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating mapping:', updateError)
      return res.status(500).json({
        error: 'Error actualizando mapeo',
        details: updateError.message
      })
    }

    return res.status(200).json({ mapping: updated })
  } catch (err) {
    console.error('Error en mappings PATCH:', err)
    const message = err instanceof Error ? err.message : 'Error interno'
    return res.status(500).json({ error: message })
  }
}

export default withGeneralRateLimit(['PATCH'])(handler)
