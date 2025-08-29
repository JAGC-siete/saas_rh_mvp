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

    console.log('Usuario autenticado para edición de nómina:', { 
      userId: user.id, 
      role: userProfile.role,
      companyId: userProfile.company_id 
    })

    const { run_line_id, field, new_value, reason } = req.body || {}
    
    // Validaciones
    if (!run_line_id || !field || new_value === undefined || new_value === null) {
      return res.status(400).json({ error: 'run_line_id, field, y new_value son requeridos' })
    }
    
    if (!['hours', 'bruto', 'ihss', 'rap', 'isr', 'neto'].includes(field)) {
      return res.status(400).json({ error: 'Campo inválido. Debe ser: hours, bruto, ihss, rap, isr, o neto' })
    }

    // Validar que new_value sea numérico
    if (isNaN(Number(new_value)) || Number(new_value) < 0) {
      return res.status(400).json({ error: 'new_value debe ser un número positivo' })
    }

    // Verificar que la línea pertenezca a la empresa del usuario
    const { data: line, error: lineError } = await supabase
      .from('payroll_run_lines')
      .select('id, company_uuid, run_id, edited')
      .eq('id', run_line_id)
      .eq('company_uuid', userProfile.company_id)
      .single()

    if (lineError || !line) {
      return res.status(404).json({ 
        error: 'Línea de planilla no encontrada o no autorizada',
        message: 'La línea no existe o no pertenece a su empresa'
      })
    }

    // Verificar que la corrida esté en estado editable
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('id, status')
      .eq('id', line.run_id)
      .single()

    if (runError || !run) {
      return res.status(404).json({ 
        error: 'Corrida de planilla no encontrada',
        message: 'La corrida no existe'
      })
    }

    if (!['draft', 'edited'].includes(run.status)) {
      return res.status(400).json({ 
        error: 'Corrida no editable',
        message: `La corrida está en estado '${run.status}' y no se puede editar`
      })
    }

    console.log('Aplicando ajuste a línea de planilla:', {
      run_line_id,
      field,
      new_value,
      reason,
      companyId: userProfile.company_id,
      runStatus: run.status
    })

    // Aplicar ajuste usando la función helper
    const { data: adjustmentResult, error: adjustmentError } = await supabase.rpc('apply_payroll_adjustment', {
      p_run_line_id: run_line_id,
      p_company_uuid: userProfile.company_id,
      p_field: field,
      p_new_value: Number(new_value),
      p_reason: reason || `Ajuste manual de ${field}`,
      p_user_id: user.id
    })

    if (adjustmentError) {
      console.error('Error aplicando ajuste:', adjustmentError)
      return res.status(500).json({ error: 'Error aplicando ajuste' })
    }

    if (!adjustmentResult) {
      return res.status(400).json({ error: 'No se pudo aplicar el ajuste' })
    }

    // Obtener la línea actualizada para confirmar cambios
    const { data: updatedLine, error: updatedError } = await supabase
      .from('payroll_run_lines')
      .select('eff_hours, eff_bruto, eff_ihss, eff_rap, eff_isr, eff_neto, edited, updated_at')
      .eq('id', run_line_id)
      .single()

    if (updatedError) {
      console.error('Error obteniendo línea actualizada:', updatedError)
      return res.status(500).json({ error: 'Error obteniendo línea actualizada' })
    }

    // Obtener el ajuste recién creado para auditoría
    const { data: adjustment } = await supabase
      .from('payroll_adjustments')
      .select('id, old_value, new_value, reason, created_at')
      .eq('run_line_id', run_line_id)
      .eq('field', field)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    console.log('Ajuste aplicado exitosamente:', {
      adjustment_id: adjustment?.id,
      field,
      old_value: adjustment?.old_value,
      new_value: adjustment?.new_value,
      reason: adjustment?.reason
    })

    return res.status(200).json({
      message: 'Ajuste aplicado exitosamente',
      ok: true,
      run_line_id,
      edited: true,
      adjustment: {
        id: adjustment?.id,
        field,
        old_value: adjustment?.old_value,
        new_value: adjustment?.new_value,
        reason: adjustment?.reason,
        created_at: adjustment?.created_at
      },
      updated_line: {
        eff_hours: updatedLine.eff_hours,
        eff_bruto: updatedLine.eff_bruto,
        eff_ihss: updatedLine.eff_ihss,
        eff_rap: updatedLine.eff_rap,
        eff_isr: updatedLine.eff_isr,
        eff_neto: updatedLine.eff_neto,
        edited: updatedLine.edited,
        updated_at: updatedLine.updated_at
      }
    })

  } catch (error) {
    console.error('Error en edición de nómina:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}
