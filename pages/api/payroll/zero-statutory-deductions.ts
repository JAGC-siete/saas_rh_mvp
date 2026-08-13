import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import {
  applyStatutoryOverrideToEffectiveAmounts,
  applyStatutoryZeroToEffectiveAmounts,
  stampStatutoryOverrideMetadata,
  stampStatutoryZeroMetadata,
  type StatutoryOverrideNext,
} from '../../../lib/payroll/statutory-zero-override'

function parseOptionalNonNegAmount(
  value: unknown,
  field: string
): { ok: true; value: number | undefined } | { ok: false; error: string } {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: undefined }
  }
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0) {
    return {
      ok: false,
      error: `${field} debe ser un número ≥ 0`,
    }
  }
  return { ok: true, value: Math.round(n * 100) / 100 }
}

/**
 * Override IHSS/RAP/ISR on a payroll run line (draft/edited only).
 * - No amounts in body → zero all three (legacy).
 * - Any of ihss/rap/isr provided → set only those (≥ 0); omit = leave unchanged.
 * Keeps bruto + custom deductions via delta-neto; stamps metadata for audit/preserve.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)

    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para editar nómina',
      })
    }

    const { run_line_id, reason, ihss, rap, isr } = req.body || {}
    if (!run_line_id || typeof run_line_id !== 'string') {
      return res.status(400).json({ error: 'run_line_id es requerido' })
    }
    const reasonText = typeof reason === 'string' ? reason.trim() : ''
    if (reasonText.length < 3) {
      return res.status(400).json({
        error: 'Motivo requerido',
        message: 'Indique un motivo (mín. 3 caracteres) para editar retenciones de ley',
      })
    }

    const parsedIhss = parseOptionalNonNegAmount(ihss, 'ihss')
    if (!parsedIhss.ok) return res.status(400).json({ error: parsedIhss.error })
    const parsedRap = parseOptionalNonNegAmount(rap, 'rap')
    if (!parsedRap.ok) return res.status(400).json({ error: parsedRap.error })
    const parsedIsr = parseOptionalNonNegAmount(isr, 'isr')
    if (!parsedIsr.ok) return res.status(400).json({ error: parsedIsr.error })

    const nextPartial: StatutoryOverrideNext = {}
    if (parsedIhss.value !== undefined) nextPartial.ihss = parsedIhss.value
    if (parsedRap.value !== undefined) nextPartial.rap = parsedRap.value
    if (parsedIsr.value !== undefined) nextPartial.isr = parsedIsr.value
    const hasPartial =
      nextPartial.ihss !== undefined ||
      nextPartial.rap !== undefined ||
      nextPartial.isr !== undefined

    const { data: line, error: lineError } = await supabase
      .from('payroll_run_lines')
      .select(
        'id, run_id, company_id, employee_id, eff_bruto, eff_ihss, eff_rap, eff_isr, eff_neto, calc_ihss, calc_rap, calc_isr, calc_neto, metadata, edited'
      )
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
        message: `La corrida está en estado '${run.status}'. Solo draft/edited permiten editar retenciones de ley.`,
      })
    }

    const baseAmounts = {
      eff_bruto: Number(line.eff_bruto) || 0,
      eff_ihss: Number(line.eff_ihss) || 0,
      eff_rap: Number(line.eff_rap) || 0,
      eff_isr: Number(line.eff_isr) || 0,
      eff_neto: Number(line.eff_neto) || 0,
    }

    let eff_ihss: number
    let eff_rap: number
    let eff_isr: number
    let eff_neto: number
    let statutory_delta: number
    let metadata: Record<string, unknown>

    if (!hasPartial) {
      const next = applyStatutoryZeroToEffectiveAmounts(baseAmounts)
      eff_ihss = next.eff_ihss
      eff_rap = next.eff_rap
      eff_isr = next.eff_isr
      eff_neto = next.eff_neto
      statutory_delta = next.statutory_removed
      metadata = stampStatutoryZeroMetadata(
        (line.metadata || {}) as Record<string, unknown>,
        { userId: user.id, reason: reasonText }
      )
    } else {
      const next = applyStatutoryOverrideToEffectiveAmounts({
        ...baseAmounts,
        next: nextPartial,
      })
      eff_ihss = next.eff_ihss
      eff_rap = next.eff_rap
      eff_isr = next.eff_isr
      eff_neto = next.eff_neto
      statutory_delta = next.statutory_delta
      metadata = stampStatutoryOverrideMetadata(
        (line.metadata || {}) as Record<string, unknown>,
        {
          userId: user.id,
          reason: reasonText,
          applied: next.applied,
          amounts: {
            ihss: next.eff_ihss,
            rap: next.eff_rap,
            isr: next.eff_isr,
          },
        }
      )
    }

    // Clear prior field-level adjustments for statutory so they don't resurrect
    await supabase
      .from('payroll_adjustments')
      .delete()
      .eq('run_line_id', run_line_id)
      .eq('company_id', companyId)
      .in('field', ['ihss', 'rap', 'isr', 'neto'])

    const { data: updated, error: updateError } = await supabase
      .from('payroll_run_lines')
      .update({
        eff_ihss,
        eff_rap,
        eff_isr,
        eff_neto,
        calc_ihss: eff_ihss,
        calc_rap: eff_rap,
        calc_isr: eff_isr,
        calc_neto: eff_neto,
        metadata,
        edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', run_line_id)
      .eq('company_id', companyId)
      .select('id, eff_bruto, eff_ihss, eff_rap, eff_isr, eff_neto, metadata, edited')
      .single()

    if (updateError) {
      console.error('zero-statutory-deductions update:', updateError)
      return res.status(500).json({
        error: 'Error al aplicar override',
        details: updateError.message,
      })
    }

    return res.status(200).json({
      ok: true,
      message: hasPartial
        ? 'Retenciones de ley actualizadas para esta línea'
        : 'Retenciones de ley (IHSS/RAP/ISR) puestas en cero para esta línea',
      run_line_id,
      statutory_delta,
      line: updated,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return res.status(500).json({ error: message })
  }
}
