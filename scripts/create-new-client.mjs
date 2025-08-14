#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar variables de entorno
config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  console.log('Asegúrate de que .env.local tenga:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Arrays de datos para generar contenido realista
const BIBLICAL_NAMES = [
  'David González', 'María Rodríguez', 'José Martínez', 'Ana López', 
  'Daniel Hernández', 'Sara Jiménez', 'Pedro Morales', 'Ruth Vargas',
  'Abraham Castillo', 'Rebeca Flores', 'Isaac Torres', 'Ester Ramírez',
  'Jacob Méndez', 'Raquel Gutiérrez', 'Moisés Aguilar', 'Débora Cruz',
  'Samuel Herrera', 'Noemí Guerrero', 'Salomón Ruiz', 'Judith Peña',
  'Ezequiel Soto', 'Miriam Castro', 'Jeremías Ortiz', 'Abigail Ramos',
  'Eliseo Moreno', 'Lidia Fuentes', 'Nehemías Vega', 'Priscila Campos'
]

const FOOTBALL_TEAMS = [
  'Real Madrid', 'Barcelona', 'Bayern Munich', 'Liverpool', 'Manchester City',
  'Chelsea', 'Arsenal', 'Juventus', 'AC Milan', 'Inter Milan',
  'Paris Saint-Germain', 'Ajax', 'Borussia Dortmund', 'Atlético Madrid',
  'Manchester United', 'Tottenham', 'Napoli', 'AS Roma', 'Valencia CF'
]

const POSITIONS = [
  'Gerente de Ventas', 'Analista de Marketing', 'Contador', 'Secretaria',
  'Supervisor de Producción', 'Asistente Administrativo', 'Coordinador de Logística',
  'Especialista en RH', 'Técnico de Sistemas', 'Ejecutivo de Cuentas',
  'Coordinador de Compras', 'Asistente de Gerencia', 'Analista Financiero',
  'Coordinador de Inventario', 'Especialista en Calidad', 'Operario de Producción'
]

const BANKS = [
  'Banco Atlántida', 'FICOHSA', 'Banco Occidente', 'BAC Honduras',
  'Banco de Los Trabajadores', 'Banco Azteca', 'Davivienda', 'Banrural'
]

// Función para generar DNI aleatorio
function generateDNI() {
  const year = Math.floor(Math.random() * 30) + 1980 // Años 1980-2009
  const month = Math.floor(Math.random() * 12) + 1
  const day = Math.floor(Math.random() * 28) + 1
  const sequence = Math.floor(Math.random() * 90000) + 10000
  
  return `0801-${year}-${sequence.toString().padStart(5, '0')}`
}

// Función para generar número de cuenta bancaria
function generateBankAccount() {
  return Math.floor(Math.random() * 900000000) + 100000000
}

// Función para generar salario aleatorio
function generateSalary() {
  return Math.floor(Math.random() * 30000) + 15000 // Entre 15,000 y 45,000
}

// Función para generar email basado en el nombre
function generateEmail(name, companyName) {
  const firstName = name.split(' ')[0].toLowerCase()
  const lastName = name.split(' ')[1].toLowerCase()
  const domain = companyName.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
  
  return `${firstName}.${lastName}@${domain}.com`
}

// Función principal para crear cliente
async function createNewClient(clientData) {
  const {
    companyName,
    employeeCount,
    departmentCount,
    adminName = 'Administrador Sistema',
    adminEmail = `admin@${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
    adminPassword = 'Admin123!',
    timezone = 'America/Tegucigalpa'
  } = clientData

  console.log('🏢 Creando nuevo cliente:', companyName)
  console.log('👥 Empleados:', employeeCount)
  console.log('🏬 Departamentos:', departmentCount)
  console.log('👤 Admin:', adminName, '(' + adminEmail + ')')
  console.log('=' .repeat(50))

  try {
    // 1. CREAR EMPRESA
    console.log('1️⃣ Creando empresa...')
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([{
        name: companyName,
        subdomain: companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        plan_type: 'basic',
        settings: {
          timezone,
          currency: 'HNL',
          language: 'es',
          work_week_days: 5,
          fiscal_year_start: '01-01'
        },
        is_active: true
      }])
      .select()
      .single()

    if (companyError) throw companyError
    console.log('✅ Empresa creada:', company.name)

    // 2. CREAR HORARIO DE TRABAJO
    console.log('2️⃣ Creando horario de trabajo...')
    const { data: workSchedule, error: scheduleError } = await supabase
      .from('work_schedules')
      .insert([{
        company_id: company.id,
        name: 'Horario Regular',
        monday_start: '08:00:00',
        monday_end: '17:00:00',
        tuesday_start: '08:00:00', 
        tuesday_end: '17:00:00',
        wednesday_start: '08:00:00',
        wednesday_end: '17:00:00', 
        thursday_start: '08:00:00',
        thursday_end: '17:00:00',
        friday_start: '08:00:00',
        friday_end: '17:00:00',
        saturday_start: '08:00:00',
        saturday_end: '12:00:00',
        sunday_start: null,
        sunday_end: null,
        break_duration: 60,
        timezone
      }])
      .select()
      .single()

    if (scheduleError) throw scheduleError
    console.log('✅ Horario creado:', workSchedule.name)

    // 3. CREAR DEPARTAMENTOS
    console.log('3️⃣ Creando departamentos...')
    const selectedTeams = FOOTBALL_TEAMS.slice(0, departmentCount)
    const departmentPromises = selectedTeams.map(teamName => 
      supabase.from('departments').insert([{
        company_id: company.id,
        name: teamName,
        description: `Departamento ${teamName}`,
        manager_id: null // Se asignará después
      }]).select().single()
    )

    const departmentResults = await Promise.all(departmentPromises)
    const departments = departmentResults.map(result => {
      if (result.error) throw result.error
      return result.data
    })
    
    console.log('✅ Departamentos creados:', departments.length)

    // 4. CREAR USUARIO ADMINISTRADOR EN SUPABASE AUTH
    console.log('4️⃣ Creando usuario administrador...')
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true
    })

    if (authError) throw authError
    console.log('✅ Usuario auth creado:', authUser.user.email)

    // 5. CREAR EMPLEADOS
    console.log('5️⃣ Creando empleados...')
    const selectedNames = [...BIBLICAL_NAMES].sort(() => 0.5 - Math.random()).slice(0, employeeCount)
    
    const employees = []
    for (let i = 0; i < employeeCount; i++) {
      const name = selectedNames[i]
      const department = departments[i % departments.length]
      const isAdmin = i === 0 // Primer empleado es admin
      
      const employeeData = {
        company_id: company.id,
        department_id: department.id,
        work_schedule_id: workSchedule.id,
        employee_code: `EMP${(i + 1).toString().padStart(3, '0')}`,
        dni: generateDNI(),
        name: isAdmin ? adminName : name,
        email: isAdmin ? adminEmail : generateEmail(name, companyName),
        phone: `+504 ${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
        role: isAdmin ? 'company_admin' : (i < departments.length ? 'manager' : 'employee'),
        position: isAdmin ? 'Administrador General' : POSITIONS[Math.floor(Math.random() * POSITIONS.length)],
        base_salary: isAdmin ? 45000 : generateSalary(),
        hire_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        bank_name: BANKS[Math.floor(Math.random() * BANKS.length)],
        bank_account: generateBankAccount().toString()
      }

      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()
        .single()

      if (employeeError) throw employeeError
      employees.push(employee)
    }

    console.log('✅ Empleados creados:', employees.length)

    // 6. CREAR PERFIL DE USUARIO ADMIN
    console.log('6️⃣ Creando perfil de usuario administrador...')
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([{
        id: authUser.user.id,
        company_id: company.id,
        employee_id: employees[0].id, // Primer empleado es el admin
        role: 'company_admin',
        permissions: {
          employees: ['create', 'read', 'update', 'delete'],
          attendance: ['create', 'read', 'update', 'delete'],
          payroll: ['create', 'read', 'update', 'delete'],
          reports: ['create', 'read', 'update', 'delete'],
          settings: ['create', 'read', 'update', 'delete']
        },
        is_active: true
      }])

    if (profileError) throw profileError
    console.log('✅ Perfil de administrador creado')

    // 7. CREAR TIPOS DE PERMISOS
    console.log('7️⃣ Creando tipos de permisos...')
    const leaveTypes = [
      {
        company_id: company.id,
        name: 'Vacaciones',
        max_days_per_year: 15,
        is_paid: true,
        requires_approval: true,
        color: '#3498db'
      },
      {
        company_id: company.id,
        name: 'Enfermedad',
        max_days_per_year: 10,
        is_paid: true,
        requires_approval: false,
        color: '#e74c3c'
      },
      {
        company_id: company.id,
        name: 'Personal',
        max_days_per_year: 5,
        is_paid: false,
        requires_approval: true,
        color: '#f39c12'
      },
      {
        company_id: company.id,
        name: 'Paternidad/Maternidad',
        max_days_per_year: 30,
        is_paid: true,
        requires_approval: true,
        color: '#9b59b6'
      }
    ]

    const { error: leaveTypesError } = await supabase
      .from('leave_types')
      .insert(leaveTypes)

    if (leaveTypesError) throw leaveTypesError
    console.log('✅ Tipos de permisos creados:', leaveTypes.length)

    // 8. INICIALIZAR PUNTAJES DE GAMIFICACIÓN
    console.log('8️⃣ Inicializando sistema de gamificación...')
    const scorePromises = employees.map(employee => 
      supabase.from('employee_scores').insert([{
        employee_id: employee.id,
        company_id: company.id,
        total_points: Math.floor(Math.random() * 100), // Puntos iniciales aleatorios
        weekly_points: Math.floor(Math.random() * 50),
        monthly_points: Math.floor(Math.random() * 200),
        punctuality_streak: Math.floor(Math.random() * 10),
        early_arrival_count: Math.floor(Math.random() * 15),
        perfect_week_count: Math.floor(Math.random() * 5)
      }])
    )

    await Promise.all(scorePromises)
    console.log('✅ Puntajes de gamificación inicializados')

    // 9. ASIGNAR GERENTES A DEPARTAMENTOS
    console.log('9️⃣ Asignando gerentes a departamentos...')
    const managers = employees.filter(emp => emp.role === 'manager')
    for (let i = 0; i < Math.min(departments.length, managers.length); i++) {
      await supabase
        .from('departments')
        .update({ manager_id: managers[i].id })
        .eq('id', departments[i].id)
    }
    console.log('✅ Gerentes asignados')

    // RESUMEN FINAL
    console.log('\n' + '='.repeat(50))
    console.log('🎉 ¡CLIENTE CREADO EXITOSAMENTE!')
    console.log('='.repeat(50))
    console.log(`🏢 Empresa: ${company.name}`)
    console.log(`🆔 Company ID: ${company.id}`)
    console.log(`👥 Empleados: ${employees.length}`)
    console.log(`🏬 Departamentos: ${departments.length}`)
    console.log(`📧 Admin Email: ${adminEmail}`)
    console.log(`🔒 Admin Password: ${adminPassword}`)
    console.log(`🌐 Subdomain: ${company.subdomain}`)
    console.log('='.repeat(50))
    
    return {
      company,
      employees,
      departments,
      workSchedule,
      adminCredentials: {
        email: adminEmail,
        password: adminPassword,
        userId: authUser.user.id
      }
    }

  } catch (error) {
    console.error('❌ Error creando cliente:', error)
    throw error
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  // Verificar argumentos
  const [companyName, employeeCount, departmentCount] = process.argv.slice(2)
  
  if (!companyName || !employeeCount || !departmentCount) {
    console.log('📋 Uso: node create-new-client.mjs "Nombre Empresa" <empleados> <departamentos>')
    console.log('📋 Ejemplo: node create-new-client.mjs "Distribuidora La Ceiba" 10 3')
    process.exit(1)
  }

  const clientData = {
    companyName,
    employeeCount: parseInt(employeeCount),
    departmentCount: parseInt(departmentCount)
  }

  createNewClient(clientData)
    .then(result => {
      console.log('✅ Proceso completado exitosamente')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Error en el proceso:', error.message)
      process.exit(1)
    })
}

export { createNewClient }

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 🏆 Datos de ejemplo
const NOMBRES_BIBLICOS = [
  'Abraham', 'Isaac', 'Jacob', 'José', 'Moisés', 'Aarón', 'Josué', 'Samuel',
  'David', 'Salomón', 'Daniel', 'Ezequiel', 'Isaías', 'Jeremías', 'Joel',
  'Amós', 'Jonás', 'Micaías', 'Nehemías', 'Esdras', 'Gabriel', 'Miguel',
  'Rafael', 'Sara', 'Rebeca', 'Raquel', 'Lea', 'Miriam', 'Débora', 'Rut',
  'Esther', 'Ana', 'María', 'Elisabet', 'Marta', 'Magdalena', 'Priscila',
  'Lidia', 'Dorcas', 'Febe'
]

const APELLIDOS_HONDURENOS = [
  'García', 'Rodríguez', 'Martínez', 'López', 'Hernández', 'González',
  'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez',
  'Díaz', 'Reyes', 'Morales', 'Jiménez', 'Álvarez', 'Romero', 'Navarro',
  'Ruiz', 'Gutiérrez', 'Ortiz', 'Serrano', 'Molina', 'Castro', 'Vargas',
  'Ramos', 'Mendoza', 'Cruz', 'Aguilar', 'Delgado', 'Herrera', 'Medina'
]

const EQUIPOS_FUTBOL = [
  'Olimpia', 'Motagua', 'Real España', 'Marathon', 'Vida', 'Honduras Progreso',
  'Platense', 'Real Sociedad', 'UPN', 'Lobos UPNFM', 'Victoria', 'Juticalpa FC',
  'Real de Minas', 'Olancho FC', 'UPNFM', 'Parrillas One', 'Génesis',
  'Atlético Choloma', 'Atlético Pinares', 'Deportes Savio'
]

// 📧 Generar email corporativo
function generarEmail(nombre, apellido, empresa) {
  const nombreLimpio = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const apellidoLimpio = apellido.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const empresaLimpia = empresa.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${nombreLimpio}.${apellidoLimpio}@${empresaLimpia}.hn`
}

// 🆔 Generar DNI realista hondureño
function generarDNI() {
  // DNI hondureño: 4 dígitos + 8 dígitos (formato: 0801-1990-12345)
  const año = Math.floor(Math.random() * 30) + 1990 // 1990-2020
  const mes = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')
  const dia = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')
  const codigo = String(Math.floor(Math.random() * 9000) + 1000)
  const serial = String(Math.floor(Math.random() * 90000) + 10000)
  
  return `${codigo}-${año}-${serial}`
}

// 📱 Generar teléfono hondureño
function generarTelefono() {
  const prefijos = ['9', '8', '3', '2']
  const prefijo = prefijos[Math.floor(Math.random() * prefijos.length)]
  const numero = String(Math.floor(Math.random() * 9000000) + 1000000)
  return `${prefijo}${numero}`
}

// 💰 Generar salario realista
function generarSalario() {
  return Math.floor(Math.random() * 30000) + 15000 // 15,000 - 45,000
}

// 🏢 Crear empresa completa
async function crearEmpresaCompleta(config) {
  console.log('\n🚀 Iniciando creación de empresa completa...')
  console.log('=' .repeat(50))
  
  try {
    // 1. Crear la empresa
    console.log('\n1️⃣ Creando empresa...')
    const { data: empresa, error: empresaError } = await supabase
      .from('companies')
      .insert([{
        name: config.nombreEmpresa,
        email: config.emailEmpresa,
        phone: config.telefonoEmpresa,
        address: config.direccion || 'Tegucigalpa, Honduras',
        industry: config.industria || 'Servicios'
      }])
      .select()
    
    if (empresaError) throw empresaError
    const companyId = empresa[0].id
    console.log(`✅ Empresa creada: ${empresa[0].name} (ID: ${companyId})`)
    
    // 2. Crear departamentos
    console.log('\n2️⃣ Creando departamentos...')
    const departamentos = []
    const equiposSeleccionados = EQUIPOS_FUTBOL.sort(() => 0.5 - Math.random()).slice(0, config.numDepartamentos)
    
    for (const equipo of equiposSeleccionados) {
      const { data: dept, error: deptError } = await supabase
        .from('departments')
        .insert([{
          company_id: companyId,
          name: `Equipo ${equipo}`,
          description: `Departamento del equipo ${equipo}`
        }])
        .select()
      
      if (deptError) throw deptError
      departamentos.push(dept[0])
      console.log(`✅ Departamento creado: Equipo ${equipo}`)
    }
    
    // 3. Crear horarios de trabajo
    console.log('\n3️⃣ Creando horarios de trabajo...')
    const { data: horario, error: horarioError } = await supabase
      .from('work_schedules')
      .insert([{
        company_id: companyId,
        name: 'Horario Estándar',
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
        saturday_start: null,
        saturday_end: null,
        sunday_start: null,
        sunday_end: null
      }])
      .select()
    
    if (horarioError) throw horarioError
    console.log('✅ Horario de trabajo creado')
    
    // 4. Crear usuario administrador
    console.log('\n4️⃣ Creando usuario administrador...')
    const adminEmail = config.adminEmail
    const adminPassword = config.adminPassword
    
    // Crear usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true
    })
    
    if (authError) throw authError
    console.log(`✅ Usuario de auth creado: ${adminEmail}`)
    
    // 5. Crear empleados (incluyendo el admin)
    console.log('\n5️⃣ Creando empleados...')
    const empleados = []
    
    // Primero crear el empleado admin
    const adminNombre = config.adminNombre.split(' ')[0]
    const adminApellido = config.adminNombre.split(' ').slice(1).join(' ') || 'Administrator'
    
    const { data: adminEmpleado, error: adminEmpError } = await supabase
      .from('employees')
      .insert([{
        company_id: companyId,
        department_id: departamentos[0].id,
        work_schedule_id: horario[0].id,
        name: config.adminNombre,
        email: adminEmail,
        phone: generarTelefono(),
        dni: generarDNI(),
        position: 'Administrador General',
        salary: 50000,
        hire_date: new Date().toISOString().split('T')[0],
        status: 'active'
      }])
      .select()
    
    if (adminEmpError) throw adminEmpError
    empleados.push(adminEmpleado[0])
    console.log(`✅ Admin creado: ${config.adminNombre}`)
    
    // Crear perfil de usuario para el admin
    const { error: perfilError } = await supabase
      .from('user_profiles')
      .insert([{
        id: authUser.user.id,
        employee_id: adminEmpleado[0].id,
        company_id: companyId,
        role: 'company_admin',
        email: adminEmail
      }])
    
    if (perfilError) throw perfilError
    console.log('✅ Perfil de admin creado')
    
    // Crear resto de empleados
    const nombresUsados = new Set([adminNombre])
    for (let i = 0; i < config.numEmpleados - 1; i++) {
      let nombre, apellido, nombreCompleto
      
      // Generar nombre único
      do {
        nombre = NOMBRES_BIBLICOS[Math.floor(Math.random() * NOMBRES_BIBLICOS.length)]
        apellido = APELLIDOS_HONDURENOS[Math.floor(Math.random() * APELLIDOS_HONDURENOS.length)]
        nombreCompleto = `${nombre} ${apellido}`
      } while (nombresUsados.has(nombre))
      
      nombresUsados.add(nombre)
      
      const departamento = departamentos[Math.floor(Math.random() * departamentos.length)]
      const posiciones = ['Analista', 'Coordinador', 'Especialista', 'Asistente', 'Supervisor']
      const posicion = `${posiciones[Math.floor(Math.random() * posiciones.length)]} de ${departamento.name}`
      
      const { data: emp, error: empError } = await supabase
        .from('employees')
        .insert([{
          company_id: companyId,
          department_id: departamento.id,
          work_schedule_id: horario[0].id,
          name: nombreCompleto,
          email: generarEmail(nombre, apellido, config.nombreEmpresa),
          phone: generarTelefono(),
          dni: generarDNI(),
          position: posicion,
          salary: generarSalario(),
          hire_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'active'
        }])
        .select()
      
      if (empError) throw empError
      empleados.push(emp[0])
      console.log(`✅ Empleado creado: ${nombreCompleto} - ${posicion}`)
    }
    
    // 6. Crear registro en activaciones
    console.log('\n6️⃣ Registrando en activaciones...')
    const { error: activError } = await supabase
      .from('activaciones')
      .insert([{
        empleados: config.numEmpleados,
        empresa: config.nombreEmpresa,
        contacto_nombre: config.adminNombre,
        contacto_whatsapp: config.telefonoEmpresa,
        contacto_email: adminEmail,
        departamentos: { total: config.numDepartamentos },
        monto: config.numEmpleados * 300,
        status: 'active',
        notas: 'Cliente creado automáticamente por script'
      }])
    
    if (activError) throw activError
    console.log('✅ Registro de activación creado')
    
    // 7. Resumen final
    console.log('\n🎉 ¡EMPRESA CREADA EXITOSAMENTE!')
    console.log('=' .repeat(50))
    console.log(`🏢 Empresa: ${config.nombreEmpresa}`)
    console.log(`👥 Empleados: ${empleados.length}`)
    console.log(`🏛️ Departamentos: ${departamentos.length}`)
    console.log(`👑 Admin: ${config.adminNombre}`)
    console.log(`📧 Email: ${adminEmail}`)
    console.log(`🔑 Password: ${adminPassword}`)
    console.log(`🆔 Company ID: ${companyId}`)
    console.log('\n📊 DETALLES DE DEPARTAMENTOS:')
    departamentos.forEach((dept, i) => {
      const empleadosEnDept = empleados.filter(emp => emp.department_id === dept.id).length
      console.log(`   ${i + 1}. ${dept.name} (${empleadosEnDept} empleados)`)
    })
    
    console.log('\n💰 RESUMEN DE SALARIOS:')
    const totalSalarios = empleados.reduce((sum, emp) => sum + emp.salary, 0)
    const promedioSalario = totalSalarios / empleados.length
    console.log(`   Total mensual: L${totalSalarios.toLocaleString()}`)
    console.log(`   Promedio: L${Math.round(promedioSalario).toLocaleString()}`)
    
    console.log('\n🔗 PRÓXIMOS PASOS:')
    console.log(`   1. El cliente puede ingresar a: https://tu-app.railway.app/app/login`)
    console.log(`   2. Usuario: ${adminEmail}`)
    console.log(`   3. Password: ${adminPassword}`)
    console.log(`   4. Tendrá acceso completo para customizar datos`)
    
    return {
      companyId,
      adminEmail,
      adminPassword,
      empleados: empleados.length,
      departamentos: departamentos.length,
      totalSalarios
    }
    
  } catch (error) {
    console.error('\n❌ Error creando empresa:', error.message)
    throw error
  }
}

// 🎛️ Configuración por defecto
const configuracionDefault = {
  nombreEmpresa: 'Distribuidora La Ceiba S.A.',
  emailEmpresa: 'info@distribuidoralaceiba.hn',
  telefonoEmpresa: '9999-8888',
  direccion: 'Col. Palmira, Tegucigalpa, Honduras',
  industria: 'Distribución y Ventas',
  adminNombre: 'Carlos Mendoza',
  adminEmail: 'admin@distribuidoralaceiba.hn',
  adminPassword: 'Admin123!',
  numEmpleados: 15,
  numDepartamentos: 4
}

// 🎯 Función principal
async function main() {
  console.log('🏗️  GENERADOR DE CLIENTES HR SAAS')
  console.log('=' .repeat(50))
  
  // Obtener configuración de argumentos o usar default
  const args = process.argv.slice(2)
  let config = { ...configuracionDefault }
  
  // Parsear argumentos
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '')
    const value = args[i + 1]
    
    if (key && value) {
      switch (key) {
        case 'empresa':
          config.nombreEmpresa = value
          config.emailEmpresa = `info@${value.toLowerCase().replace(/[^a-z0-9]/g, '')}.hn`
          break
        case 'admin':
          config.adminNombre = value
          break
        case 'email':
          config.adminEmail = value
          break
        case 'password':
          config.adminPassword = value
          break
        case 'empleados':
          config.numEmpleados = parseInt(value) || 15
          break
        case 'departamentos':
          config.numDepartamentos = parseInt(value) || 4
          break
      }
    }
  }
  
  console.log('📋 Configuración:')
  console.log(`   Empresa: ${config.nombreEmpresa}`)
  console.log(`   Admin: ${config.adminNombre}`)
  console.log(`   Email: ${config.adminEmail}`)
  console.log(`   Empleados: ${config.numEmpleados}`)
  console.log(`   Departamentos: ${config.numDepartamentos}`)
  
  // Confirmar antes de proceder
  if (!process.argv.includes('--force')) {
    console.log('\n⚠️  ¿Deseas continuar? (Presiona Ctrl+C para cancelar en 3 segundos...)')
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  
  try {
    const resultado = await crearEmpresaCompleta(config)
    console.log('\n✅ ¡Proceso completado exitosamente!')
    process.exit(0)
  } catch (error) {
    console.error('\n💥 Error en el proceso:', error)
    process.exit(1)
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { crearEmpresaCompleta }
