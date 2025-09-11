import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth'
import { getHondurasTimestamp } from '../../../lib/timezone'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // AUTENTICACIÓN ESTANDARIZADA - Usar requireCompanyAccess
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)
    
    // Verificar roles específicos para autorizar nómina
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para autorizar nómina'
      })
    }

    console.log('🔐 Usuario autenticado para autorización de nómina:', { 
      userId: user.id, 
      role: role,
      companyId: companyId 
    })

    const { run_id } = req.body || {}
    
    // Debug logging mejorado
    console.log('📋 Authorize request received:', {
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      run_id,
      run_id_type: typeof run_id,
      run_id_length: run_id ? run_id.length : 0
    })
    
    // Validaciones mejoradas
    if (!run_id) {
      console.log('❌ Missing run_id in authorize request')
      return res.status(400).json({ 
        error: 'run_id es requerido',
        message: 'Se requiere el ID de la corrida de nómina para autorizar'
      })
    }

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(run_id)) {
      console.log('❌ Invalid run_id format:', run_id)
      return res.status(400).json({ 
        error: 'Formato de run_id inválido',
        message: 'El ID de la corrida debe ser un UUID válido'
      })
    }

    // Verificar que la corrida pertenezca a la empresa del usuario
    console.log('🔍 Buscando corrida de nómina:', { run_id, companyId })
    
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('id, company_uuid, status, year, month, quincena, tipo, created_at, updated_at')
      .eq('id', run_id)
      .eq('company_uuid', companyId)
      .single()

    if (runError) {
      console.error('❌ Error buscando corrida:', runError)
      return res.status(500).json({ 
        error: 'Error consultando corrida de nómina',
        message: 'No se pudo verificar el estado de la corrida'
      })
    }

    if (!run) {
      console.log('❌ Corrida no encontrada:', { run_id, companyId })
      return res.status(404).json({ 
        error: 'Corrida de planilla no encontrada',
        message: 'La corrida no existe o no pertenece a su empresa'
      })
    }

    console.log('✅ Corrida encontrada:', {
      id: run.id,
      status: run.status,
      period: `${run.year}-${run.month}-Q${run.quincena}`,
      tipo: run.tipo
    })

    // Verificar que la corrida esté en estado autorizable
    if (!['draft', 'edited'].includes(run.status)) {
      console.log('❌ Estado no autorizable:', run.status)
      return res.status(400).json({ 
        error: 'Corrida no autorizable',
        message: `La corrida está en estado '${run.status}' y no se puede autorizar. Solo se pueden autorizar corridas en estado 'draft' o 'edited'.`
      })
    }

    // Obtener líneas de la corrida para verificar que estén completas
    console.log('🔍 Obteniendo líneas de la corrida...')
    
    const { data: lines, error: linesError } = await supabase
      .from('payroll_run_lines')
      .select(`
        id, 
        employee_id, 
        eff_hours, 
        eff_bruto, 
        eff_ihss, 
        eff_rap, 
        eff_isr, 
        eff_neto, 
        edited,
        employees!payroll_run_lines_employee_id_fkey(name, dni)
      `)
      .eq('run_id', run_id)
      .eq('company_uuid', companyId)

    if (linesError) {
      console.error('❌ Error obteniendo líneas de planilla:', linesError)
      return res.status(500).json({ 
        error: 'Error obteniendo líneas de planilla',
        message: 'No se pudieron cargar las líneas de la corrida'
      })
    }

    if (!lines || lines.length === 0) {
      console.log('❌ Corrida sin líneas:', { run_id, companyId })
      return res.status(400).json({ 
        error: 'Corrida sin líneas',
        message: 'La corrida no tiene líneas de planilla para autorizar'
      })
    }

    // Validar que todas las líneas tengan valores válidos
    const invalidLines = lines.filter((line: any) => 
      !line.eff_hours || !line.eff_bruto || !line.eff_neto
    )

    if (invalidLines.length > 0) {
      console.log('❌ Líneas con valores inválidos:', invalidLines.length)
      return res.status(400).json({ 
        error: 'Líneas con valores inválidos',
        message: `${invalidLines.length} líneas tienen valores inválidos y no se pueden autorizar`
      })
    }

    console.log('✅ Líneas validadas:', {
      run_id,
      companyId: companyId,
      status: run.status,
      lines_count: lines.length,
      has_edits: lines.some((l: any) => l.edited),
      total_bruto: lines.reduce((sum: number, l: any) => sum + Number(l.eff_bruto), 0),
      total_neto: lines.reduce((sum: number, l: any) => sum + Number(l.eff_neto), 0)
    })

    // Actualizar estado de la corrida a 'authorized' con transacción
    console.log('🔄 Actualizando estado a autorizado...')
    
    const { error: updateError } = await supabase
      .from('payroll_runs')
      .update({ 
        status: 'authorized',
        updated_at: getHondurasTimestamp()
      })
      .eq('id', run_id)
      .eq('company_uuid', companyId)

    if (updateError) {
      console.error('❌ Error actualizando estado de corrida:', updateError)
      return res.status(500).json({ 
        error: 'Error actualizando estado de corrida',
        message: 'No se pudo autorizar la nómina'
      })
    }

    console.log('✅ Estado actualizado a autorizado')

    // Registrar en audit_logs
    console.log('📝 Registrando auditoría...')
    
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        company_id: companyId,
        user_id: user.id,
        action: 'AUTHORIZE_PAYROLL',
        resource_type: 'payroll_runs',
        resource_id: run_id,
        old_values: { status: run.status },
        new_values: { 
          status: 'authorized',
          authorized_by: user.id,
          authorized_at: getHondurasTimestamp()
        }
      })

    if (auditError) {
      console.error('⚠️ Error registrando auditoría (no crítico):', auditError)
      // No fallar por error de auditoría
    } else {
      console.log('✅ Auditoría registrada')
    }

    // Calcular totales para respuesta
    const summary = {
      total_lines: lines.length,
      edited_lines: lines.filter((l: any) => l.edited).length,
      total_bruto: lines.reduce((sum: number, l: any) => sum + Number(l.eff_bruto), 0),
      total_deducciones: lines.reduce((sum: number, l: any) => sum + Number(l.eff_ihss) + Number(l.eff_rap) + Number(l.eff_isr), 0),
      total_neto: lines.reduce((sum: number, l: any) => sum + Number(l.eff_neto), 0)
    }

    // Generar URLs para documentos
    const pdfUrl = `/api/payroll/generate-pdf-from-run?run_id=${run_id}`
    const vouchers = lines.map((line: any) => ({
      employee_id: line.employee_id,
      employee_name: line.employees?.name || 'N/A',
      employee_dni: line.employees?.dni || 'N/A',
      url: `/api/payroll/generate-voucher?run_line_id=${line.id}`
    }))

    console.log('🎉 Corrida de planilla autorizada exitosamente:', {
      run_id,
      status: 'authorized',
      pdf_url: pdfUrl,
      vouchers_count: vouchers.length,
      summary
    })

    return res.status(200).json({
      message: 'Corrida de planilla autorizada exitosamente',
      ok: true,
      run_id,
      status: 'authorized',
      authorized_at: getHondurasTimestamp(),
      authorized_by: user.id,
      artifact_url: pdfUrl,
      vouchers,
      summary
    })

  } catch (error) {
    console.error('Error en autorización de nómina:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}
