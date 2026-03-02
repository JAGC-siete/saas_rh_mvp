import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { withGeneralRateLimit } from '../../../lib/security/rate-limiting'

/**
 * GET /api/accounting/chart-of-accounts
 *
 * Lista cuentas del catálogo por company_id.
 * Query: company_id (opcional si del contexto), q (búsqueda por código o nombre)
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireCompanyAccess(req, res)
    const { company_id: queryCompanyId, q } = req.query

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
        error: 'No tiene permiso para ver el catálogo de esta empresa'
      })
    }

    const { createAdminClient } = await import('../../../lib/supabase/server')
    const supabase = createAdminClient()

    let query = supabase
      .from('chart_of_accounts')
      .select('id, code, name, account_type')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('code')

    if (q && typeof q === 'string' && q.trim()) {
      const term = q.trim()
      query = query.or(`code.ilike.%${term}%,name.ilike.%${term}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching chart of accounts:', error)
      return res.status(500).json({
        error: 'Error obteniendo catálogo de cuentas',
        details: error.message
      })
    }

    return res.status(200).json({ accounts: data ?? [] })
  } catch (err) {
    console.error('Error en chart-of-accounts:', err)
    const message = err instanceof Error ? err.message : 'Error interno'
    return res.status(500).json({ error: message })
  }
}

export default withGeneralRateLimit(['GET'])(handler)
