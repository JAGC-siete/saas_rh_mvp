import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
import { notificationManager } from '../../../lib/notification-providers'
import { emailService } from '../../../lib/email-service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // AUTENTICACIÓN REQUERIDA
    const authResult = await authenticateUser(req, res, ['can_export_payroll'])
    
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

    console.log('Usuario autenticado para envío de email:', { 
      userId: user.id, 
      role: userProfile.role,
      companyId: userProfile.company_id 
    })

    const { run_id, employee_id } = req.body || {}
    
    // Validaciones
    if (!run_id) {
      return res.status(400).json({ error: 'run_id es requerido' })
    }

    // Verificar que la corrida pertenezca a la empresa del usuario
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('id, company_uuid, year, month, quincena, tipo')
      .eq('id', run_id)
      .eq('company_uuid', userProfile.company_id)
      .single()

    if (runError || !run) {
      return res.status(404).json({ 
        error: 'Corrida de planilla no encontrada o no autorizada',
        message: 'La corrida no existe o no pertenece a su empresa'
      })
    }

    // Obtener configuración de notificaciones
    const notificationConfig = await notificationManager.getConfigForCompany(userProfile.company_id)
    
    if (!notificationConfig) {
      return res.status(400).json({ 
        error: 'Configuración de email no encontrada',
        message: 'Configure el proveedor de email para su empresa'
      })
    }

    // Obtener líneas de la corrida
    let query = supabase
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
        employees!inner(
          name,
          email,
          dni,
          bank_name,
          bank_account
        )
      `)
      .eq('run_id', run_id)
      .eq('company_uuid', userProfile.company_id)

    // Si se especifica un empleado, filtrar solo ese
    if (employee_id) {
      query = query.eq('employee_id', employee_id)
    }

    const { data: lines, error: linesError } = await query

    if (linesError) {
      console.error('Error obteniendo líneas de planilla:', linesError)
      return res.status(500).json({ error: 'Error obteniendo líneas de planilla' })
    }

    if (!lines || lines.length === 0) {
      return res.status(400).json({ 
        error: 'No hay líneas de planilla para enviar',
        message: 'No se encontraron líneas para el empleado especificado'
      })
    }

    console.log(`Enviando ${lines.length} vouchers por email`)

    // Enviar vouchers por email
    const results = []
    
    for (const line of lines) {
      try {
        // Fix the data structure - employees is an object, not an array
        const employee = (line as any).employees
        if (!employee || !employee.email) {
          console.warn(`Empleado sin email: ${line.employee_id}`)
          continue
        }
        
        const periodo = `${run.year}-${run.month.toString().padStart(2, '0')} Q${run.quincena}`
        
        const emailResult = await emailService.sendEmail(notificationConfig, {
          to: employee.email,
          subject: `Recibo de Nómina - ${periodo}`,
          text: `Recibo de Nómina - ${periodo} para ${employee.name}`,
          html: `
            <h2>Recibo de Nómina - ${periodo}</h2>
            <p>Estimado/a ${employee.name},</p>
            <p>Adjunto encontrará su recibo de nómina correspondiente al período ${periodo}.</p>
            <h3>Resumen de Nómina:</h3>
            <ul>
              <li><strong>Horas trabajadas:</strong> ${line.eff_hours}</li>
              <li><strong>Salario bruto:</strong> L. ${line.eff_bruto.toFixed(2)}</li>
              <li><strong>IHSS:</strong> L. ${line.eff_ihss.toFixed(2)}</li>
              <li><strong>RAP:</strong> L. ${line.eff_rap.toFixed(2)}</li>
              <li><strong>ISR:</strong> L. ${line.eff_isr.toFixed(2)}</li>
              <li><strong>Salario neto:</strong> L. ${line.eff_neto.toFixed(2)}</li>
            </ul>
            <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
            <p>Saludos cordiales,<br>Equipo de Recursos Humanos</p>
          `
        })

        if (emailResult.success) {
          results.push({
            employee_id: employee.id || line.employee_id,
            email: employee.email,
            success: true,
            message_id: emailResult.messageId
          })
          console.log(`✅ Email enviado a ${employee.email}:`, emailResult.messageId)
        } else {
          results.push({
            employee_id: employee.id || line.employee_id,
            email: employee.email,
            success: false,
            error: emailResult.error
          })
          console.error(`❌ Error enviando email a ${employee.email}:`, emailResult.error)
        }

      } catch (error: any) {
        const employee = (line as any).employees
        console.error(`❌ Error crítico enviando email a ${employee?.email || 'unknown'}:`, error)
        results.push({
          employee_id: line.employee_id,
          email: employee?.email || 'unknown',
          success: false,
          error: error.message
        })
      }
    }

    const successfulSends = results.filter(r => r.success).length
    const failedSends = results.filter(r => !r.success).length

    console.log(`Envío de emails completado: ${successfulSends} exitosos, ${failedSends} fallidos`)

    return res.status(200).json({
      message: 'Envío de emails completado',
      total: results.length,
      successful: successfulSends,
      failed: failedSends,
      results
    })

  } catch (error) {
    console.error('Error en envío de emails:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}


