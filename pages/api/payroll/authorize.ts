import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // AUTENTICACIÓN REQUERIDA
    const authResult = await authenticateUser(req, res, ['can_generate_payroll'])
    
    if (!authResult.success) {
      return res.status(401).json({ 
        error: authResult.error,
        message: authResult.message
      })
    }

    const { user, userProfile } = authResult
    
    // Ensure userProfile exists
    if (!userProfile || !userProfile.company_id) {
      return res.status(400).json({ 
        error: 'Invalid user profile',
        message: 'User profile or company ID not found'
      })
    }
    
    const supabase = createClient(req, res)

    console.log('Usuario autenticado para autorización de nómina:', { 
      userId: user.id, 
      role: userProfile.role,
      companyId: userProfile.company_id 
    })

    const { run_id } = req.body || {}
    
    // Validaciones
    if (!run_id) {
      return res.status(400).json({ error: 'run_id es requerido' })
    }

    // Verificar que la corrida pertenezca a la empresa del usuario
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('id, company_uuid, status, year, month, quincena, tipo')
      .eq('id', run_id)
      .eq('company_uuid', userProfile.company_id)
      .single()

    if (runError || !run) {
      return res.status(404).json({ 
        error: 'Corrida de planilla no encontrada o no autorizada',
        message: 'La corrida no existe o no pertenece a su empresa'
      })
    }

    // Verificar que la corrida esté en estado editable
    if (!['draft', 'edited'].includes(run.status)) {
      return res.status(400).json({ 
        error: 'Corrida no autorizable',
        message: `La corrida está en estado '${run.status}' y no se puede autorizar`
      })
    }

    // Obtener líneas de la corrida para verificar que estén completas
    const { data: lines, error: linesError } = await supabase
      .from('payroll_run_lines')
      .select('id, employee_id, eff_hours, eff_bruto, eff_ihss, eff_rap, eff_isr, eff_neto, edited')
      .eq('run_id', run_id)
      .eq('company_uuid', userProfile.company_id)

    if (linesError) {
      console.error('Error obteniendo líneas de planilla:', linesError)
      return res.status(500).json({ error: 'Error obteniendo líneas de planilla' })
    }

    if (!lines || lines.length === 0) {
      return res.status(400).json({ 
        error: 'Corrida sin líneas',
        message: 'La corrida no tiene líneas de planilla para autorizar'
      })
    }

    console.log('Autorizando corrida de planilla:', {
      run_id,
      companyId: userProfile.company_id,
      status: run.status,
      lines_count: lines.length,
      has_edits: lines.some(l => l.edited)
    })

    // Actualizar estado de la corrida a 'authorized'
    const { error: updateError } = await supabase
      .from('payroll_runs')
      .update({ 
        status: 'authorized',
        updated_at: new Date().toISOString()
      })
      .eq('id', run_id)
      .eq('company_uuid', userProfile.company_id)

    if (updateError) {
      console.error('Error actualizando estado de corrida:', updateError)
      return res.status(500).json({ error: 'Error actualizando estado de corrida' })
    }

    // Registrar en audit_logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        company_id: userProfile.company_id,
        user_id: user.id,
        action: 'UPDATE',
        resource_type: 'payroll_runs',
        resource_id: run_id,
        old_values: { status: run.status },
        new_values: { status: 'authorized' }
      })

    if (auditError) {
      console.error('Error registrando auditoría:', auditError)
      // No fallar por error de auditoría
    }

    // Generar PDF consolidado usando la vista efectiva
    // TODO: Implementar generación de PDF usando v_payroll_lines_effective
    const pdfUrl = `/api/payroll/generate-pdf?run_id=${run_id}`

    // Generar vouchers individuales
    const vouchers = lines.map(line => ({
      employee_id: line.employee_id,
      url: `/api/payroll/generate-voucher?run_line_id=${line.id}`
    }))

    console.log('Corrida de planilla autorizada exitosamente:', {
      run_id,
      status: 'authorized',
      pdf_url: pdfUrl,
      vouchers_count: vouchers.length
    })

    return res.status(200).json({
      message: 'Corrida de planilla autorizada exitosamente',
      ok: true,
      run_id,
      status: 'authorized',
      artifact_url: pdfUrl,
      vouchers,
      summary: {
        total_lines: lines.length,
        edited_lines: lines.filter(l => l.edited).length,
        total_bruto: lines.reduce((sum, l) => sum + Number(l.eff_bruto), 0),
        total_deducciones: lines.reduce((sum, l) => sum + Number(l.eff_ihss) + Number(l.eff_rap) + Number(l.eff_isr), 0),
        total_neto: lines.reduce((sum, l) => sum + Number(l.eff_neto), 0)
      }
    })

  } catch (error) {
    console.error('Error en autorización de nómina:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}
