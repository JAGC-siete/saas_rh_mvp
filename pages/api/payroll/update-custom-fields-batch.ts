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

interface BatchUpdate {
  run_line_id: string
  custom_fields: Record<string, unknown>
}

interface BatchUpdateResult {
  run_line_id: string
  success: boolean
  error?: string
  ingresos_adicionales?: number
  deducciones_adicionales?: number
  eff_bruto?: number
  eff_neto?: number
}

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

    const { updates } = req.body

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ 
        error: 'updates debe ser un array de objetos con run_line_id y custom_fields' 
      })
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'El array de updates no puede estar vacío' })
    }

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const validationErrors: Array<{ run_line_id: string; error: string }> = []
    
    for (const update of updates) {
      if (!update.run_line_id) {
        validationErrors.push({
          run_line_id: update.run_line_id || 'unknown',
          error: 'run_line_id es requerido'
        })
        continue
      }

      if (!update.custom_fields || typeof update.custom_fields !== 'object') {
        validationErrors.push({
          run_line_id: update.run_line_id,
          error: 'custom_fields debe ser un objeto'
        })
        continue
      }

      const validation = await validateCustomPayrollData(companyId, update.custom_fields, supabase)
      if (!validation.valid) {
        validationErrors.push({
          run_line_id: update.run_line_id,
          error: `Datos inválidos: ${validation.errors.join(', ')}`
        })
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Errores de validación',
        details: validationErrors
      })
    }

    const lineIds = updates.map((u: BatchUpdate) => u.run_line_id)
    
    const { data: existingLines, error: linesError } = await supabase
      .from('payroll_run_lines')
      .select('id, metadata, calc_bruto, eff_bruto, eff_neto, eff_ihss, eff_rap, eff_isr, company_id, run_id')
      .in('id', lineIds)
      .eq('company_id', companyId)

    if (linesError) {
      console.error('Error obteniendo líneas de nómina:', linesError)
      return res.status(500).json({
        error: 'Error obteniendo líneas de nómina',
        details: linesError.message
      })
    }

    if (!existingLines || existingLines.length === 0) {
      return res.status(404).json({
        error: 'No se encontraron líneas de nómina',
        message: 'Ninguna de las líneas especificadas existe o pertenece a su empresa'
      })
    }

    const existingLineIds = new Set(existingLines.map((l: any) => l.id))
    const missingLines = lineIds.filter(id => !existingLineIds.has(id))
    
    if (missingLines.length > 0) {
      return res.status(404).json({
        error: 'Algunas líneas no se encontraron',
        missing_lines: missingLines
      })
    }

    const runIds = [...new Set(existingLines.map((l: any) => l.run_id).filter(Boolean))]
    const { data: runs, error: runsError } = await supabase
      .from('payroll_runs')
      .select('id, status')
      .in('id', runIds)
      .eq('company_id', companyId)

    if (runsError) {
      return res.status(500).json({
        error: 'Error obteniendo corridas de nómina',
        details: runsError.message,
      })
    }

    const statusByRunId = new Map<string, string>(
      (runs || []).map((r: { id: string; status: string }) => [r.id, r.status])
    )

    const lockedLines = existingLines.filter((l: any) => {
      const status = statusByRunId.get(l.run_id as string)
      return !isPayrollRunEditableForCustomFields(status)
    })

    if (lockedLines.length > 0) {
      const status = statusByRunId.get(lockedLines[0].run_id) || 'unknown'
      return res.status(400).json({
        error: 'Corrida no editable',
        message: `La corrida está en estado '${status}' y no se puede editar`,
        locked_run_line_ids: lockedLines.map((l: any) => l.id),
      })
    }

    const results: BatchUpdateResult[] = []
    const updatePromises: Promise<BatchUpdateResult>[] = []

    for (const update of updates) {
      const existingLine = existingLines.find((l: any) => l.id === update.run_line_id)
      
      if (!existingLine) {
        results.push({
          run_line_id: update.run_line_id,
          success: false,
          error: 'Línea no encontrada'
        })
        continue
      }

      const metadata = await buildPayrollMetadata(companyId, update.custom_fields, supabase)
      
      const existingMetadata = existingLine.metadata || {}
      const mergedMetadata = { ...existingMetadata, ...metadata }

      const calcBruto = Number(existingLine.calc_bruto) || 0
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

      const updatePromise = (async (): Promise<BatchUpdateResult> => {
        try {
          const { error: updateError } = await supabase
            .from('payroll_run_lines')
            .update({
              metadata: mergedMetadata,
              edited: true,
              eff_bruto: newEffBruto,
              eff_neto: newEffNeto,
              updated_at: new Date().toISOString()
            })
            .eq('id', update.run_line_id)
            .eq('company_id', companyId)

          if (updateError) {
            return {
              run_line_id: update.run_line_id,
              success: false,
              error: updateError.message
            }
          }

          const oldEffBruto = Number(existingLine.eff_bruto) || 0
          const oldEffNeto = Number(existingLine.eff_neto) || 0
          const adjustmentsToInsert: Array<{ run_line_id: string; company_id: string; field: string; old_value: number | null; new_value: number; user_id: string }> = []
          if (oldEffBruto !== newEffBruto) {
            adjustmentsToInsert.push({
              run_line_id: update.run_line_id,
              company_id: companyId,
              field: 'bruto',
              old_value: oldEffBruto,
              new_value: newEffBruto,
              user_id: user.id
            })
          }
          if (oldEffNeto !== newEffNeto) {
            adjustmentsToInsert.push({
              run_line_id: update.run_line_id,
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
                run_line_id: update.run_line_id,
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
            if (adjError) console.error(`Error inserting payroll_adjustments for line ${update.run_line_id}:`, adjError)
          }

          return {
            run_line_id: update.run_line_id,
            success: true,
            ingresos_adicionales: ingresosAdicionales,
            deducciones_adicionales: deduccionesAdicionales,
            eff_bruto: newEffBruto,
            eff_neto: newEffNeto
          }
        } catch (error: unknown) {
          console.error(`Error updating line ${update.run_line_id}:`, error)
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
          return {
            run_line_id: update.run_line_id,
            success: false,
            error: errorMessage
          }
        }
      })()

      updatePromises.push(updatePromise)
    }

    const updateResults = await Promise.all(updatePromises)
    results.push(...updateResults)

    const successfulUpdates = results.filter(r => r.success)
    const failedUpdates = results.filter(r => !r.success)

    if (failedUpdates.length > 0) {
      return res.status(207).json({
        success: false,
        message: 'Algunas actualizaciones fallaron',
        results,
        summary: {
          total: results.length,
          successful: successfulUpdates.length,
          failed: failedUpdates.length
        }
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Todos los campos personalizados fueron actualizados exitosamente',
      results,
      summary: {
        total: results.length,
        successful: successfulUpdates.length,
        failed: 0
      }
    })

  } catch (error: any) {
    console.error('❌ Error en update-custom-fields-batch:', error)
    return res.status(500).json({ 
      error: error?.message || 'Internal error',
      message: 'Error interno del servidor'
    })
  }
}
