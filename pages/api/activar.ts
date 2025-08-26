import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../lib/supabase/server'

export const config = {
  api: {
    bodyParser: true, // Cambiar a true para JSON
  },
}

interface ActivationData {
  empleados: number
  empresa: string
  nombre: string
  contactoWhatsApp: string
  contactoEmail: string
  aceptaTrial: boolean
}



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔍 Iniciando handler de activación...')
    
    const supabase = createAdminClient()
    console.log('✅ Cliente Supabase creado exitosamente')
    
    // Parse JSON body
    const {
      empleados,
      empresa,
      nombre,
      contactoWhatsApp,
      contactoEmail,
      aceptaTrial
    }: ActivationData = req.body

    console.log('📝 Datos recibidos:', { empleados, empresa, nombre, contactoWhatsApp, contactoEmail, aceptaTrial })

    // Validar solo el campo requerido (email)
    if (!contactoEmail) {
      return res.status(400).json({ 
        error: 'El email es requerido para continuar' 
      })
    }

    // Validar formato de WhatsApp solo si se proporciona
    if (contactoWhatsApp && contactoWhatsApp.trim()) {
      const whatsappRegex = /^(\+504|504)?[0-9]{8}$/
      if (!whatsappRegex.test(contactoWhatsApp.replace(/[-\s]/g, ''))) {
        return res.status(400).json({ 
          error: '📱 Formato de WhatsApp inválido. Usa formato hondureño: 9999-9999 o +50499999999' 
        })
      }
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(contactoEmail)) {
      return res.status(400).json({ 
        error: '📧 Por favor ingresa un email válido' 
      })
    }

    // Validar número de empleados
    if (empleados < 1 || empleados > 1000) {
      return res.status(400).json({ 
        error: '👥 El número de empleados debe estar entre 1 y 1000' 
      })
    }

    console.log('✅ Validaciones pasadas exitosamente')

    // Generar tenant_id único
    const tenant_id = `tnt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Calcular fecha de expiración del trial (7 días)
    const trial_expires_at = new Date()
    trial_expires_at.setDate(trial_expires_at.getDate() + 7)

    // Generar magic link para acceso inmediato
    const magic_link = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'https://humanosisu.net'}/trial-dashboard?tenant=${tenant_id}&trial=true`

    console.log('🔑 Datos generados:', { tenant_id, magic_link, trial_expires_at })

    // Guardar en base de datos
    console.log('💾 Intentando insertar en base de datos...')
    
    const { data: activacion, error: dbError } = await supabase
      .from('activaciones')
      .insert([{
        empleados,
        empresa: empresa || 'Empresa no especificada',
        contacto_nombre: nombre || 'Contacto no especificado',
        contacto_whatsapp: contactoWhatsApp || null,
        contacto_email: contactoEmail,
        acepta_trial: aceptaTrial || false,
        tenant_id,
        magic_link,
        trial_expires_at: trial_expires_at.toISOString(),
        status: 'trial_pending_data',
        departamentos: null, // Ya no se usa en el nuevo flujo
        monto: null, // Ya no se calcula en el trial
        comprobante: null, // Ya no se sube en el trial
        notas: `Trial activado automáticamente. Empleados: ${empleados}`
      }])
      .select()

    if (dbError) {
      console.error('❌ Database error:', dbError)
      return res.status(500).json({ error: 'Error guardando datos en la base de datos' })
    }

    console.log('✅ Datos guardados exitosamente en activaciones')

    // Crear entorno de trial (Company + Owner + Demo data)
    console.log('🏗️ Creando entorno de trial...')
    const trialEnvironment = await crearEntornoTrial(supabase, {
      tenant_id,
      empresa: empresa || 'Empresa no especificada',
      nombre: nombre || 'Contacto no especificado',
      contactoEmail,
      empleados
    })

    if (trialEnvironment.success) {
      console.log('✅ Entorno de trial creado exitosamente:', trialEnvironment.data)
    } else {
      console.error('❌ Error creando entorno de trial:', trialEnvironment.error)
      // No fallar todo el proceso, pero logear el error
    }

    // Enviar notificaciones inmediatas
    console.log('📱 Enviando notificaciones...')
    await enviarNotificacionesTrial({
      empresa: empresa || 'Empresa no especificada',
      nombre: nombre || 'Contacto no especificado',
      contactoWhatsApp: contactoWhatsApp || 'No especificado',
      contactoEmail,
      empleados,
      magic_link,
      tenant_id
    })

    // Disparar webhook a canal #activaciones
    console.log('🔗 Disparando webhook...')
    await dispararWebhookActivaciones({
      empresa: empresa || 'Empresa no especificada',
      nombre: nombre || 'Contacto no especificado',
      contactoWhatsApp: contactoWhatsApp || 'No especificado',
      contactoEmail,
      empleados,
      tenant_id,
      status: 'trial_pending_data'
    })

    console.log('🎉 Activación completada exitosamente')

    return res.status(200).json({ 
      message: 'Trial activado exitosamente',
      data: {
        ...activacion[0],
        magic_link,
        tenant_id,
        trial_expires_at: trial_expires_at.toISOString()
      }
    })

  } catch (error) {
    console.error('💥 Error general en handler:', error)
    return res.status(500).json({ error: 'Error procesando la solicitud de trial' })
  }
}

async function crearEntornoTrial(supabase: any, data: {
  tenant_id: string
  empresa: string
  nombre: string
  contactoEmail: string
  empleados: number
}) {
  try {
    console.log('🔍 Buscando entorno demo existente para reutilizar...')
    
    // 1. Buscar empresa demo existente (NO crear nueva)
    const { data: demoCompany, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('name', 'Empresa Demo Trial')
      .eq('plan_type', 'trial')
      .eq('is_active', true)
      .single()

    if (companyError || !demoCompany) {
      console.log('⚠️ No existe empresa demo, creando una sola vez...')
      
      // Crear SOLO UNA VEZ la empresa demo
      const { data: newDemoCompany, error: createError } = await supabase
        .from('companies')
        .insert([{
          name: 'Empresa Demo Trial',
          subdomain: 'demo-trial',
          plan_type: 'trial',
          settings: {
            trial_activated_at: new Date().toISOString(),
            trial_employee_limit: 25,
            timezone: 'America/Tegucigalpa'
          },
          is_active: true
        }])
        .select()

      if (createError) {
        throw new Error(`Error creando empresa demo: ${createError.message}`)
      }
      
      // Crear empleados demo SOLO UNA VEZ
      const demoEmployees = [
        { name: 'Juan Pérez Demo', dni: '0001', position: 'Desarrollador', base_salary: 15000 },
        { name: 'María González Demo', dni: '0002', position: 'Diseñadora', base_salary: 12000 },
        { name: 'Carlos López Demo', dni: '0003', position: 'Vendedor', base_salary: 10000 },
        { name: 'Ana Martínez Demo', dni: '0004', position: 'Contadora', base_salary: 14000 },
        { name: 'Luis Rodríguez Demo', dni: '0005', position: 'Marketing', base_salary: 11000 }
      ]

      const { data: newEmployees, error: employeesError } = await supabase
        .from('employees')
        .insert(demoEmployees.map(emp => ({
          ...emp,
          company_id: newDemoCompany[0].id,
          status: 'active',
          employee_code: emp.dni,
          hire_date: '2025-01-01'
        })))
        .select()

      if (employeesError) {
        throw new Error(`Error creando empleados demo: ${employeesError.message}`)
      }

      console.log('✅ Entorno demo creado exitosamente')
      return {
        success: true,
        data: {
          company: newDemoCompany[0],
          employees: newEmployees
        }
      }
    }

    console.log('✅ Reutilizando entorno demo existente')
    return {
      success: true,
      data: {
        company: demoCompany,
        employees: [] // Los empleados ya existen
      }
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

async function enviarNotificacionesTrial(data: {
  empresa: string
  nombre: string
  contactoWhatsApp: string
  contactoEmail: string
  empleados: number
  magic_link: string
  tenant_id: string
}) {
  try {
    console.log('🚀 Enviando notificaciones de trial para:', {
      empresa: data.empresa,
      nombre: data.nombre,
      email: data.contactoEmail,
      whatsapp: data.contactoWhatsApp,
      empleados: data.empleados,
      magic_link: data.magic_link,
      tenant_id: data.tenant_id
    })

    // Envío de email con Resend
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(apiKey)
        
        const emailResult = await resend.emails.send({
          from: process.env.RESEND_FROM || 'SISU <noreply@humanosisu.net>',
      to: data.contactoEmail,
          subject: `🎉 ¡Tu trial de SISU está activo! - ${data.empresa}`,
      html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Tu trial de SISU está activo</title>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .steps { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .step { margin: 10px 0; padding: 10px; border-left: 3px solid #667eea; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 ¡Tu trial de SISU está activo!</h1>
                  <p>Empresa: <strong>${data.empresa}</strong></p>
                </div>
                
                <div class="content">
                  <h2>¡Hola ${data.nombre}!</h2>
                  <p>Tu entorno de prueba SISU está listo y funcionando. Ya puedes empezar a explorar todas las funcionalidades.</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${data.magic_link}" class="button">🚀 Acceder a mi Dashboard</a>
                  </div>
                  
                  <div class="steps">
                    <h3>📋 Próximos pasos:</h3>
                    <div class="step">
                      <strong>1.</strong> Entra al dashboard y explora las funciones
                    </div>
                    <div class="step">
                      <strong>2.</strong> Sube tu plantilla de empleados o pide que te carguemos ${data.empleados} empleados demo
                    </div>
                    <div class="step">
                      <strong>3.</strong> Agenda una demo de 15 min si quieres
                    </div>
                  </div>
                  
                  <div style="background: #e8f4fd; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h4>📱 ¿Necesitas ayuda?</h4>
                    <p>Responde a este email o ${data.contactoWhatsApp !== 'No especificado' ? `escríbenos por WhatsApp al <strong>+504 ${data.contactoWhatsApp}</strong>` : 'escríbenos por email'}</p>
                  </div>
                  
                  <div style="background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h4>⏰ Tu trial expira en 7 días</h4>
                    <p>Disfruta explorando SISU y conoce todas las funcionalidades que te ofrecemos.</p>
                  </div>
                </div>
                
                <div class="footer">
                  <p>Este email fue enviado desde SISU - Sistema de Gestión de Recursos Humanos</p>
                  <p>Si no solicitaste este trial, puedes ignorar este mensaje.</p>
                </div>
              </div>
            </body>
            </html>
          `
        })
        
        console.log('✅ Email enviado exitosamente:', emailResult)
      } catch (emailError) {
        console.error('❌ Error enviando email:', emailError)
      }
    } else {
      console.log('⚠️ RESEND_API_KEY no configurado, saltando envío de email')
    }

    // TODO: Implementar envío real de WhatsApp con Twilio
    // Por ahora solo log
    if (data.contactoWhatsApp && data.contactoWhatsApp !== 'No especificado') {
      console.log('📱 WhatsApp notification (to be implemented):', {
        to: `+504${data.contactoWhatsApp.replace(/[-\s]/g, '')}`,
        message: `Hola ${data.nombre}, ya activamos SISU – ${data.empresa}. Entra aquí: ${data.magic_link}. Paso siguiente: sube tu plantilla (CSV/Excel) o respóndenos con ${data.empleados} empleados y te lo dejamos corriendo hoy. ¿Querés una demo de 15 min?`
      })
    } else {
      console.log('📱 WhatsApp no proporcionado, saltando notificación por WhatsApp')
    }

  } catch (error) {
    console.error('❌ Error sending trial notifications:', error)
    // No fallar todo el proceso si las notificaciones fallan
  }
}

async function dispararWebhookActivaciones(data: {
  empresa: string
  nombre: string
  contactoWhatsApp: string
  contactoEmail: string
  empleados: number
  tenant_id: string
  status: string
}) {
  try {
    const webhookUrl = process.env.ACTIVACIONES_WEBHOOK_URL
    
    if (!webhookUrl) {
      console.log('⚠️ ACTIVACIONES_WEBHOOK_URL no configurado, saltando webhook')
      return
    }

    const payload = {
      company: data.empresa,
      contact_name: data.nombre,
      whatsapp: data.contactoWhatsApp,
      email: data.contactoEmail,
      employees: data.empleados,
      tenant_id: data.tenant_id,
      status: data.status,
      submitted_at: new Date().toISOString()
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SISU-Activaciones/1.0'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
    }

    console.log('✅ Webhook enviado exitosamente a #activaciones')

  } catch (error) {
    console.error('Error disparando webhook:', error)
    // No fallar todo el proceso si el webhook falla
  }
}
