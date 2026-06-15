import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { withGeneralRateLimit } from '../../../lib/security/rate-limiting'
import { generateJournalEntriesFromPayrollRun } from '../../../lib/accounting/journal-generator'

/**
 * POST /api/accounting/generate-journal-entries
 *
 * Generates journal entries (Partida 1 + Partida 2) from an authorized payroll run.
 * Requires: company_admin or hr_manager. Super_admin can pass company_id in body.
 *
 * Body: { run_id: string, company_id?: string }
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireCompanyAccess(req, res)
    const { run_id, company_id: bodyCompanyId } = req.body || {}

    let companyId = auth.companyId ?? bodyCompanyId

    if (!companyId) {
      return res.status(400).json({
        error: 'company_id es requerido',
        message:
          'Super admin debe enviar company_id en el body. Usuarios de empresa lo obtienen del contexto.'
      })
    }

    if (!run_id || typeof run_id !== 'string') {
      return res.status(400).json({
        error: 'run_id es requerido',
        message: 'Envíe el ID de la corrida de nómina en el body.'
      })
    }

    if (
      auth.role !== 'super_admin' &&
      auth.companyId &&
      auth.companyId !== companyId
    ) {
      return res.status(403).json({
        error: 'No tiene permiso para generar asientos en esta empresa'
      })
    }

    const result = await generateJournalEntriesFromPayrollRun(
      run_id,
      companyId,
      auth.user.id
    )

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        journalEntryIds: result.journalEntryIds
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Asientos contables generados correctamente',
      journalEntryIds: result.journalEntryIds,
      statutory_trace: result.statutoryTrace ?? null
    })
  } catch (err) {
    console.error('Error generando asientos contables:', err)
    const message = err instanceof Error ? err.message : 'Error interno'
    return res.status(500).json({ error: message })
  }
}

export default withGeneralRateLimit(['POST'])(handler)
