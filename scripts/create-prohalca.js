const { createAdminClient } = require('../lib/supabase/server')

async function createProhalcaCompany() {
  const supabase = createAdminClient()
  
  try {
    console.log('🚀 Creando empresa PROHALCA...')
    
    // 1. Crear la empresa
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: 'Procesadora Hondureña de Alimentos de Camarón S.A.',
        subdomain: 'prohalca',
        plan_type: 'premium',
        is_active: true,
        settings: {
          currency: 'HNL',
          timezone: 'America/Tegucigalpa',
          language: 'es',
          clientType: 'prohalca'
        }
      })
      .select()
      .single()

    if (companyError) {
      throw companyError
    }

    console.log('✅ Empresa creada:', company.id)

    // 2. Crear usuario admin para Nancy
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'nanurrutia@prohalca.com',
      password: 'Prohalca2025!',
      email_confirm: true,
      user_metadata: {
        company_id: company.id,
        role: 'company_admin',
        client_type: 'prohalca'
      }
    })

    if (authError) {
      // Rollback: delete the company
      await supabase.from('companies').delete().eq('id', company.id)
      throw authError
    }

    console.log('✅ Usuario admin creado:', authUser.user.id)

    // 3. Crear perfil de usuario
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        company_id: company.id,
        role: 'company_admin',
        is_active: true,
        permissions: {
          manage_employees: true,
          manage_payroll: true,
          manage_reports: true,
          manage_settings: true
        }
      })

    if (profileError) {
      // Rollback: delete auth user and company
      await supabase.auth.admin.deleteUser(authUser.user.id)
      await supabase.from('companies').delete().eq('id', company.id)
      throw profileError
    }

    console.log('✅ Perfil de usuario creado')

    // 4. Crear departamentos específicos de PROHALCA
    const departments = [
      {
        company_id: company.id,
        name: 'Producción / Planta',
        description: 'Operadores de banda, montacargas, filtración, envase, recepción de bines, patio, aseo',
        metadata: {
          departmentId: 'produccion',
          salaryRange: { min: 6400, max: 7000 },
          shifts: ['diurno', 'nocturno', 'doble_turno']
        }
      },
      {
        company_id: company.id,
        name: 'Mantenimiento / Infraestructura',
        description: 'Eléctrico, mecánico, laguna, área verde, mantenimiento general',
        metadata: {
          departmentId: 'mantenimiento',
          salaryRange: { min: 6400, max: 10800 },
          shifts: ['diurno', 'guardia']
        }
      },
      {
        company_id: company.id,
        name: 'Administración / Gestión',
        description: 'Asistentes, auxiliares, contabilidad, RRHH, vigilancia, motorista, aseadora',
        metadata: {
          departmentId: 'administracion',
          salaryRange: { min: 6400, max: 14600 },
          shifts: ['estandar']
        }
      },
      {
        company_id: company.id,
        name: 'Alta Dirección',
        description: 'Jefes de planta, gerentes, subgerentes, director ejecutivo',
        metadata: {
          departmentId: 'direccion',
          salaryRange: { min: 15000, max: 78000 },
          shifts: ['fijo']
        }
      }
    ]

    const { data: newDepts, error: deptError } = await supabase
      .from('departments')
      .insert(departments)
      .select()

    if (deptError) {
      throw deptError
    }

    console.log('✅ Departamentos creados:', newDepts.length)

    // 5. Crear horarios específicos de PROHALCA
    const shifts = [
      {
        company_id: company.id,
        name: 'Turno Diurno',
        monday_start: '06:00',
        monday_end: '18:00',
        tuesday_start: '06:00',
        tuesday_end: '18:00',
        wednesday_start: '06:00',
        wednesday_end: '18:00',
        thursday_start: '06:00',
        thursday_end: '18:00',
        friday_start: '06:00',
        friday_end: '18:00',
        saturday_start: '06:00',
        saturday_end: '18:00',
        sunday_start: '06:00',
        sunday_end: '18:00',
        break_duration: 60,
        timezone: 'America/Tegucigalpa',
        metadata: {
          shiftId: 'diurno',
          hours: 12,
          overtimeRate: 1.5,
          nightShiftBonus: 0
        }
      },
      {
        company_id: company.id,
        name: 'Turno Nocturno',
        monday_start: '18:00',
        monday_end: '06:00',
        tuesday_start: '18:00',
        tuesday_end: '06:00',
        wednesday_start: '18:00',
        wednesday_end: '06:00',
        thursday_start: '18:00',
        thursday_end: '06:00',
        friday_start: '18:00',
        friday_end: '06:00',
        saturday_start: '18:00',
        sunday_end: '06:00',
        break_duration: 60,
        timezone: 'America/Tegucigalpa',
        metadata: {
          shiftId: 'nocturno',
          hours: 12,
          overtimeRate: 1.5,
          nightShiftBonus: 0.25
        }
      },
      {
        company_id: company.id,
        name: 'Doble Turno',
        monday_start: '06:00',
        monday_end: '06:00',
        tuesday_start: '06:00',
        tuesday_end: '06:00',
        wednesday_start: '06:00',
        wednesday_end: '06:00',
        thursday_start: '06:00',
        thursday_end: '06:00',
        friday_start: '06:00',
        friday_end: '06:00',
        saturday_start: '06:00',
        saturday_end: '06:00',
        sunday_start: '06:00',
        sunday_end: '06:00',
        break_duration: 120,
        timezone: 'America/Tegucigalpa',
        metadata: {
          shiftId: 'doble_turno',
          hours: 24,
          overtimeRate: 2.0,
          nightShiftBonus: 0
        }
      },
      {
        company_id: company.id,
        name: 'Jornada Estándar',
        monday_start: '07:00',
        monday_end: '15:00',
        tuesday_start: '07:00',
        tuesday_end: '15:00',
        wednesday_start: '07:00',
        wednesday_end: '15:00',
        thursday_start: '07:00',
        thursday_end: '15:00',
        friday_start: '07:00',
        friday_end: '15:00',
        saturday_start: '07:00',
        saturday_end: '15:00',
        sunday_start: '07:00',
        sunday_end: '15:00',
        break_duration: 60,
        timezone: 'America/Tegucigalpa',
        metadata: {
          shiftId: 'estandar',
          hours: 8,
          overtimeRate: 1.5,
          nightShiftBonus: 0
        }
      },
      {
        company_id: company.id,
        name: 'Horario Fijo',
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
        saturday_end: '17:00',
        sunday_start: '08:00',
        sunday_end: '17:00',
        break_duration: 60,
        timezone: 'America/Tegucigalpa',
        metadata: {
          shiftId: 'fijo',
          hours: 9,
          overtimeRate: 1.5,
          nightShiftBonus: 0
        }
      }
    ]

    const { data: newShifts, error: shiftError } = await supabase
      .from('work_schedules')
      .insert(shifts)
      .select()

    if (shiftError) {
      throw shiftError
    }

    console.log('✅ Horarios creados:', newShifts.length)

    // 6. Crear log de auditoría
    await supabase
      .from('audit_logs')
      .insert({
        company_id: company.id,
        user_id: authUser.user.id,
        action: 'company_created',
        details: {
          company_name: company.name,
          admin_email: 'nanurrutia@prohalca.com',
          departments_count: newDepts.length,
          shifts_count: newShifts.length
        }
      })

    console.log('✅ Log de auditoría creado')

    console.log('🎉 PROHALCA creada exitosamente!')
    console.log('📧 Email:', 'nanurrutia@prohalca.com')
    console.log('🔑 Contraseña:', 'Prohalca2025!')
    console.log('🏢 Empresa:', company.name)
    console.log('🌐 Subdominio:', company.subdomain)
    console.log('👥 Departamentos:', newDepts.length)
    console.log('⏰ Horarios:', newShifts.length)

    return {
      success: true,
      company: {
        id: company.id,
        name: company.name,
        subdomain: company.subdomain
      },
      admin: {
        email: 'nanurrutia@prohalca.com',
        password: 'Prohalca2025!'
      },
      departments: newDepts.length,
      shifts: newShifts.length
    }

  } catch (error) {
    console.error('❌ Error creando PROHALCA:', error)
    throw error
  }
}

// Ejecutar
createProhalcaCompany()
  .then(() => {
    console.log('✅ Script completado exitosamente')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Error:', error)
    process.exit(1)
  })
