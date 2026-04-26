import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { 
  buildPayrollMetadata, 
  validateCustomPayrollData, 
  calculatePayroll
} from '../../../lib/payroll-client-specific'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Authentication
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)
    
    // Check permissions
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para editar campos personalizados'
      })
    }

    const { run_line_id, custom_fields } = req.body

    if (!run_line_id) {
      return res.status(400).json({ error: 'run_line_id es requerido' })
    }

    if (!custom_fields || typeof custom_fields !== 'object') {
      return res.status(400).json({ error: 'custom_fields debe ser un objeto' })
    }

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    // Validate custom payroll data
    const validation = await validateCustomPayrollData(companyId, custom_fields, supabase)
    
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: validation.errors
      })
    }

    // Build metadata
    const metadata = await buildPayrollMetadata(companyId, custom_fields, supabase)

    // Get existing payroll line (include effective statutory deductions to recompute net)
    const { data: existingLine, error: lineError } = await supabase
      .from('payroll_run_lines')
      .select('metadata, eff_bruto, eff_neto, eff_ihss, eff_rap, eff_isr')
      .eq('id', run_line_id)
      .eq('company_id', companyId)
      .single()

    if (lineError || !existingLine) {
      return res.status(404).json({
        error: 'Línea de nómina no encontrada',
        details: lineError?.message
      })
    }

    // Merge with existing metadata
    const existingMetadata = existingLine.metadata || {}
    const mergedMetadata = { ...existingMetadata, ...metadata }

    // Calculate new totals using new calculation engine (supports DB configs)
    const calcResult = await calculatePayroll(
      companyId,
      Number(existingLine.eff_bruto) || 0,
      mergedMetadata,
      supabase
    )
    
    const ingresosAdicionales = calcResult.totalIngresosAdicionales
    const deduccionesAdicionales = calcResult.totalDeduccionesAdicionales

    // Compute new effective amounts using additional ingresos/deducciones
    const baseEffBruto = Number(existingLine.eff_bruto) || 0
    const effIHSS = Number((existingLine as any).eff_ihss) || 0
    const effRAP = Number((existingLine as any).eff_rap) || 0
    const effISR = Number((existingLine as any).eff_isr) || 0
    const statutoryDeductions = effIHSS + effRAP + effISR

    const newEffBruto = Math.round((baseEffBruto + ingresosAdicionales) * 100) / 100
    const newEffNeto = Math.round((newEffBruto - statutoryDeductions - deduccionesAdicionales) * 100) / 100

    // Update payroll line with new metadata and recalculated effective totals
    const { error: updateError } = await supabase
      .from('payroll_run_lines')
      .update({
        metadata: mergedMetadata,
        edited: true,
        eff_bruto: newEffBruto,
        eff_neto: newEffNeto,
        updated_at: new Date().toISOString()
      })
      .eq('id', run_line_id)
      .eq('company_id', companyId)

    if (updateError) {
      console.error('Error updating payroll line:', updateError)
      return res.status(500).json({
        error: 'Error actualizando campos personalizados',
        details: updateError.message
      })
    }

    // Insert payroll_adjustments for historial and automatic snapshots (bruto, neto + custom keys)
    const adjustmentsToInsert: Array<{ run_line_id: string; company_id: string; field: string; old_value: number | null; new_value: number; user_id: string }> = []
    const oldEffBruto = Number(existingLine.eff_bruto) || 0
    const oldEffNeto = Number(existingLine.eff_neto) || 0
    if (oldEffBruto !== newEffBruto) {
      adjustmentsToInsert.push({
        run_line_id,
        company_id: companyId,
        field: 'bruto',
        old_value: oldEffBruto,
        new_value: newEffBruto,
        user_id: user.id
      })
    }
    if (oldEffNeto !== newEffNeto) {
      adjustmentsToInsert.push({
        run_line_id,
        company_id: companyId,
        field: 'neto',
        old_value: oldEffNeto,
        new_value: newEffNeto,
        user_id: user.id
      })
    }
    const allKeys = new Set([...Object.keys(existingMetadata), ...Object.keys(mergedMetadata)])
    for (const key of allKeys) {
      if (key === '_deduction_plan_ids') continue
      const oldVal = existingMetadata[key]
      const newVal = mergedMetadata[key]
      const oldNum = typeof oldVal === 'number' ? oldVal : (typeof oldVal === 'string' && !isNaN(parseFloat(oldVal)) ? parseFloat(oldVal) : null)
      const newNum = typeof newVal === 'number' ? newVal : (typeof newVal === 'string' && !isNaN(parseFloat(newVal)) ? parseFloat(newVal) : null)
      if (newNum !== null && oldNum !== newNum && /^[a-z0-9_]+$/.test(key) && key.length <= 64) {
        adjustmentsToInsert.push({
          run_line_id,
          company_id: companyId,
          field: key,
          old_value: oldNum,
          new_value: newNum,
          user_id: user.id
        })
      }
    }
    if (adjustmentsToInsert.length > 0) {
      const { error: adjError } = await supabase.from('payroll_adjustments').insert(adjustmentsToInsert)
      if (adjError) {
        console.error('Error inserting payroll_adjustments:', adjError)
        // Do not fail the request - line was updated successfully
      }
    }

    console.log('✅ Custom fields updated for line:', run_line_id)

    return res.status(200).json({
      success: true,
      message: 'Campos personalizados actualizados exitosamente',
      ingresos_adicionales: ingresosAdicionales,
      deducciones_adicionales: deduccionesAdicionales,
      eff_bruto: newEffBruto,
      eff_neto: newEffNeto
    })

  } catch (error: any) {
    console.error('❌ Error en update-custom-fields:', error)
    return res.status(500).json({ 
      error: error?.message || 'Internal error',
      message: 'Error interno del servidor'
    })
  }
}

