import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { withGeneralRateLimit } from '../../../lib/security/rate-limiting'
import { createAdminClient } from '../../../lib/supabase/server'

/**
 * GET /api/accounting/mappings
 *
 * Lista mappings con concepts y accounts para la empresa.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireCompanyAccess(req, res)
    const { company_id: queryCompanyId } = req.query

    let companyId = auth.companyId ?? (queryCompanyId as string)

    if (!companyId) {
      return res.status(400).json({
        error: 'company_id es requerido'
      })
    }

    if (
      auth.role !== 'super_admin' &&
      auth.companyId &&
      auth.companyId !== companyId
    ) {
      return res.status(403).json({
        error: 'No tiene permiso para ver los mapeos de esta empresa'
      })
    }

    const supabase = createAdminClient()

    const { data: mappings, error: mapError } = await supabase
      .from('accounting_mappings')
      .select('id, concept_id, department_id, cost_center_type, debit_account_id, credit_account_id, is_provision_payment')
      .eq('company_id', companyId)
      .order('concept_id')

    if (mapError) {
      console.error('Error fetching mappings:', mapError)
      return res.status(500).json({
        error: 'Error obteniendo mapeos contables',
        details: mapError.message
      })
    }

    const conceptIds = [...new Set((mappings ?? []).map((m: any) => m.concept_id).filter(Boolean))]
    const accountIds = [
      ...new Set(
        (mappings ?? [])
          .flatMap((m: any) => [m.debit_account_id, m.credit_account_id])
          .filter(Boolean)
      )
    ]

    const [conceptsRes, accountsRes] = await Promise.all([
      conceptIds.length > 0
        ? supabase.from('payroll_concepts').select('id, code, name').in('id', conceptIds)
        : { data: [] },
      accountIds.length > 0
        ? supabase.from('chart_of_accounts').select('id, code, name').in('id', accountIds)
        : { data: [] }
    ])

    const conceptMap = new Map((conceptsRes.data ?? []).map((c: any) => [c.id, c]))
    const accountMap = new Map((accountsRes.data ?? []).map((a: any) => [a.id, a]))

    const enriched = (mappings ?? []).map((m: any) => {
      const pc = conceptMap.get(m.concept_id)
      return {
        id: m.id,
        concept_id: m.concept_id,
        concept_code: pc?.code,
        concept_name: pc?.name,
        cost_center_type: m.cost_center_type,
        debit_account_id: m.debit_account_id,
        credit_account_id: m.credit_account_id,
        debit_account: m.debit_account_id ? accountMap.get(m.debit_account_id) : null,
        credit_account: m.credit_account_id ? accountMap.get(m.credit_account_id) : null,
        is_provision_payment: m.is_provision_payment
      }
    })

    return res.status(200).json({ mappings: enriched })
  } catch (err) {
    console.error('Error en mappings:', err)
    const message = err instanceof Error ? err.message : 'Error interno'
    return res.status(500).json({ error: message })
  }
}

export default withGeneralRateLimit(['GET'])(handler)
