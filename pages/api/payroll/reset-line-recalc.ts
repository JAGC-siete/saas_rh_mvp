import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import {
  stripManualPayrollLineMetadata,
} from '../../../lib/payroll/preview-preserve-line'

/**
 * Clears manual-edit flags on a payroll line so the next preview recalculates from attendance.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId, role } = await requireCompanyAccess(req, res)

    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para editar nómina',
      })
    }

    const { run_line_id } = req.body || {}
    if (!run_line_id || typeof run_line_id !== 'string') {
      return res.status(400).json({ error: 'run_line_id es requerido' })
    }

    const { data: line, error: lineError } = await supabase
      .from('payroll_run_lines')
      .select('id, run_id, company_id, edited, metadata')
      .eq('id', run_line_id)
      .eq('company_id', companyId)
      .single()

    if (lineError || !line) {
      return res.status(404).json({
        error: 'Línea de planilla no encontrada',
        message: 'La línea no existe o no pertenece a su empresa',
      })
    }

    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('id, status')
      .eq('id', line.run_id)
      .eq('company_id', companyId)
      .single()

    if (runError || !run) {
      return res.status(404).json({ error: 'Corrida de planilla no encontrada' })
    }

    if (!['draft', 'edited'].includes(run.status)) {
      return res.status(400).json({
        error: 'Corrida no editable',
        message: `La corrida está en estado '${run.status}' y no se puede recalcular líneas`,
      })
    }

    if (line.edited !== true) {
      const meta = (line.metadata || {}) as Record<string, unknown>
      if (meta.days_adjusted_at == null) {
        return res.status(200).json({
          ok: true,
          message: 'La línea ya se recalcula desde asistencia en el preview',
          run_line_id,
        })
      }
    }

    const cleanedMetadata = stripManualPayrollLineMetadata(
      (line.metadata || {}) as Record<string, unknown>
    )

    const { error: updateError } = await supabase
      .from('payroll_run_lines')
      .update({
        edited: false,
        metadata: cleanedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', run_line_id)
      .eq('company_id', companyId)

    if (updateError) {
      console.error('Error reseteando línea de nómina:', updateError)
      return res.status(500).json({
        error: 'Error al preparar recálculo',
        details: updateError.message,
      })
    }

    return res.status(200).json({
      ok: true,
      message: 'Línea lista para recalcular desde asistencia. Genere preview para aplicar los cambios.',
      run_line_id,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return res.status(500).json({ error: message })
  }
}
