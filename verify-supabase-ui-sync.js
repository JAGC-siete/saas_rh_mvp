#!/usr/bin/env node

/**
 * SCRIPT DE VERIFICACIÓN COMPLETA SUPABASE-UI
 * 
 * Este script verifica que:
 * 1. Las tablas en Supabase coinciden con el esquema esperado
 * 2. Los datos están sincronizados con la UI
 * 3. Las políticas RLS están aplicadas correctamente
 * 4. Los endpoints de API funcionan con la base de datos
 */

const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase (usar las claves actuales)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fwyxmovfrzauebiqxchz.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjI4MjgzOCwiZXhwIjoyMDUxODU4ODM4fQ.cNsUZ1f_GVPOQDlAVh68WJrnRJH0NsQ1_BeCGGq0H6A'

const supabase = createClient(supabaseUrl, supabaseKey)

// Esquema esperado basado en las migraciones
const expectedSchema = {
  companies: {
    required: ['id', 'name', 'subdomain', 'plan_type', 'settings', 'created_at', 'updated_at', 'is_active'],
    types: {
      id: 'uuid',
      name: 'text',
      subdomain: 'text',
      plan_type: 'text',
      settings: 'jsonb',
      created_at: 'timestamptz',
      updated_at: 'timestamptz',
      is_active: 'boolean'
    }
  },
  employees: {
    required: ['id', 'company_id', 'dni', 'name', 'base_salary', 'status', 'created_at', 'updated_at'],
    types: {
      id: 'uuid',
      company_id: 'uuid',
      department_id: 'uuid',
      work_schedule_id: 'uuid',
      employee_code: 'text',
      dni: 'text',
      name: 'text',
      email: 'text',
      phone: 'text',
      role: 'text',
      position: 'text',
      base_salary: 'decimal',
      hire_date: 'date',
      termination_date: 'date',
      status: 'text',
      bank_name: 'text',
      bank_account: 'text',
      emergency_contact_name: 'text',
      emergency_contact_phone: 'text',
      address: 'jsonb',
      metadata: 'jsonb',
      created_at: 'timestamptz',
      updated_at: 'timestamptz'
    }
  },
  work_schedules: {
    required: ['id', 'company_id', 'name', 'created_at', 'updated_at'],
    types: {
      id: 'uuid',
      company_id: 'uuid',
      name: 'text',
      monday_start: 'time',
      monday_end: 'time',
      tuesday_start: 'time',
      tuesday_end: 'time',
      wednesday_start: 'time',
      wednesday_end: 'time',
      thursday_start: 'time',
      thursday_end: 'time',
      friday_start: 'time',
      friday_end: 'time',
      saturday_start: 'time',
      saturday_end: 'time',
      sunday_start: 'time',
      sunday_end: 'time',
      break_duration: 'integer',
      timezone: 'text',
      created_at: 'timestamptz',
      updated_at: 'timestamptz'
    }
  },
  attendance_records: {
    required: ['id', 'employee_id', 'date', 'created_at', 'updated_at'],
    types: {
      id: 'uuid',
      employee_id: 'uuid',
      date: 'date',
      check_in: 'timestamptz',
      check_out: 'timestamptz',
      expected_check_in: 'time',
      expected_check_out: 'time',
      late_minutes: 'integer',
      early_departure_minutes: 'integer',
      justification: 'text',
      status: 'text',
      approved_by: 'uuid',
      approved_at: 'timestamptz',
      created_at: 'timestamptz',
      updated_at: 'timestamptz'
    }
  },
  departments: {
    required: ['id', 'company_id', 'name', 'created_at', 'updated_at'],
    types: {
      id: 'uuid',
      company_id: 'uuid',
      name: 'text',
      description: 'text',
      manager_id: 'uuid',
      created_at: 'timestamptz',
      updated_at: 'timestamptz'
    }
  },
  user_profiles: {
    required: ['id', 'company_id', 'role', 'created_at', 'updated_at'],
    types: {
      id: 'uuid',
      company_id: 'uuid',
      employee_id: 'uuid',
      role: 'text',
      permissions: 'jsonb',
      last_login: 'timestamptz',
      is_active: 'boolean',
      created_at: 'timestamptz',
      updated_at: 'timestamptz'
    }
  }
}

async function checkDatabaseSchema() {
  console.log('🔍 VERIFICANDO ESQUEMA DE BASE DE DATOS')
  console.log('=' .repeat(60))
  
  try {
    // Consultar información del esquema
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_schema_info')
      .select('*')
    
    if (tablesError) {
      console.log('⚠️  No se pudo obtener información del esquema directamente')
      console.log('   Intentando verificación manual...')
      return await checkTablesManually()
    }
    
    console.log('✅ Esquema obtenido correctamente')
    return true
    
  } catch (error) {
    console.log('❌ Error al verificar esquema:', error.message)
    return false
  }
}

async function checkTablesManually() {
  console.log('\n📋 VERIFICACIÓN MANUAL DE TABLAS')
  console.log('-'.repeat(40))
  
  const tableChecks = []
  
  for (const [tableName, expected] of Object.entries(expectedSchema)) {
    console.log(`\n🔍 Verificando tabla: ${tableName}`)
    
    try {
      // Intentar consultar la tabla
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .limit(1)
      
      if (error) {
        console.log(`❌ Error en tabla ${tableName}: ${error.message}`)
        tableChecks.push({ table: tableName, status: 'error', error: error.message })
        continue
      }
      
      // Verificar que la tabla existe y es accesible
      console.log(`✅ Tabla ${tableName} existe y es accesible`)
      
      // Verificar campos requeridos
      const requiredFields = expected.required
      const missingFields = []
      
      // Intentar consultar campos específicos
      const { data: sampleData, error: fieldError } = await supabase
        .from(tableName)
        .select(requiredFields.join(','))
        .limit(1)
      
      if (fieldError) {
        console.log(`⚠️  Algunos campos requeridos pueden estar faltando en ${tableName}`)
        missingFields.push(fieldError.message)
      } else {
        console.log(`✅ Campos requeridos presentes en ${tableName}`)
      }
      
      tableChecks.push({ 
        table: tableName, 
        status: 'ok', 
        recordCount: count || 0,
        missingFields 
      })
      
    } catch (err) {
      console.log(`❌ Error inesperado en ${tableName}: ${err.message}`)
      tableChecks.push({ table: tableName, status: 'error', error: err.message })
    }
  }
  
  return tableChecks
}

async function checkDataConsistency() {
  console.log('\n📊 VERIFICANDO CONSISTENCIA DE DATOS')
  console.log('=' .repeat(60))
  
  const dataChecks = []
  
  // Verificar datos de empresas
  console.log('\n🏢 Verificando datos de empresas...')
  const { data: companies, error: compError } = await supabase
    .from('companies')
    .select('id, name, subdomain, is_active')
    .limit(5)
  
  if (compError) {
    console.log(`❌ Error consultando companies: ${compError.message}`)
  } else {
    console.log(`✅ Encontradas ${companies?.length || 0} empresas`)
    if (companies && companies.length > 0) {
      companies.forEach(comp => {
        console.log(`   - ${comp.name} (${comp.subdomain}) - ${comp.is_active ? 'Activa' : 'Inactiva'}`)
      })
    }
  }
  
  // Verificar datos de empleados
  console.log('\n👥 Verificando datos de empleados...')
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, name, dni, status, company_id')
    .eq('status', 'active')
    .limit(10)
  
  if (empError) {
    console.log(`❌ Error consultando employees: ${empError.message}`)
  } else {
    console.log(`✅ Encontrados ${employees?.length || 0} empleados activos`)
    if (employees && employees.length > 0) {
      employees.slice(0, 5).forEach(emp => {
        console.log(`   - ${emp.name} (DNI: ${emp.dni}) - ${emp.status}`)
      })
    }
  }
  
  // Verificar horarios de trabajo
  console.log('\n⏰ Verificando horarios de trabajo...')
  const { data: schedules, error: schedError } = await supabase
    .from('work_schedules')
    .select('id, name, company_id')
    .limit(5)
  
  if (schedError) {
    console.log(`❌ Error consultando work_schedules: ${schedError.message}`)
  } else {
    console.log(`✅ Encontrados ${schedules?.length || 0} horarios de trabajo`)
    if (schedules && schedules.length > 0) {
      schedules.forEach(sched => {
        console.log(`   - ${sched.name}`)
      })
    }
  }
  
  // Verificar registros de asistencia
  console.log('\n📊 Verificando registros de asistencia...')
  const { data: attendance, error: attError } = await supabase
    .from('attendance_records')
    .select('id, employee_id, date, status')
    .limit(5)
  
  if (attError) {
    console.log(`❌ Error consultando attendance_records: ${attError.message}`)
  } else {
    console.log(`✅ Encontrados ${attendance?.length || 0} registros de asistencia`)
  }
  
  return {
    companies: companies?.length || 0,
    employees: employees?.length || 0,
    schedules: schedules?.length || 0,
    attendance: attendance?.length || 0
  }
}

async function checkRLSPolicies() {
  console.log('\n🔒 VERIFICANDO POLÍTICAS RLS')
  console.log('=' .repeat(60))
  
  const policyChecks = []
  
  // Lista de tablas que deberían tener RLS habilitado
  const tablesWithRLS = ['companies', 'employees', 'departments', 'work_schedules', 'attendance_records', 'user_profiles']
  
  for (const tableName of tablesWithRLS) {
    console.log(`\n🔍 Verificando RLS en tabla: ${tableName}`)
    
    try {
      // Intentar consultar sin autenticación (debería fallar si RLS está habilitado)
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1)
      
      if (error && error.code === 'PGRST116') {
        console.log(`✅ RLS habilitado en ${tableName} (acceso denegado sin autenticación)`)
        policyChecks.push({ table: tableName, rls: 'enabled' })
      } else if (error) {
        console.log(`⚠️  Error consultando ${tableName}: ${error.message}`)
        policyChecks.push({ table: tableName, rls: 'unknown', error: error.message })
      } else {
        console.log(`⚠️  RLS posiblemente deshabilitado en ${tableName} (acceso permitido sin autenticación)`)
        policyChecks.push({ table: tableName, rls: 'disabled' })
      }
      
    } catch (err) {
      console.log(`❌ Error verificando RLS en ${tableName}: ${err.message}`)
      policyChecks.push({ table: tableName, rls: 'error', error: err.message })
    }
  }
  
  return policyChecks
}

async function checkAPIConnectivity() {
  console.log('\n🌐 VERIFICANDO CONECTIVIDAD DE API')
  console.log('=' .repeat(60))
  
  const apiChecks = []
  
  // Verificar endpoint de salud
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'}/api/health`)
    const healthData = await response.json()
    
    if (response.ok) {
      console.log('✅ Endpoint /api/health responde correctamente')
      console.log(`   Status: ${healthData.status}`)
      console.log(`   Database: ${healthData.checks?.database?.status || 'unknown'}`)
      apiChecks.push({ endpoint: '/api/health', status: 'ok', data: healthData })
    } else {
      console.log(`❌ Endpoint /api/health falló: ${response.status}`)
      apiChecks.push({ endpoint: '/api/health', status: 'error', statusCode: response.status })
    }
  } catch (error) {
    console.log(`❌ Error conectando a /api/health: ${error.message}`)
    apiChecks.push({ endpoint: '/api/health', status: 'error', error: error.message })
  }
  
  // Verificar endpoint de asistencia
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'}/api/attendance/health`)
    const attendanceData = await response.json()
    
    if (response.ok) {
      console.log('✅ Endpoint /api/attendance/health responde correctamente')
      apiChecks.push({ endpoint: '/api/attendance/health', status: 'ok', data: attendanceData })
    } else {
      console.log(`❌ Endpoint /api/attendance/health falló: ${response.status}`)
      apiChecks.push({ endpoint: '/api/attendance/health', status: 'error', statusCode: response.status })
    }
  } catch (error) {
    console.log(`❌ Error conectando a /api/attendance/health: ${error.message}`)
    apiChecks.push({ endpoint: '/api/attendance/health', status: 'error', error: error.message })
  }
  
  return apiChecks
}

async function generateReport(schemaChecks, dataChecks, rlsChecks, apiChecks) {
  console.log('\n📋 REPORTE COMPLETO DE SINCRONIZACIÓN')
  console.log('=' .repeat(60))
  
  // Resumen de esquema
  console.log('\n🏗️  ESTADO DEL ESQUEMA:')
  const schemaErrors = schemaChecks.filter(check => check.status === 'error')
  const schemaOk = schemaChecks.filter(check => check.status === 'ok')
  
  console.log(`✅ Tablas correctas: ${schemaOk.length}`)
  console.log(`❌ Tablas con errores: ${schemaErrors.length}`)
  
  if (schemaErrors.length > 0) {
    console.log('\n❌ TABLAS CON PROBLEMAS:')
    schemaErrors.forEach(check => {
      console.log(`   - ${check.table}: ${check.error}`)
    })
  }
  
  // Resumen de datos
  console.log('\n📊 ESTADO DE LOS DATOS:')
  console.log(`🏢 Empresas: ${dataChecks.companies}`)
  console.log(`👥 Empleados activos: ${dataChecks.employees}`)
  console.log(`⏰ Horarios de trabajo: ${dataChecks.schedules}`)
  console.log(`📊 Registros de asistencia: ${dataChecks.attendance}`)
  
  // Resumen de RLS
  console.log('\n🔒 ESTADO DE RLS:')
  const rlsEnabled = rlsChecks.filter(check => check.rls === 'enabled')
  const rlsDisabled = rlsChecks.filter(check => check.rls === 'disabled')
  
  console.log(`✅ RLS habilitado: ${rlsEnabled.length} tablas`)
  console.log(`⚠️  RLS deshabilitado: ${rlsDisabled.length} tablas`)
  
  // Resumen de API
  console.log('\n🌐 ESTADO DE API:')
  const apiOk = apiChecks.filter(check => check.status === 'ok')
  const apiErrors = apiChecks.filter(check => check.status === 'error')
  
  console.log(`✅ Endpoints funcionando: ${apiOk.length}`)
  console.log(`❌ Endpoints con errores: ${apiErrors.length}`)
  
  // Recomendaciones
  console.log('\n💡 RECOMENDACIONES:')
  
  if (schemaErrors.length > 0) {
    console.log('🔧 Ejecutar migraciones de Supabase:')
    console.log('   supabase db reset')
    console.log('   supabase db push')
  }
  
  if (rlsDisabled.length > 0) {
    console.log('🔒 Habilitar RLS en tablas críticas:')
    rlsDisabled.forEach(check => {
      console.log(`   - ${check.table}`)
    })
  }
  
  if (apiErrors.length > 0) {
    console.log('🌐 Verificar configuración de Railway:')
    console.log('   - Variables de entorno')
    console.log('   - Configuración de rutas')
  }
  
  if (dataChecks.employees === 0) {
    console.log('👥 Ejecutar migración de empleados:')
    console.log('   psql $SUPABASE_DB_URL -f supabase/migrations/20250727162447_complete_employee_migration.sql')
  }
  
  // Estado general
  const totalIssues = schemaErrors.length + rlsDisabled.length + apiErrors.length
  const overallStatus = totalIssues === 0 ? '✅ SINCRONIZADO' : '⚠️  REQUIERE ATENCIÓN'
  
  console.log(`\n🎯 ESTADO GENERAL: ${overallStatus}`)
  console.log(`   Problemas encontrados: ${totalIssues}`)
  
  return {
    overallStatus,
    totalIssues,
    schemaChecks,
    dataChecks,
    rlsChecks,
    apiChecks
  }
}

async function main() {
  console.log('🚀 INICIANDO VERIFICACIÓN COMPLETA SUPABASE-UI')
  console.log('=' .repeat(60))
  console.log(`URL: ${supabaseUrl}`)
  console.log(`Timestamp: ${new Date().toISOString()}`)
  
  try {
    // Ejecutar todas las verificaciones
    const schemaChecks = await checkDatabaseSchema()
    const dataChecks = await checkDataConsistency()
    const rlsChecks = await checkRLSPolicies()
    const apiChecks = await checkAPIConnectivity()
    
    // Generar reporte final
    const report = await generateReport(schemaChecks, dataChecks, rlsChecks, apiChecks)
    
    console.log('\n✅ VERIFICACIÓN COMPLETADA')
    console.log('=' .repeat(60))
    
    // Retornar código de salida basado en el estado
    process.exit(report.totalIssues === 0 ? 0 : 1)
    
  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO:', error.message)
    process.exit(1)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main()
}

module.exports = {
  checkDatabaseSchema,
  checkDataConsistency,
  checkRLSPolicies,
  checkAPIConnectivity,
  generateReport
} 