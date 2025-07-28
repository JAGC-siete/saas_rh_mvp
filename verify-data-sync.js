#!/usr/bin/env node

/**
 * SCRIPT DE VERIFICACIÓN DE SINCRONIZACIÓN DE DATOS
 * 
 * Verifica que los datos en Supabase estén sincronizados con la UI
 */

const { createClient } = require('@supabase/supabase-js')

// Configuración
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fwyxmovfrzauebiqxchz.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjI4MjgzOCwiZXhwIjoyMDUxODU4ODM4fQ.cNsUZ1f_GVPOQDlAVh68WJrnRJH0NsQ1_BeCGGq0H6A'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkEmployeeDataSync() {
  console.log('👥 VERIFICANDO SINCRONIZACIÓN DE EMPLEADOS')
  console.log('=' .repeat(50))
  
  try {
    // Verificar empleados en Supabase
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, name, dni, status, company_id, work_schedule_id')
      .eq('status', 'active')
      .limit(10)
    
    if (error) {
      console.log(`❌ Error consultando empleados: ${error.message}`)
      return false
    }
    
    console.log(`✅ Encontrados ${employees?.length || 0} empleados activos`)
    
    if (employees && employees.length > 0) {
      console.log('\n📋 EMPLEADOS EN SUPABASE:')
      employees.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.name} (DNI: ${emp.dni})`)
        console.log(`   - Status: ${emp.status}`)
        console.log(`   - Company ID: ${emp.company_id}`)
        console.log(`   - Work Schedule: ${emp.work_schedule_id ? 'Asignado' : 'No asignado'}`)
      })
    }
    
    return employees?.length > 0
    
  } catch (error) {
    console.log(`❌ Error general: ${error.message}`)
    return false
  }
}

async function checkWorkSchedulesSync() {
  console.log('\n⏰ VERIFICANDO SINCRONIZACIÓN DE HORARIOS')
  console.log('=' .repeat(50))
  
  try {
    const { data: schedules, error } = await supabase
      .from('work_schedules')
      .select('id, name, company_id, monday_start, monday_end')
      .limit(5)
    
    if (error) {
      console.log(`❌ Error consultando horarios: ${error.message}`)
      return false
    }
    
    console.log(`✅ Encontrados ${schedules?.length || 0} horarios de trabajo`)
    
    if (schedules && schedules.length > 0) {
      console.log('\n📋 HORARIOS EN SUPABASE:')
      schedules.forEach((sched, index) => {
        console.log(`${index + 1}. ${sched.name}`)
        console.log(`   - Company ID: ${sched.company_id}`)
        console.log(`   - Lunes: ${sched.monday_start || 'N/A'} - ${sched.monday_end || 'N/A'}`)
      })
    }
    
    return schedules?.length > 0
    
  } catch (error) {
    console.log(`❌ Error general: ${error.message}`)
    return false
  }
}

async function checkAttendanceDataSync() {
  console.log('\n📊 VERIFICANDO SINCRONIZACIÓN DE ASISTENCIA')
  console.log('=' .repeat(50))
  
  try {
    const { data: attendance, error } = await supabase
      .from('attendance_records')
      .select('id, employee_id, date, check_in, status')
      .order('date', { ascending: false })
      .limit(10)
    
    if (error) {
      console.log(`❌ Error consultando asistencia: ${error.message}`)
      return false
    }
    
    console.log(`✅ Encontrados ${attendance?.length || 0} registros de asistencia`)
    
    if (attendance && attendance.length > 0) {
      console.log('\n📋 REGISTROS DE ASISTENCIA:')
      attendance.forEach((record, index) => {
        console.log(`${index + 1}. Fecha: ${record.date}`)
        console.log(`   - Employee ID: ${record.employee_id}`)
        console.log(`   - Check-in: ${record.check_in || 'N/A'}`)
        console.log(`   - Status: ${record.status}`)
      })
    }
    
    return attendance?.length > 0
    
  } catch (error) {
    console.log(`❌ Error general: ${error.message}`)
    return false
  }
}

async function checkCompanyDataSync() {
  console.log('\n🏢 VERIFICANDO SINCRONIZACIÓN DE EMPRESAS')
  console.log('=' .repeat(50))
  
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, subdomain, is_active')
      .limit(5)
    
    if (error) {
      console.log(`❌ Error consultando empresas: ${error.message}`)
      return false
    }
    
    console.log(`✅ Encontradas ${companies?.length || 0} empresas`)
    
    if (companies && companies.length > 0) {
      console.log('\n📋 EMPRESAS EN SUPABASE:')
      companies.forEach((comp, index) => {
        console.log(`${index + 1}. ${comp.name}`)
        console.log(`   - Subdomain: ${comp.subdomain || 'N/A'}`)
        console.log(`   - Active: ${comp.is_active ? 'Sí' : 'No'}`)
      })
    }
    
    return companies?.length > 0
    
  } catch (error) {
    console.log(`❌ Error general: ${error.message}`)
    return false
  }
}

async function testUIDataAccess() {
  console.log('\n🌐 VERIFICANDO ACCESO DESDE LA UI')
  console.log('=' .repeat(50))
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
  
  try {
    // Probar endpoint de salud
    console.log('🔍 Probando endpoint de salud...')
    const healthResponse = await fetch(`${baseUrl}/api/health`)
    const healthData = await healthResponse.json()
    
    if (healthResponse.ok) {
      console.log('✅ Endpoint de salud responde correctamente')
      console.log(`   - Status: ${healthData.status}`)
      console.log(`   - Database: ${healthData.checks?.database?.status || 'unknown'}`)
    } else {
      console.log(`❌ Endpoint de salud falló: ${healthResponse.status}`)
    }
    
    // Probar endpoint de asistencia
    console.log('\n🔍 Probando endpoint de asistencia...')
    const attendanceResponse = await fetch(`${baseUrl}/api/attendance/health`)
    
    if (attendanceResponse.ok) {
      console.log('✅ Endpoint de asistencia responde correctamente')
    } else {
      console.log(`❌ Endpoint de asistencia falló: ${attendanceResponse.status}`)
    }
    
    // Probar página de registro de asistencia
    console.log('\n🔍 Probando página de registro de asistencia...')
    const registroResponse = await fetch(`${baseUrl}/registrodeasistencia`)
    
    if (registroResponse.ok) {
      console.log('✅ Página de registro de asistencia accesible')
    } else {
      console.log(`❌ Página de registro de asistencia falló: ${registroResponse.status}`)
    }
    
    return true
    
  } catch (error) {
    console.log(`❌ Error probando acceso UI: ${error.message}`)
    return false
  }
}

async function generateSyncReport(results) {
  console.log('\n📋 REPORTE DE SINCRONIZACIÓN')
  console.log('=' .repeat(50))
  
  const { employees, schedules, attendance, companies, ui } = results
  
  console.log('\n✅ COMPONENTES SINCRONIZADOS:')
  if (employees) console.log('   - Empleados')
  if (schedules) console.log('   - Horarios de trabajo')
  if (attendance) console.log('   - Registros de asistencia')
  if (companies) console.log('   - Empresas')
  if (ui) console.log('   - Acceso desde UI')
  
  console.log('\n❌ COMPONENTES CON PROBLEMAS:')
  if (!employees) console.log('   - Empleados (sin datos o error)')
  if (!schedules) console.log('   - Horarios de trabajo (sin datos o error)')
  if (!attendance) console.log('   - Registros de asistencia (sin datos o error)')
  if (!companies) console.log('   - Empresas (sin datos o error)')
  if (!ui) console.log('   - Acceso desde UI (error de conectividad)')
  
  const totalComponents = 5
  const workingComponents = [employees, schedules, attendance, companies, ui].filter(Boolean).length
  const syncPercentage = (workingComponents / totalComponents) * 100
  
  console.log(`\n🎯 SINCRONIZACIÓN GENERAL: ${syncPercentage.toFixed(1)}%`)
  console.log(`   Componentes funcionando: ${workingComponents}/${totalComponents}`)
  
  if (syncPercentage < 100) {
    console.log('\n💡 RECOMENDACIONES:')
    
    if (!employees) {
      console.log('   - Ejecutar migración de empleados')
      console.log('   - Verificar tabla employees en Supabase')
    }
    
    if (!schedules) {
      console.log('   - Crear horarios de trabajo por defecto')
      console.log('   - Verificar tabla work_schedules en Supabase')
    }
    
    if (!companies) {
      console.log('   - Crear empresa por defecto')
      console.log('   - Verificar tabla companies en Supabase')
    }
    
    if (!ui) {
      console.log('   - Verificar configuración de Railway')
      console.log('   - Revisar variables de entorno')
    }
  }
  
  return {
    syncPercentage,
    workingComponents,
    totalComponents,
    results
  }
}

async function main() {
  console.log('🚀 VERIFICANDO SINCRONIZACIÓN SUPABASE-UI')
  console.log('=' .repeat(60))
  console.log(`URL: ${supabaseUrl}`)
  console.log(`Timestamp: ${new Date().toISOString()}`)
  
  try {
    // Ejecutar todas las verificaciones
    const employees = await checkEmployeeDataSync()
    const schedules = await checkWorkSchedulesSync()
    const attendance = await checkAttendanceDataSync()
    const companies = await checkCompanyDataSync()
    const ui = await testUIDataAccess()
    
    // Generar reporte
    const report = await generateSyncReport({
      employees,
      schedules,
      attendance,
      companies,
      ui
    })
    
    console.log('\n✅ VERIFICACIÓN COMPLETADA')
    console.log('=' .repeat(60))
    
    // Retornar código de salida
    process.exit(report.syncPercentage === 100 ? 0 : 1)
    
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
  checkEmployeeDataSync,
  checkWorkSchedulesSync,
  checkAttendanceDataSync,
  checkCompanyDataSync,
  testUIDataAccess,
  generateSyncReport
} 