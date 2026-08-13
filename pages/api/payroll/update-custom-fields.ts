import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { 
  buildPayrollMetadata, 
  validateCustomPayrollData, 
  calculatePayroll
} from '../../../lib/payroll-client-specific'
import {
  computeCustomFieldsEffectiveAmounts,
  isPayrollRunEditableForCustomFields,
} from '../../../lib/payroll/custom-fields-eff-amounts'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)
    
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

    const validation = await validateCustomPayrollData(companyId, custom_fields, supabase)
    
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: validation.errors
      })
    }

    const metadata = await buildPayrollMetadata(companyId, custom_fields, supabase)

    const { data: existingLine, error: lineError } = await supabase
      .from('payroll_run_lines')
      .select('metadata, calc_bruto, eff_bruto, eff_neto, eff_ihss, eff_rap, eff_isr, run_id')
      .eq('id', run_line_id)
      .eq('company_id', companyId)
      .single()

    if (lineError || !existingLine) {
      return res.status(404).json({
        error: 'Línea de nómina no encontrada',
        details: lineError?.message
      })
    }

    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('id, status')
      .eq('id', existingLine.run_id)
      .eq('company_id', companyId)
      .single()

    if (runError || !run) {
      return res.status(404).json({ error: 'Corrida de planilla no encontrada' })
    }

    if (!isPayrollRunEditableForCustomFields(run.status)) {
      return res.status(400).json({
        error: 'Corrida no editable',
        message: `La corrida está en estado '${run.status}' y no se puede editar`,
      })
    }

    const existingMetadata = existingLine.metadata || {}
    const mergedMetadata = { ...existingMetadata, ...metadata }

    const calcBruto = Number(existingLine.calc_bruto) || 0
    // Prior earnings from existing metadata (engine baseline as formula context).
    const priorCalc = await calculatePayroll(
      companyId,
      calcBruto,
      existingMetadata,
      supabase
    )
    const calcResult = await calculatePayroll(
      companyId,
      calcBruto,
      mergedMetadata,
      supabase
    )
    
    const ingresosAdicionales = calcResult.totalIngresosAdicionales
    const deduccionesAdicionales = calcResult.totalDeduccionesAdicionales

    const { newEffBruto, newEffNeto } = computeCustomFieldsEffectiveAmounts({
      calcBruto,
      currentEffBruto: Number(existingLine.eff_bruto) || 0,
      priorIngresosAdicionales: priorCalc.totalIngresosAdicionales,
      ingresosAdicionales,
      deduccionesAdicionales,
      effIhss: Number(existingLine.eff_ihss) || 0,
      effRap: Number(existingLine.eff_rap) || 0,
      effIsr: Number(existingLine.eff_isr) || 0,
    })

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
      if (key === '_deduction_plan_ids' || key === '_deduction_plan_breakdown') continue
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
      }
    }

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
