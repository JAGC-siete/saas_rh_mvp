import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../lib/supabase/server'
import { getHondurasTimestamp, nowInHonduras } from '../../lib/timezone'
import { randomUUID } from 'crypto'
import { TRIAL_CONFIG } from '../../lib/config/trial'
import {
  currencyForCountryCode,
  ianaTimezoneForCountryCode,
  isCountryCode,
  type CountryCode,
} from '../../lib/country/supported'
import { normalizeSoftPhone } from '../../lib/privacy'
import { getResendFromContact } from '../../lib/resend-from'
import {
  parseMetaTrackingPayload,
  sendMetaWebsiteConversionFireAndForget,
} from '../../lib/analytics/metaCapiServer'
import { enrollMarketingLead } from '../../lib/marketing/enroll-lead'
import {
  buildSisuTrialAccessEmailHtml,
  getSisuTrialAccessEmailSubject,
} from '../../lib/emails/sisu-trial-access-html'

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
  /** ISO 3166-1 alpha-3: HND | SLV | GTM — determina nómina, festivos y zona horaria de la empresa trial */
  countryCode: string
  referralCode?: string // Add referral code
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
      aceptaTrial,
      countryCode: countryCodeRaw,
      referralCode // Destructure referral code
    }: ActivationData = req.body

    const countryCandidate =
      typeof countryCodeRaw === 'string' ? countryCodeRaw.trim().toUpperCase() : ''
    if (!isCountryCode(countryCandidate)) {
      return res.status(400).json({
        error: 'Seleccioná un país válido: Honduras (HND), El Salvador (SLV) o Guatemala (GTM).',
      })
    }
    const countryCode: CountryCode = countryCandidate

    console.log('📝 Datos recibidos:', {
      empleados,
      empresa,
      nombre,
      contactoWhatsApp,
      contactoEmail,
      departamentos,
      aceptaTrial,
      countryCode,
      referralCode,
    })

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

    // Validación suave de WhatsApp (global): permitir cualquier código de país y formato razonable
    if (contactoWhatsApp && contactoWhatsApp.trim()) {
      const normalized = normalizeSoftPhone(contactoWhatsApp)
      if (!normalized) {
        return res.status(400).json({
          error: '📱 Número de WhatsApp inválido. Incluye el código de país y al menos 7 dígitos.',
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
    const validacionEmail = await verificarEmailDuplicado(supabase, contactoEmail)
    
    if (!validacionEmail.puedeContinuar) {
      return res.status(409).json({ 
        error: validacionEmail.razon || 'Este email ya tiene un trial activo. Por favor, utiliza otro email o espera a que expire tu trial actual.'
      })
    }

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
        notas: `Trial activado automáticamente. País: ${countryCode}. Empleados: ${empleados}, Departamentos: ${departamentos}`,
      }])
      .select()

    if (dbError) {
      console.error('❌ Database error:', dbError)
      return res.status(500).json({ error: 'Error guardando datos en la base de datos' })
    }

    console.log('✅ Datos guardados exitosamente en activaciones')

    void enrollMarketingLead({
      email: contactoEmail.trim().toLowerCase(),
      source: 'activar',
    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.warn('⚠️ Marketing enroll failed after activar (non-blocking):', message)
    })

    // Crear entorno de trial (Company + Owner + Demo data)
    console.log('🏗️ Creando entorno de trial...')
    const trialEnvironment = await crearEntornoTrial(supabase, {
      tenant_id,
      empresa: empresa.trim(),
      nombre: nombre || 'Contacto no especificado',
      contactoEmail,
      empleados,
      departamentos,
      countryCode,
      referralCode // Pass referral code
    })

    if (trialEnvironment.success) {
      console.log('✅ Entorno de trial creado exitosamente:', trialEnvironment.data)
    } else {
      console.error('❌ Error creando entorno de trial:', trialEnvironment.error)
      // No fallar todo el proceso, pero logear el error
    }

    // Disparar webhook a canal #activaciones
    console.log('🔗 Disparando webhook...')
    await dispararWebhookActivaciones({
      empresa: empresa || 'Empresa no especificada',
      nombre: nombre || 'Contacto no especificado',
      contactoWhatsApp: contactoWhatsApp || 'No especificado',
      contactoEmail,
      empleados,
      tenant_id,
      status: 'trial_pending_data',
      country_code: countryCode,
    })

    // Enviar email de resumen con vCard
    console.log('📧 Enviando email de resumen con vCard...')
    await enviarEmailResumenRegistro({
      nombre: nombre || 'Contacto no especificado',
      empresa: empresa || 'Empresa no especificada',
      email: contactoEmail,
      whatsapp: contactoWhatsApp || null,
      empleados,
      tenant_id,
      country_code: countryCode,
    })

    console.log('🎉 Activación completada exitosamente')

    const metaTracking = parseMetaTrackingPayload(req.body)
    sendMetaWebsiteConversionFireAndForget({
      req,
      eventName: 'StartTrial',
      tracking: metaTracking,
      userData: {
        email: contactoEmail,
        phone: contactoWhatsApp || undefined,
        firstName: nombre || undefined,
      },
      customData: {
        content_name: 'activar',
        content_category: countryCode,
        value: 0,
        currency: 'USD',
        status: true,
      },
    })

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
  countryCode: CountryCode
  referralCode?: string // Add referral code to function signature
}) {
  try {
    console.log('🏗️ Creando entorno completo de trial para:', data.empresa, 'país:', data.countryCode)
    
    // 0. Check for referral code
    let affiliateId: string | null = null
    if (data.referralCode) {
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .select('id')
        .eq('referral_code', data.referralCode)
        .eq('status', 'approved')
        .single()

      if (affiliateError) {
        console.warn('⚠️ Error al buscar afiliado:', affiliateError.message)
      }
      if (affiliate) {
        affiliateId = affiliate.id
        console.log(`🔗 Afiliado encontrado: ${affiliateId}`)
      }
    }

    // 1. Crear company única (country_code + timezone alimentan nómina, labor_laws y asistencia por país)
    console.log('📦 Paso 1: Creando company...')
    const companyId = randomUUID()
    const subdomain = `trial-${Date.now().toString(36)}`
    const tz = ianaTimezoneForCountryCode(data.countryCode)
    const currency = currencyForCountryCode(data.countryCode)

    const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert([{
        id: companyId,
        name: data.empresa,
        subdomain,
          plan_type: 'trial',
          country_code: data.countryCode,
          timezone: tz,
          settings: {
            trial_activated_at: getHondurasTimestamp(),
          trial_employee_limit: data.empleados,
            timezone: tz,
            currency,
            language: 'es',
          },
          is_active: true,
          referred_by_affiliate_id: affiliateId // Set affiliate ID
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
      timezone: tz
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

      // Permisos correctos para company_admin según el formato requerido
      const companyAdminPermissions = {
        can_view_all: true,
        can_manage_all: true,
        manage_payroll: true,
        manage_reports: true,
        manage_settings: true,
        manage_employees: true,
        can_manage_employees: true
      }

      // Usar UPSERT para asegurar que el perfil se cree/actualice correctamente
      // Esto es importante porque puede haber un trigger que cree un perfil por defecto
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: authUser.user.id,
          company_id: companyId, // ✅ Asegurar que el company_id se asigne correctamente
          role: 'company_admin', // ✅ Asegurar que el rol sea company_admin
          permissions: companyAdminPermissions, // ✅ Permisos correctos
          is_active: true
        }, {
          onConflict: 'id'
        })

      if (profileError) {
        console.error('⚠️ Error creando/actualizando perfil de usuario:', profileError)
        console.error('⚠️ Detalles del error:', JSON.stringify(profileError, null, 2))
      } else {
        // Log exitoso sin exponer información sensible
        console.log('✅ Perfil de usuario creado/actualizado correctamente')
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

    const emailHtml = buildSisuTrialAccessEmailHtml({
      variant: 'trial_welcome',
      nombre: data.nombre,
      email: data.email,
      password: data.password,
      loginUrl: data.loginUrl,
    })

    const result = await resend.emails.send({
      from: getResendFromContact(),
      to: data.email,
      subject: getSisuTrialAccessEmailSubject({ variant: 'trial_welcome', empresa: data.empresa }),
      html: emailHtml,
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

// Función eliminada: enviarNotificacionesTrial
// Razón: El usuario recibía dos correos (trial + bienvenida con credenciales)
// Solución: Solo se envía un correo de bienvenida con credenciales después de crear el entorno
// Esto mejora la experiencia del usuario al evitar correos duplicados y confusión

async function dispararWebhookActivaciones(data: {
  empresa: string
  nombre: string
  contactoWhatsApp: string
  contactoEmail: string
  empleados: number
  tenant_id: string
  status: string
  country_code: CountryCode
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
      country_code: data.country_code,
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

function getWhatsAppCallingCode(countryCode: CountryCode): string {
  if (countryCode === 'SLV') return '503'
  if (countryCode === 'GTM') return '502'
  return '504'
}

function normalizeWhatsAppForWaMe(
  whatsapp: string,
  countryCode: CountryCode
): string {
  const digits = whatsapp.replace(/\D/g, '')
  const calling = getWhatsAppCallingCode(countryCode)
  if (digits.startsWith(calling)) return digits
  return `${calling}${digits}`
}

const REGISTRO_FOLLOW_UP_WHATSAPP_MESSAGE =
  'Ya hiciste lo más difícil. En serio. Tu sistema SISU ya está activo. El 90% de las empresas se traban ahí. El siguiente paso para completar la automatización: digitalizar la asistencia. Hagámoslo hoy.'

// Función para generar vCard (formato de contacto)
function generarVCard(data: {
  nombre: string
  empresa: string
  email: string
  whatsapp: string | null
  countryCode?: CountryCode
}): string {
  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${data.nombre}`,
    `ORG:${data.empresa}`,
    `EMAIL;TYPE=INTERNET:${data.email}`,
  ]

  if (data.whatsapp) {
    const phone = data.whatsapp.replace(/[-\s]/g, '')
    const cc = data.countryCode || 'HND'
    const calling =
      cc === 'SLV' ? '503' : cc === 'GTM' ? '502' : '504'
    const formattedPhone = phone.startsWith('+')
      ? phone
      : phone.startsWith(calling)
        ? `+${phone}`
        : `+${calling}${phone}`
    vcard.push(`TEL;TYPE=CELL:${formattedPhone}`)
  }

  vcard.push('END:VCARD')
  return vcard.join('\n')
}

// Función para enviar email de resumen con vCard adjunto
async function enviarEmailResumenRegistro(data: {
  nombre: string
  empresa: string
  email: string
  whatsapp: string | null
  empleados: number
  tenant_id: string
  country_code: CountryCode
}) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    const emailDestino = process.env.REGISTRO_NOTIFICATION_EMAIL || 'jorge7gomez@gmail.com'
    
    if (!apiKey) {
      console.log('⚠️ RESEND_API_KEY no configurado, saltando envío de email de resumen')
      return
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    // Generar vCard
    const vcardContent = generarVCard({
      nombre: data.nombre,
      empresa: data.empresa,
      email: data.email,
      whatsapp: data.whatsapp,
      countryCode: data.country_code,
    })

    // Convertir vCard a buffer para adjuntarlo
    const vcardBuffer = Buffer.from(vcardContent, 'utf-8')

    const whatsappContactUrl = data.whatsapp
      ? `https://wa.me/${normalizeWhatsAppForWaMe(data.whatsapp, data.country_code)}?text=${encodeURIComponent(REGISTRO_FOLLOW_UP_WHATSAPP_MESSAGE)}`
      : null

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Nuevo Registro - SISU</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .info-box {
              background: white;
              border-left: 4px solid #667eea;
              padding: 20px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info-row {
              margin: 10px 0;
            }
            .label {
              font-weight: bold;
              color: #555;
            }
            .value {
              color: #333;
            }
            .vcard-note {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 Nuevo Registro en SISU</h1>
            <p>Se ha registrado un nuevo usuario para trial</p>
          </div>
          <div class="content">
            <div class="info-box">
              <div class="info-row">
                <span class="label">👤 Nombre:</span>
                <span class="value">${data.nombre}</span>
              </div>
              <div class="info-row">
                <span class="label">🏢 Empresa:</span>
                <span class="value">${data.empresa}</span>
              </div>
              <div class="info-row">
                <span class="label">📧 Email:</span>
                <span class="value">${data.email}</span>
              </div>
              ${data.whatsapp ? `
              <div class="info-row">
                <span class="label">📱 WhatsApp:</span>
                <span class="value">${data.whatsapp}</span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="label">👥 Empleados:</span>
                <span class="value">${data.empleados}</span>
              </div>
              <div class="info-row">
                <span class="label">🌎 País (nómina):</span>
                <span class="value">${data.country_code}</span>
              </div>
              <div class="info-row">
                <span class="label">🆔 Tenant ID:</span>
                <span class="value">${data.tenant_id}</span>
              </div>
            </div>
            <div class="vcard-note">
              <strong>📎 Archivo vCard adjunto</strong>
              <p>Se ha adjuntado un archivo de contacto (.vcf) que puedes descargar e importar directamente a tu libreta de contactos en el celular.</p>
              <p><strong>Para importar en iPhone:</strong> Abre el archivo adjunto y toca "Agregar a contactos"</p>
              <p><strong>Para importar en Android:</strong> Descarga el archivo y ábrelo con la app de Contactos</p>
            </div>
          ${whatsappContactUrl ? `<div style="text-align: center; margin: 20px 0;"><a href="${whatsappContactUrl}" style="display: inline-block; padding: 12px 24px; background-color: #25D366; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-family: Arial, sans-serif;">💬 Contactar vía WhatsApp</a></div>` : ''}
</div>
        </body>
      </html>
    `

    const result = await resend.emails.send({
      from: getResendFromContact(),
      to: emailDestino,
      subject: `📋 Nuevo Registro: ${data.empresa} - ${data.nombre}`,
      html: emailHtml,
      attachments: [
        {
          filename: `${data.nombre.replace(/[^a-z0-9]/gi, '_')}_${data.empresa.replace(/[^a-z0-9]/gi, '_')}.vcf`,
          content: vcardBuffer.toString('base64'),
        }
      ]
    })

    if ((result as any)?.error) {
      console.error('❌ Error enviando email de resumen:', (result as any).error)
      return
    }

    console.log('✅ Email de resumen con vCard enviado exitosamente:', (result as any)?.id)

  } catch (error) {
    console.error('❌ Error enviando email de resumen:', error)
    // No fallar todo el proceso si el email falla
  }
}
