import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { buildPayrollMetadata, validateCustomPayrollData } from '../../../lib/payroll-client-specific'

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
    const validation = validateCustomPayrollData(companyId, custom_fields)
    
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: validation.errors
      })
    }

    // Build metadata
    const metadata = buildPayrollMetadata(companyId, custom_fields)

    // Get existing payroll line
    const { data: existingLine, error: lineError } = await supabase
      .from('payroll_run_lines')
      .select('metadata, eff_bruto, eff_neto')
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

    // Calculate new totals
    // Get total ingresos adicionales from metadata
    const ingresosAdicionales = 
      (metadata.horas_extras || 0) + 
      (metadata.feriado_trabajado || 0) + 
      (metadata.estipendio_transporte || 0)
    
    // Get total deducciones adicionales from metadata
    const deduccionesAdicionales = 
      (metadata.comedor || 0) +
      (metadata.cooperativa_aportaciones || 0) +
      (metadata.cooperativa_retirable || 0) +
      (metadata.cooperativa_prestamo || 0) +
      (metadata.embargo_alimentos || 0) +
      (metadata.otras_deducciones_materiales || 0) +
      (metadata.otras_deducciones_medicamentos || 0) +
      (metadata.otras_deducciones_efectivo || 0)

    // Update payroll line with new metadata
    const { error: updateError } = await supabase
      .from('payroll_run_lines')
      .update({
        metadata: mergedMetadata,
        edited: true,
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

    console.log('✅ Custom fields updated for line:', run_line_id)

    return res.status(200).json({
      success: true,
      message: 'Campos personalizados actualizados exitosamente',
      ingresos_adicionales: ingresosAdicionales,
      deducciones_adicionales: deduccionesAdicionales
    })

  } catch (error: any) {
    console.error('❌ Error en update-custom-fields:', error)
    return res.status(500).json({ 
      error: error?.message || 'Internal error',
      message: 'Error interno del servidor'
    })
  }
}

