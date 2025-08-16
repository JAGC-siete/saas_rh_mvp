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

interface TrialEnvironment {
  tenant_id: string
  magic_link: string
  trial_expires_at: Date
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

    // Validar campos requeridos
    if (!empresa || !nombre || !contactoWhatsApp || !contactoEmail || !aceptaTrial) {
      return res.status(400).json({ 
        error: 'Todos los campos son requeridos, incluyendo aceptación del trial' 
      })
    }

    if (!aceptaTrial) {
      return res.status(400).json({ 
        error: 'Debes aceptar el trial para continuar' 
      })
    }

    // Validar formato de WhatsApp (formato hondureño)
    const whatsappRegex = /^(\+504|504)?[0-9]{8}$/
    if (!whatsappRegex.test(contactoWhatsApp.replace(/[-\s]/g, ''))) {
      return res.status(400).json({ 
        error: 'Formato de WhatsApp inválido. Use formato hondureño (ej: 9999-9999 o +50499999999)' 
      })
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(contactoEmail)) {
      return res.status(400).json({ 
        error: 'Formato de email inválido' 
      })
    }

    // Validar número de empleados
    if (empleados < 1 || empleados > 1000) {
      return res.status(400).json({ 
        error: 'Número de empleados debe estar entre 1 y 1000' 
      })
    }

    console.log('✅ Validaciones pasadas exitosamente')

    // Generar tenant_id único
    const tenant_id = `tnt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Calcular fecha de expiración del trial (7 días)
    const trial_expires_at = new Date()
    trial_expires_at.setDate(trial_expires_at.getDate() + 7)

    // Generar magic link para acceso inmediato
    const magic_link = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'}/dashboard?tenant=${tenant_id}&trial=true`

    console.log('🔑 Datos generados:', { tenant_id, magic_link, trial_expires_at })

    // Guardar en base de datos
    console.log('💾 Intentando insertar en base de datos...')
    
    const { data: activacion, error: dbError } = await supabase
      .from('activaciones')
      .insert([{
        empleados,
        empresa,
        contacto_nombre: nombre,
        contacto_whatsapp: contactoWhatsApp,
        contacto_email: contactoEmail,
        acepta_trial: aceptaTrial,
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

    // TODO: Crear entorno de trial (Company + Owner + Demo data) - TEMPORALMENTE DESHABILITADO
    // console.log('🏗️ Creando entorno de trial...')
    // const trialEnvironment = await crearEntornoTrial(supabase, {
    //   tenant_id,
    //   empresa,
    //   nombre,
    //   contactoEmail,
    //   empleados
    // })

    // Enviar notificaciones inmediatas
    console.log('📱 Enviando notificaciones...')
    await enviarNotificacionesTrial({
      empresa,
      nombre,
      contactoWhatsApp,
      contactoEmail,
      empleados,
      magic_link,
      tenant_id
    })

    // Disparar webhook a canal #activaciones
    console.log('🔗 Disparando webhook...')
    await dispararWebhookActivaciones({
      empresa,
      nombre,
      contactoWhatsApp,
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
    // 1. Crear Company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([{
        name: data.empresa,
        subdomain: data.tenant_id,
        plan_type: 'trial',
        settings: {
          trial_activated_at: new Date().toISOString(),
          trial_employee_limit: data.empleados,
          timezone: 'America/Tegucigalpa'
        },
        is_active: true
      }])
      .select()

    if (companyError) {
      throw new Error(`Error creando company: ${companyError.message}`)
    }

    // 2. Crear Owner (usuario principal)
    const { data: owner, error: ownerError } = await supabase
      .from('user_profiles')
      .insert([{
        id: data.tenant_id, // Usar tenant_id como user_id temporal
        company_id: company[0].id,
        role: 'company_admin',
        permissions: {
          can_manage_employees: true,
          can_view_attendance: true,
          can_manage_payroll: true,
          can_manage_settings: true
        },
        is_active: true
      }])
      .select()

    if (ownerError) {
      throw new Error(`Error creando owner: ${ownerError.message}`)
    }

    // 3. Crear horario estándar HN
    const { data: schedule, error: scheduleError } = await supabase
      .from('work_schedules')
      .insert([{
        company_id: company[0].id,
        name: 'Horario Estándar HN',
        monday_start: '08:00',
        monday_end: '17:00',
        tuesday_start: '08:00',
        tuesday_end: '17:00',
        wednesday_start: '08:00',
        wednesday_end: '17:00',
        thursday_start: '08:00',
        thursday_end: '17:00',
        friday_start: '08:00',
        friday_end: '17:00',
        saturday_start: '08:00',
        saturday_end: '12:00',
        sunday_start: null,
        sunday_end: null,
        break_duration: 60,
        timezone: 'America/Tegucigalpa'
      }])
      .select()

    if (scheduleError) {
      throw new Error(`Error creando horario: ${scheduleError.message}`)
    }

    // 4. Crear 3 empleados demo
    const demoEmployees = [
      {
        name: 'Juan Pérez Demo',
        dni: '0001',
        position: 'Desarrollador',
        base_salary: 15000,
        hire_date: new Date().toISOString().split('T')[0]
      },
      {
        name: 'María González Demo',
        dni: '0002',
        position: 'Diseñadora',
        base_salary: 12000,
        hire_date: new Date().toISOString().split('T')[0]
      },
      {
        name: 'Carlos López Demo',
        dni: '0003',
        position: 'Vendedor',
        base_salary: 10000,
        hire_date: new Date().toISOString().split('T')[0]
      }
    ]

    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .insert(demoEmployees.map(emp => ({
        ...emp,
        company_id: company[0].id,
        work_schedule_id: schedule[0].id,
        status: 'active',
        employee_code: emp.dni
      })))
      .select()

    if (employeesError) {
      throw new Error(`Error creando empleados demo: ${employeesError.message}`)
    }

    return {
      success: true,
      data: {
        company: company[0],
        owner: owner[0],
        schedule: schedule[0],
        employees: employees
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
    // Aquí implementarías el envío real de emails/WhatsApp
    // Por ejemplo usando Resend, Nodemailer, o Twilio
    
    console.log('🚀 Enviando notificaciones de trial para:', {
      empresa: data.empresa,
      nombre: data.nombre,
      email: data.contactoEmail,
      whatsapp: data.contactoWhatsApp,
      empleados: data.empleados,
      magic_link: data.magic_link,
      tenant_id: data.tenant_id
    })

    // TODO: Implementar envío real de WhatsApp
    // Ejemplo con Twilio:
    /*
    await twilioClient.messages.create({
      body: `Hola ${data.nombre}, ya activamos SISU – ${data.empresa}. Entra aquí: ${data.magic_link}. Paso siguiente: sube tu plantilla (CSV/Excel) o respóndenos con 5 empleados y te lo dejamos corriendo hoy. ¿Querés una demo de 15 min?`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `whatsapp:+504${data.contactoWhatsApp.replace(/[-\s]/g, '')}`
    })
    */

    // TODO: Implementar envío real de email
    // Ejemplo con Resend:
    /*
    await resend.emails.send({
      from: 'SISU <noreply@humanosisu.net>',
      to: data.contactoEmail,
      subject: 'Tu acceso a SISU – ' + data.empresa,
      html: `
        <h1>¡Hola ${data.nombre}!</h1>
        <p>Tu entorno de prueba SISU está listo.</p>
        <p><strong>Acceso directo:</strong> <a href="${data.magic_link}">${data.magic_link}</a></p>
        <p><strong>Próximos pasos:</strong></p>
        <ol>
          <li>Entra al dashboard y explora las funciones</li>
          <li>Sube tu plantilla de empleados o pide que te carguemos 5</li>
          <li>Agenda una demo de 15 min si quieres</li>
        </ol>
        <p>Tu trial expira en 7 días. ¡Disfruta explorando SISU!</p>
      `
    })
    */

  } catch (error) {
    console.error('Error sending trial notifications:', error)
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
