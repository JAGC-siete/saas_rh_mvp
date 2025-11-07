import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"

/**
 * Pre-Authorize Payroll
 * 
 * Consolidates manual changes and custom field deductions.
 * Allows PDF generation before final authorization.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId, role } = await requireCompanyAccess(req, res)
    
    // Check permissions
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para pre-autorizar nómina'
      })
    }

    const { run_id } = req.body

    if (!run_id || typeof run_id !== 'string') {
      return res.status(400).json({ error: 'run_id es requerido' })
    }

    // Verify run belongs to company
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('id, status, company_id')
      .eq('id', run_id)
      .eq('company_id', companyId)
      .single()

    if (runError || !run) {
      return res.status(404).json({ 
        error: 'Corrida de nómina no encontrada',
        details: runError?.message
      })
    }

    // Check current status
    if (run.status === 'authorized') {
      return res.status(400).json({ 
        error: 'La nómina ya está autorizada',
        message: 'No se puede pre-autorizar una nómina ya autorizada'
      })
    }

    // Get all payroll lines to validate
    const { data: lines, error: linesError } = await supabase
      .from('payroll_run_lines')
      .select('id, employee_id, eff_hours, eff_bruto, eff_ihss, eff_rap, eff_isr, eff_neto, edited, metadata')
      .eq('run_id', run_id)
      .eq('company_id', companyId)

    if (linesError) {
      console.error('Error obteniendo líneas de nómina:', linesError)
      return res.status(500).json({ error: 'Error obteniendo líneas de nómina' })
    }

    if (!lines || lines.length === 0) {
      return res.status(400).json({ 
        error: 'No hay líneas de nómina para pre-autorizar',
        message: 'Debe haber al menos una línea de nómina'
      })
    }

    // Update run status to pre-authorized
    const { error: updateError } = await supabase
      .from('payroll_runs')
      .update({ 
        status: 'pre-authorized',
        updated_at: new Date().toISOString()
      })
      .eq('id', run_id)
      .eq('company_id', companyId)

    if (updateError) {
      console.error('Error pre-autorizando corrida:', updateError)
      return res.status(500).json({ 
        error: 'Error pre-autorizando nómina',
        details: updateError.message
      })
    }

    console.log('✅ Nómina pre-autorizada:', run_id)

    // Calculate summary
    const summary = {
      total_lines: lines.length,
      edited_lines: lines.filter((l: any) => l.edited).length,
      lines_with_metadata: lines.filter((l: any) => l.metadata && Object.keys(l.metadata).length > 0).length,
      total_bruto: lines.reduce((sum: number, l: any) => sum + Number(l.eff_bruto), 0),
      total_deducciones: lines.reduce((sum: number, l: any) => sum + Number(l.eff_ihss) + Number(l.eff_rap) + Number(l.eff_isr), 0),
      total_neto: lines.reduce((sum: number, l: any) => sum + Number(l.eff_neto), 0)
    }

    return res.status(200).json({
      message: 'Nómina pre-autorizada exitosamente',
      ok: true,
      run_id,
      status: 'pre-authorized',
      summary
    })

  } catch (error: any) {
    console.error('Error en pre-autorización:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error?.message || 'Error desconocido'
    })
  }
}

