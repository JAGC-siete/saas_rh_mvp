import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { getHondurasTimestamp } from '../../../lib/timezone'
import { withExportRateLimit } from '../../../lib/security/rate-limiting'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // AUTENTICACIÓN ESTANDARIZADA - Usar requireCompanyAccess
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)
    
    // Verificar roles específicos para autorizar nómina
    // Solo super_admin y company_admin pueden autorizar (no hr_manager)
    // hr_manager puede preparar borradores pero no autorizarlos
    if (!['super_admin', 'company_admin'].includes(role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'Solo administradores pueden autorizar nómina. Los preparadores pueden crear y editar borradores, pero no autorizarlos.'
      })
    }

    // User authenticated for payroll authorization

    const { run_id } = req.body || {}
    
    // Debug logging
    console.log('Authorize request received:', {
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      run_id,
      run_id_type: typeof run_id
    })
    
    // Validaciones
    if (!run_id) {
      console.log('Missing run_id in authorize request')
      return res.status(400).json({ error: 'run_id es requerido' })
    }

    // Verificar que la corrida pertenezca a la empresa del usuario
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('id, company_id, status, year, month, quincena, tipo')
      .eq('id', run_id)
      .eq('company_id', companyId)
      .single()

    if (runError || !run) {
      return res.status(404).json({ 
        error: 'Corrida de planilla no encontrada o no autorizada',
        message: 'La corrida no existe o no pertenece a su empresa'
      })
    }

    // Verificar que la corrida esté en estado editable
    // Permitir re-autorización si ya estaba autorizada (UPSERT logic)
    if (!['draft', 'edited', 'authorized'].includes(run.status)) {
      return res.status(400).json({ 
        error: 'Corrida no autorizable',
        message: `La corrida está en estado '${run.status}' y no se puede autorizar`
      })
    }

    // Obtener líneas de la corrida para verificar que estén completas (incluir metadata para deduction plans)
    const { data: lines, error: linesError } = await supabase
      .from('payroll_run_lines')
      .select('id, employee_id, eff_hours, eff_bruto, eff_ihss, eff_rap, eff_isr, eff_neto, edited, metadata')
      .eq('run_id', run_id)
      .eq('company_id', companyId)

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
      companyId: companyId,
      status: run.status,
      lines_count: lines.length,
      has_edits: lines.some((l: any) => l.edited)
    })

    // Actualizar estado de la corrida a 'authorized'
    const { error: updateError } = await supabase
      .from('payroll_runs')
      .update({ 
        status: 'authorized',
        updated_at: getHondurasTimestamp()
      })
      .eq('id', run_id)
      .eq('company_id', companyId)

    if (updateError) {
      console.error('Error actualizando estado de corrida:', updateError)
      return res.status(500).json({ error: 'Error actualizando estado de corrida' })
    }

    // Incrementar plazos_aplicados en employee_deduction_plans (solo si NO estaba ya autorizada)
    if (run.status !== 'authorized') {
      const planIdsToIncrement: { planId: string; employeeId: string }[] = []
      for (const line of lines || []) {
        const meta = (line as any).metadata as Record<string, unknown> | null
        const ids = meta?._deduction_plan_ids as string[] | undefined
        if (Array.isArray(ids) && ids.length > 0 && line.employee_id) {
          for (const planId of ids) {
            if (planId && typeof planId === 'string') {
              planIdsToIncrement.push({ planId, employeeId: line.employee_id })
            }
          }
        }
      }
      for (const { planId, employeeId: empId } of planIdsToIncrement) {
        const line = lines.find((l: any) => l.employee_id === empId)
        if (!line) continue
        const { data: plan, error: planErr } = await supabase
          .from('employee_deduction_plans')
          .select('id, employee_id, company_id, plazos_aplicados, plazos_totales, monto_por_plazo')
          .eq('id', planId)
          .eq('company_id', companyId)
          .eq('employee_id', empId)
          .single()
        if (planErr || !plan) continue
        const newApplied = (plan.plazos_aplicados || 0) + 1
        const updatePayload: Record<string, unknown> = {
          plazos_aplicados: newApplied,
          updated_at: getHondurasTimestamp()
        }
        if (newApplied >= (plan.plazos_totales || 0)) {
          updatePayload.activo = false
          updatePayload.fecha_fin = new Date().toISOString().split('T')[0]
        }
        await supabase
          .from('employee_deduction_plans')
          .update(updatePayload)
          .eq('id', planId)
          .eq('company_id', companyId)
          .eq('employee_id', empId)
        const montoPorPlazo = Number(plan.monto_por_plazo) || 0
        await supabase.from('deduction_plan_applications').insert({
          deduction_plan_id: planId,
          run_line_id: line.id,
          company_id: companyId,
          plazo_numero: newApplied,
          monto_aplicado: montoPorPlazo,
          run_id
        })
      }
    }

    // Registrar en audit_logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        company_id: companyId,
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
    const pdfUrl = `/api/payroll/generate-pdf-from-run?run_id=${run_id}`

    // Generar vouchers individuales
    const vouchers = lines.map((line: any) => ({
      employee_id: line.employee_id,
      url: `/api/payroll/generate-voucher?run_line_id=${line.id}`
    }))

    const wasAlreadyAuthorized = run.status === 'authorized'
    
    console.log('Corrida de planilla autorizada exitosamente:', {
      run_id,
      status: 'authorized',
      pdf_url: pdfUrl,
      vouchers_count: vouchers.length,
      was_reauthorized: wasAlreadyAuthorized
    })

    return res.status(200).json({
      message: wasAlreadyAuthorized 
        ? 'Corrida de planilla re-autorizada exitosamente'
        : 'Corrida de planilla autorizada exitosamente',
      ok: true,
      run_id,
      status: 'authorized',
      artifact_url: pdfUrl,
      vouchers,
      warning: wasAlreadyAuthorized ? 'La nómina ya estaba autorizada. Se actualizó el registro existente.' : null,
      summary: {
        total_lines: lines.length,
        edited_lines: lines.filter((l: any) => l.edited).length,
        total_bruto: lines.reduce((sum: number, l: any) => sum + Number(l.eff_bruto), 0),
        total_deducciones: lines.reduce((sum: number, l: any) => sum + Number(l.eff_ihss) + Number(l.eff_rap) + Number(l.eff_isr), 0),
        total_neto: lines.reduce((sum: number, l: any) => sum + Number(l.eff_neto), 0)
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

export default withExportRateLimit()(handler)
