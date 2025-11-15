import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { 
  buildPayrollMetadata, 
  validateCustomPayrollData, 
  calculatePayroll
} from '../../../lib/payroll-client-specific'

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
    // Authentication
    const { supabase, companyId, role } = await requireCompanyAccess(req, res)
    
    // Check permissions
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

    // Validate all updates first
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

      // Log para debugging
      console.log(`🔍 Validando línea ${update.run_line_id}:`, {
        custom_fields: update.custom_fields,
        field_types: Object.entries(update.custom_fields).map(([k, v]) => ({ [k]: typeof v }))
      })

      // Validate custom payroll data
      const validation = await validateCustomPayrollData(companyId, update.custom_fields, supabase)
      if (!validation.valid) {
        console.error(`❌ Errores de validación para línea ${update.run_line_id}:`, validation.errors)
        validationErrors.push({
          run_line_id: update.run_line_id,
          error: `Datos inválidos: ${validation.errors.join(', ')}`
        })
      }
    }

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Errores de validación',
        details: validationErrors
      })
    }

    // Get all payroll lines that need to be updated in a single query
    const lineIds = updates.map((u: BatchUpdate) => u.run_line_id)
    
    const { data: existingLines, error: linesError } = await supabase
      .from('payroll_run_lines')
      .select('id, metadata, eff_bruto, eff_neto, eff_ihss, eff_rap, eff_isr, company_id')
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

    // Verify all requested lines exist
    const existingLineIds = new Set(existingLines.map((l: any) => l.id))
    const missingLines = lineIds.filter(id => !existingLineIds.has(id))
    
    if (missingLines.length > 0) {
      return res.status(404).json({
        error: 'Algunas líneas no se encontraron',
        missing_lines: missingLines
      })
    }

    // Process all updates
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

      // Build metadata
      const metadata = await buildPayrollMetadata(companyId, update.custom_fields, supabase)
      
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

      // Compute new effective amounts
      const baseEffBruto = Number(existingLine.eff_bruto) || 0
      const effIHSS = Number((existingLine as any).eff_ihss) || 0
      const effRAP = Number((existingLine as any).eff_rap) || 0
      const effISR = Number((existingLine as any).eff_isr) || 0
      const statutoryDeductions = effIHSS + effRAP + effISR

      const newEffBruto = Math.round((baseEffBruto + ingresosAdicionales) * 100) / 100
      const newEffNeto = Math.round((newEffBruto - statutoryDeductions - deduccionesAdicionales) * 100) / 100

      // Create update promise with explicit typing
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
          } else {
            return {
              run_line_id: update.run_line_id,
              success: true,
              ingresos_adicionales: ingresosAdicionales,
              deducciones_adicionales: deduccionesAdicionales,
              eff_bruto: newEffBruto,
              eff_neto: newEffNeto
            }
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

    // Wait for all updates to complete and collect results
    const updateResults = await Promise.all(updatePromises)
    results.push(...updateResults)

    // Check if all updates were successful
    const successfulUpdates = results.filter(r => r.success)
    const failedUpdates = results.filter(r => !r.success)

    if (failedUpdates.length > 0) {
      // Some updates failed - return partial success
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

    // All updates successful
    console.log(`✅ Batch update successful: ${successfulUpdates.length} lines updated`)

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

