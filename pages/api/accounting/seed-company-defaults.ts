import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { withSetupRateLimit } from '../../../lib/security/rate-limiting'
import { createAdminClient } from '../../../lib/supabase/server'

/**
 * POST /api/accounting/seed-company-defaults
 *
 * Seeds default NIIF chart and accounting mappings for Honduras.
 * Idempotent: does not overwrite existing accounts.
 *
 * Body: { company_id?: string }
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireCompanyAccess(req, res)
    const { company_id: bodyCompanyId } = req.body || {}

    let companyId = auth.companyId ?? bodyCompanyId

    if (!companyId) {
      return res.status(400).json({
        error: 'company_id es requerido',
        message:
          'Super admin debe enviar company_id en el body. Usuarios de empresa lo obtienen del contexto.'
      })
    }

    if (
      auth.role !== 'super_admin' &&
      auth.companyId &&
      auth.companyId !== companyId
    ) {
      return res.status(403).json({
        error: 'No tiene permiso para configurar esta empresa'
      })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.rpc('accounting_seed_company_defaults', {
      p_company_id: companyId
    })

    if (error) {
      console.error('Error seeding accounting defaults:', error)
      return res.status(500).json({
        error: 'Error inicializando contabilidad',
        details: error.message
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Catálogo y mapeos contables inicializados correctamente'
    })
  } catch (err) {
    console.error('Error en seed-company-defaults:', err)
    const message = err instanceof Error ? err.message : 'Error interno'
    return res.status(500).json({ error: message })
  }
}

export default withSetupRateLimit(['POST'])(handler)
