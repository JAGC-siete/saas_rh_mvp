import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../lib/supabase/server'
import { getHondurasTimestamp, nowInHonduras } from '../../lib/timezone'
import { randomUUID } from 'crypto'
import { TRIAL_CONFIG } from '../../lib/config/trial'

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
  departamentos: number
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
      departamentos,
      aceptaTrial
    }: ActivationData = req.body

    console.log('📝 Datos recibidos:', { empleados, empresa, nombre, contactoWhatsApp, contactoEmail, departamentos, aceptaTrial })

    // Validar campos requeridos
    if (!contactoEmail) {
      return res.status(400).json({ 
        error: 'El email es requerido para continuar' 
      })
    }

    if (!empresa || empresa.trim() === '') {
      return res.status(400).json({ 
        error: 'El nombre de la empresa es requerido' 
      })
    }

    if (!departamentos || departamentos < 1) {
      return res.status(400).json({ 
        error: 'El número de departamentos debe ser mayor a 0' 
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
    if (empleados < TRIAL_CONFIG.MIN_EMPLOYEES || empleados > TRIAL_CONFIG.MAX_EMPLOYEES) {
      return res.status(400).json({ 
        error: `👥 El número de empleados debe estar entre ${TRIAL_CONFIG.MIN_EMPLOYEES} y ${TRIAL_CONFIG.MAX_EMPLOYEES}` 
      })
    }

    // Validar número de departamentos
    if (departamentos < TRIAL_CONFIG.MIN_DEPARTMENTS || departamentos > TRIAL_CONFIG.MAX_DEPARTMENTS) {
      return res.status(400).json({ 
        error: `🏢 El número de departamentos debe estar entre ${TRIAL_CONFIG.MIN_DEPARTMENTS} y ${TRIAL_CONFIG.MAX_DEPARTMENTS}` 
      })
    }

    // Validar email duplicado
    console.log('🔍 Verificando si el email ya tiene un trial activo...')
    const validacionEmail = await verificarEmailDuplicado(supabase, contactoEmail)
    
    if (!validacionEmail.puedeContinuar) {
      console.log('⚠️ Email duplicado detectado:', validacionEmail.razon)
      return res.status(409).json({ 
        error: validacionEmail.razon || 'Este email ya tiene un trial activo. Por favor, utiliza otro email o espera a que expire tu trial actual.'
      })
    }

    console.log('✅ Validaciones pasadas exitosamente')

    // Generar tenant_id único
    const tenant_id = `tnt_${nowInHonduras().getTime()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Calcular fecha de expiración del trial (configurable)
    const trial_expires_at = nowInHonduras()
    trial_expires_at.setDate(trial_expires_at.getDate() + TRIAL_CONFIG.DURATION_DAYS)

    // Generar magic link para acceso inmediato
    const magic_link = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'https://humanosisu.net'}/trial-dashboard?tenant=${tenant_id}&trial=true`

    console.log('🔑 Datos generados:', { tenant_id, magic_link, trial_expires_at })

    // Guardar en base de datos
    console.log('💾 Intentando insertar en base de datos...')
    
    const { error: dbError } = await supabase
      .from('activaciones')
      .insert([{
        empleados,
        empresa: empresa.trim(),
        contacto_nombre: nombre || 'Contacto no especificado',
        contacto_whatsapp: contactoWhatsApp || null,
        contacto_email: contactoEmail,
        acepta_trial: aceptaTrial || false,
        tenant_id,
        magic_link,
        trial_expires_at: trial_expires_at.toISOString(),
        status: 'trial_pending_data',
        departamentos: { total: departamentos },
        monto: null, // Ya no se calcula en el trial
        comprobante: null, // Ya no se sube en el trial
        notas: `Trial activado automáticamente. Empleados: ${empleados}, Departamentos: ${departamentos}`
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
      empresa: empresa.trim(),
      nombre: nombre || 'Contacto no especificado',
      contactoEmail,
      empleados,
      departamentos
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
        // ...activacion[0],
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

/**
 * Verifica si un email ya tiene un trial activo o reciente
 * @returns {puedeContinuar: boolean, razon?: string, trialExistente?: any}
 */
async function verificarEmailDuplicado(supabase: any, email: string): Promise<{
  puedeContinuar: boolean
  razon?: string
  trialExistente?: any
}> {
  const emailNormalizado = email.toLowerCase().trim()
  const ahora = nowInHonduras()

  try {
    // 1. Verificar trial_access_users activo
    const { data: trialActivo, error: trialError } = await supabase
      .from('trial_access_users')
      .select('*, companies!inner(plan_type, is_active, created_at)')
      .eq('email', emailNormalizado)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!trialError && trialActivo && trialActivo.length > 0) {
      const trial = trialActivo[0]
      // Calcular fecha de expiración basada en cuando se creó el trial
      const fechaCreacion = new Date(trial.created_at || trial.companies?.created_at || new Date())
      const expiresAt = new Date(fechaCreacion)
      expiresAt.setDate(expiresAt.getDate() + TRIAL_CONFIG.DURATION_DAYS)

      if (expiresAt > ahora) {
        const diasRestantes = Math.ceil((expiresAt.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
        return {
          puedeContinuar: false,
          razon: `Ya tienes un trial activo que expira en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}. Por favor, utiliza otro email o espera a que expire.`,
          trialExistente: trial
        }
      }
    }

    // 2. Verificar activaciones recientes (cooldown period)
    const fechaLimite = new Date(ahora)
    fechaLimite.setDate(fechaLimite.getDate() - TRIAL_CONFIG.COOLDOWN_DAYS)

    const { data: activacionReciente, error: activacionError } = await supabase
      .from('activaciones')
      .select('*')
      .eq('contacto_email', emailNormalizado)
      .gte('created_at', fechaLimite.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (!activacionError && activacionReciente && activacionReciente.length > 0) {
      const activacion = activacionReciente[0]
      const fechaActivacion = new Date(activacion.created_at)
      const diasDesdeUltima = Math.floor(
        (ahora.getTime() - fechaActivacion.getTime()) / (1000 * 60 * 60 * 24)
      )
      const diasRestantes = TRIAL_CONFIG.COOLDOWN_DAYS - diasDesdeUltima

      if (diasRestantes > 0) {
        return {
          puedeContinuar: false,
          razon: `Ya solicitaste un trial hace ${diasDesdeUltima} día${diasDesdeUltima > 1 ? 's' : ''}. Puedes solicitar otro en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}.`
        }
      }
    }

    // 3. Verificar auth.users con trial activo
    try {
      const { data: authUser } = await supabase.auth.admin.getUserByEmail(emailNormalizado)

      if (authUser?.user) {
        // Verificar si tiene company con plan_type='trial' y activa
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select(`
            company_id,
            companies!inner(
              id,
              plan_type,
              is_active,
              created_at
            )
          `)
          .eq('id', authUser.user.id)
          .single()

        if (!profileError && userProfile?.companies) {
          const company = userProfile.companies
          if (company.plan_type === 'trial' && company.is_active) {
            // Calcular si el trial aún no expira
            const fechaCreacionCompany = new Date(company.created_at)
            const expiresAt = new Date(fechaCreacionCompany)
            expiresAt.setDate(expiresAt.getDate() + TRIAL_CONFIG.DURATION_DAYS)

            if (expiresAt > ahora) {
              const diasRestantes = Math.ceil((expiresAt.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
              return {
                puedeContinuar: false,
                razon: `Ya tienes una cuenta con trial activo que expira en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}. Por favor, inicia sesión con tus credenciales o utiliza otro email.`
              }
            }
          }
        }
      }
    } catch (authError) {
      // Si hay error al verificar auth, continuar (no bloquear)
      console.warn('⚠️ Error verificando auth.users, continuando:', authError)
    }

    return { puedeContinuar: true }
  } catch (error) {
    console.error('❌ Error en verificarEmailDuplicado:', error)
    // En caso de error, permitir continuar (no bloquear el proceso)
    return { puedeContinuar: true }
  }
}

 
async function crearEntornoTrial(supabase: any, data: {
  tenant_id: string
  empresa: string
  nombre: string
  contactoEmail: string
  empleados: number
  departamentos: number
}) {
  try {
    console.log('🏗️ Creando entorno completo de trial para:', data.empresa)
    
    // 1. Crear company única
    console.log('📦 Paso 1: Creando company...')
    const companyId = randomUUID()
    const subdomain = `trial-${Date.now().toString(36)}`
    
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert([{
        id: companyId,
        name: data.empresa,
        subdomain,
        plan_type: 'trial',
        settings: {
          trial_activated_at: getHondurasTimestamp(),
          trial_employee_limit: data.empleados,
          timezone: 'America/Tegucigalpa'
        },
        is_active: true
      }])
      .select()
      .single()

    if (companyError || !newCompany) {
      throw new Error(`Error creando company: ${companyError?.message || 'Unknown error'}`)
    }
    console.log('✅ Company creada:', newCompany.id)

    // 2. Crear horarios de trabajo (3 horarios por defecto)
    console.log('⏰ Paso 2: Creando horarios de trabajo...')
    const horarios = [
      { name: 'Horario 8-5', start: '08:00', end: '17:00' },
      { name: 'Horario 9-6', start: '09:00', end: '18:00' },
      { name: 'Horario 10-7', start: '10:00', end: '19:00' }
    ]

    const schedulesToInsert = horarios.map(h => ({
      company_id: companyId,
      name: h.name,
      monday_start: h.start,
      monday_end: h.end,
      tuesday_start: h.start,
      tuesday_end: h.end,
      wednesday_start: h.start,
      wednesday_end: h.end,
      thursday_start: h.start,
      thursday_end: h.end,
      friday_start: h.start,
      friday_end: h.end,
      saturday_start: null,
      saturday_end: null,
      sunday_start: null,
      sunday_end: null,
      checkin_open: subtractMinutes(h.start, 30),
      checkin_close: addMinutes(h.start, 90),
      checkout_open: subtractMinutes(h.end, 90),
      checkout_close: addMinutes(h.end, 60),
      timezone: 'America/Tegucigalpa'
    }))

    const { data: schedules, error: schedulesError } = await supabase
      .from('work_schedules')
      .insert(schedulesToInsert)
      .select()

    if (schedulesError) {
      console.error('⚠️ Error creando horarios:', schedulesError)
      // Continuar sin horarios
    } else {
      console.log(`✅ ${schedules?.length || 0} horarios creados`)
    }

    // 3. Crear departamentos (número dinámico del formulario)
    console.log('🏢 Paso 3: Creando departamentos...')
    const defaultDeptNames = ['Administración', 'Ventas', 'Operaciones', 'Finanzas', 'Recursos Humanos']
    const deptNamesToCreate = defaultDeptNames.slice(0, Math.min(data.departamentos, defaultDeptNames.length))
    
    // Si necesitamos más departamentos, agregar genéricos
    if (data.departamentos > deptNamesToCreate.length) {
      for (let i = deptNamesToCreate.length; i < data.departamentos; i++) {
        deptNamesToCreate.push(`Departamento ${i + 1}`)
      }
    }

    const departmentsToInsert = deptNamesToCreate.map(name => ({
      company_id: companyId,
      name
    }))

    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .insert(departmentsToInsert)
      .select()

    if (departmentsError) {
      throw new Error(`Error creando departamentos: ${departmentsError.message}`)
    }
    console.log(`✅ ${departments?.length || 0} departamentos creados`)

    // 4. Crear empleados con nombres bíblicos
    console.log('👥 Paso 4: Creando empleados...')
    const employees = await crearEmpleadosBiblicos(supabase, companyId, data.empleados, departments, schedules)
    console.log(`✅ ${employees.length} empleados creados`)

    // 5. Crear usuario Auth y perfil
    console.log('👤 Paso 5: Creando usuario Auth...')
    const genericPassword = `SISU${Date.now().toString().slice(-6)}`
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: data.contactoEmail,
      password: genericPassword,
      email_confirm: true,
      user_metadata: {
        company_id: companyId,
        role: 'company_admin',
        full_name: data.nombre
      }
    })

    if (authError || !authUser.user) {
      console.error('⚠️ Error creando usuario Auth:', authError)
      // Continuar sin usuario Auth
    } else {
      console.log('✅ Usuario Auth creado:', authUser.user.id)

      // Crear perfil de usuario
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{
          id: authUser.user.id,
          company_id: companyId,
          role: 'company_admin',
          permissions: {
            dashboard: true,
            employees: true,
            departments: true,
            attendance: true,
            leave: true,
            payroll: true,
            reports: true,
            gamification: true,
            settings: true
          }
        }])

      if (profileError) {
        console.error('⚠️ Error creando perfil de usuario:', profileError)
      } else {
        console.log('✅ Perfil de usuario creado')
      }

      // Enviar correo de bienvenida
      await enviarCorreoBienvenida({
        email: data.contactoEmail,
        nombre: data.nombre,
        empresa: data.empresa,
        password: genericPassword,
        loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'}/app/login`
      })
    }

    // 6. Crear registro en trial_access_users
    const { error: trialAccessError } = await supabase
      .from('trial_access_users')
      .insert([{
        tenant_id: data.tenant_id,
        company_id: companyId,
        email: data.contactoEmail,
        nombre: data.nombre,
        empresa_solicitante: data.empresa,
        empleados_solicitados: data.empleados,
        is_active: true
      }])

    if (trialAccessError) {
      console.error('⚠️ Error creando trial_access_users:', trialAccessError)
    } else {
      console.log('✅ trial_access_users creado exitosamente')
    }

    return {
      success: true,
      data: {
        company: newCompany,
        employees,
        departments,
        schedules,
        authUser: authUser?.user,
        password: genericPassword
      }
    }

  } catch (error) {
    console.error('❌ Error en crearEntornoTrial:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

// Función auxiliar para crear empleados con nombres bíblicos
async function crearEmpleadosBiblicos(
  supabase: any,
  companyId: string,
  cantidad: number,
  departments: any[],
  schedules: any[]
): Promise<any[]> {
  const nombresBiblicos = [
    'Abraham', 'Isaac', 'Jacob', 'Moisés', 'Josué', 'David', 'Salomón', 'Elías', 'Eliseo', 'Daniel',
    'José', 'Jonás', 'Noé', 'Job', 'Samuel', 'Isaías', 'Jeremías', 'Ezequiel', 'Oseas', 'Joel',
    'Amós', 'Abdías', 'Miqueas', 'Nahúm', 'Habacuc', 'Sofonías', 'Ageo', 'Zacarías', 'Malaquías', 'Pedro',
    'Juan', 'Santiago', 'Andrés', 'Felipe', 'Tomás', 'Bartolomé', 'Mateo', 'Simón', 'Judas', 'Pablo',
    'Timoteo', 'Tito', 'Bernabé', 'Lucas', 'Marcos'
  ]

  const apellidos = [
    'Hernández', 'García', 'Martínez', 'López', 'González',
    'Pérez', 'Rodríguez', 'Sánchez', 'Ramírez', 'Flores'
  ]

  const employees = []
  const now = nowInHonduras()

  for (let i = 0; i < cantidad; i++) {
    const nombreIndex = i % nombresBiblicos.length
    const apellidoIndex = i % apellidos.length
    const nombre = nombresBiblicos[nombreIndex]
    const apellido = apellidos[apellidoIndex]
    const fullName = `${nombre} ${apellido}`
    
    const dni = `${String(1000 + i).padStart(4, '0')}-${String(2000 + i).padStart(4, '0')}-${String(30000 + i).padStart(5, '0')}`
    const departmentIndex = i % (departments?.length || 1)
    const scheduleIndex = i % (schedules?.length || 1)
    
    const hireDate = new Date(now)
    hireDate.setDate(hireDate.getDate() - (i % 12) * 15)

    const email = `${nombre.toLowerCase().replace(/[áéíóú]/g, (m) => {
      const map: any = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' }
      return map[m]
    })}.${apellido.toLowerCase().replace(/[áéíóú]/g, (m) => {
      const map: any = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' }
      return map[m]
    })}@demo.local`

    employees.push({
      company_id: companyId,
      department_id: departments?.[departmentIndex]?.id || null,
      work_schedule_id: schedules?.[scheduleIndex]?.id || null,
      employee_code: `EMP-${String(i + 1).padStart(3, '0')}`,
      dni,
      name: fullName,
      email,
      phone: '9999-0000',
      role: 'employee',
      base_salary: 8000 + ((i % 5) * 500),
      hire_date: hireDate.toISOString().split('T')[0],
      status: 'active'
    })
  }

  const { data: createdEmployees, error: employeesError } = await supabase
    .from('employees')
    .insert(employees)
    .select()

  if (employeesError) {
    throw new Error(`Error creando empleados: ${employeesError.message}`)
  }

  return createdEmployees || []
}

// Función auxiliar para enviar correo de bienvenida
async function enviarCorreoBienvenida(data: {
  email: string
  nombre: string
  empresa: string
  password: string
  loginUrl: string
}) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.log('⚠️ RESEND_API_KEY no configurado, saltando envío de correo de bienvenida')
      return
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a SISU</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .credentials { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 2px solid #667eea; }
          .credential-row { margin: 15px 0; }
          .label { font-weight: bold; color: #667eea; }
          .value { font-family: monospace; font-size: 16px; color: #333; background: #f0f0f0; padding: 8px; border-radius: 4px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Bienvenido a SISU!</h1>
            <p>Empresa: <strong>${data.empresa}</strong></p>
          </div>
          
          <div class="content">
            <h2>¡Hola ${data.nombre}!</h2>
            <p>Tu entorno de prueba SISU está listo y funcionando. Ya puedes empezar a explorar todas las funcionalidades.</p>
            
            <div class="credentials">
              <h3 style="color: #667eea; margin-top: 0;">📧 Tus credenciales de acceso:</h3>
              <div class="credential-row">
                <div class="label">Email:</div>
                <div class="value">${data.email}</div>
              </div>
              <div class="credential-row">
                <div class="label">Contraseña:</div>
                <div class="value">${data.password}</div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl}" class="button">🚀 Iniciar Sesión</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong> Por favor, cambia tu contraseña después de iniciar sesión por primera vez.
            </div>
            
            <div style="background: #e8f4fd; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h4>📱 ¿Necesitas ayuda?</h4>
              <p>Responde a este email o escríbenos por WhatsApp al <strong>+504 9470-7007</strong></p>
            </div>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h4>⏰ Tu trial expira en ${TRIAL_CONFIG.DURATION_DAYS} día${TRIAL_CONFIG.DURATION_DAYS > 1 ? 's' : ''}</h4>
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

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM || 'SISU <noreply@humanosisu.net>',
      to: data.email,
      subject: `🎉 ¡Bienvenido a SISU! - ${data.empresa}`,
      html: emailHtml
    })

    console.log('✅ Correo de bienvenida enviado exitosamente:', result)
  } catch (error) {
    console.error('❌ Error enviando correo de bienvenida:', error)
    // No fallar todo el proceso si el correo falla
  }
}

// Funciones auxiliares para manipular horas
function subtractMinutes(timeStr: string, minutes: number): string {
  const [hours, mins] = timeStr.split(':').map(Number)
  const totalMinutes = hours * 60 + mins - minutes
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function addMinutes(timeStr: string, minutes: number): string {
  const [hours, mins] = timeStr.split(':').map(Number)
  const totalMinutes = hours * 60 + mins + minutes
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
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
                    <h4>⏰ Tu trial expira en ${TRIAL_CONFIG.DURATION_DAYS} día${TRIAL_CONFIG.DURATION_DAYS > 1 ? 's' : ''}</h4>
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
      submitted_at: getHondurasTimestamp()
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
