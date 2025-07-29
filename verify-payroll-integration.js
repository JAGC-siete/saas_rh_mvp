const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkServiceHealth(url) {
  try {
    const response = await fetch(url, { 
      method: 'GET',
      timeout: 5000 
    })
    const data = await response.json()
    return { status: 'healthy', data }
  } catch (error) {
    return { status: 'unhealthy', error: error.message }
  }
}

async function verifyPayrollIntegration() {
  console.log('🔍 Verificando integración entre asistencia y nómina...\n')
  
  try {
    // 1. Verificar esquemas en Supabase
    console.log('📋 1. Verificando esquemas en Supabase...')
    
    const tables = ['attendance_records', 'employees', 'payroll_records', 'work_schedules']
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`❌ Tabla ${table}: ${error.message}`)
      } else {
        console.log(`✅ Tabla ${table}: Accesible`)
      }
    }
    
    // 2. Verificar datos de asistencia
    console.log('\n📊 2. Verificando datos de asistencia...')
    const { data: attendanceRecords, error: attError } = await supabase
      .from('attendance_records')
      .select('*')
      .order('date', { ascending: false })
      .limit(5)
    
    if (attError) {
      console.log(`❌ Error consultando attendance_records: ${attError.message}`)
    } else {
      console.log(`✅ Registros de asistencia: ${attendanceRecords.length}`)
      attendanceRecords.forEach(record => {
        console.log(`  - ${record.date}: Empleado ${record.employee_id}, Entrada: ${record.check_in}, Salida: ${record.check_out || 'Pendiente'}`)
      })
    }
    
    // 3. Verificar empleados
    console.log('\n👥 3. Verificando empleados...')
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, dni, base_salary, status')
      .eq('status', 'active')
      .limit(5)
    
    if (empError) {
      console.log(`❌ Error consultando employees: ${empError.message}`)
    } else {
      console.log(`✅ Empleados activos: ${employees.length}`)
      employees.forEach(emp => {
        console.log(`  - ${emp.name} (${emp.dni}): L. ${emp.base_salary}`)
      })
    }
    
    // 4. Verificar payroll_records
    console.log('\n💰 4. Verificando registros de nómina...')
    const { data: payrollRecords, error: payError } = await supabase
      .from('payroll_records')
      .select('*')
      .limit(5)
    
    if (payError) {
      console.log(`❌ Error consultando payroll_records: ${payError.message}`)
    } else {
      console.log(`✅ Registros de nómina: ${payrollRecords.length}`)
      if (payrollRecords.length > 0) {
        payrollRecords.forEach(record => {
          console.log(`  - ${record.period_start} a ${record.period_end}: L. ${record.net_salary}`)
        })
      }
    }
    
    // 5. Verificar servicio de nómina
    console.log('\n🔧 5. Verificando servicio de nómina...')
    const nominaHealth = await checkServiceHealth('http://localhost:3002/health')
    console.log(`✅ Servicio de nómina: ${nominaHealth.status}`)
    
    // 6. Verificar servicio de bases_de_datos
    console.log('\n🗄️ 6. Verificando servicio de bases_de_datos...')
    const dbHealth = await checkServiceHealth('http://localhost:3001/health')
    console.log(`✅ Servicio de bases_de_datos: ${dbHealth.status}`)
    
    // 7. Análisis de integración
    console.log('\n🔗 7. Análisis de integración...')
    
    // Verificar si hay datos de asistencia para empleados activos
    if (employees && attendanceRecords) {
      const employeesWithAttendance = employees.filter(emp => 
        attendanceRecords.some(record => record.employee_id === emp.id)
      )
      
      console.log(`📈 Empleados con registros de asistencia: ${employeesWithAttendance.length}/${employees.length}`)
      
      if (employeesWithAttendance.length < employees.length) {
        console.log('⚠️ Algunos empleados no tienen registros de asistencia')
        const employeesWithoutAttendance = employees.filter(emp => 
          !attendanceRecords.some(record => record.employee_id === emp.id)
        )
        employeesWithoutAttendance.forEach(emp => {
          console.log(`  - ${emp.name} (${emp.dni})`)
        })
      }
    }
    
    // 8. Recomendaciones
    console.log('\n💡 8. Recomendaciones:')
    
    if (!payrollRecords || payrollRecords.length === 0) {
      console.log('📝 Crear registros de nómina en Supabase')
    }
    
    if (employees && employees.length > 0 && (!attendanceRecords || attendanceRecords.length === 0)) {
      console.log('📝 Generar registros de asistencia de prueba')
    }
    
    console.log('📝 Migrar servicio de nómina a Supabase')
    console.log('📝 Crear endpoints de integración')
    console.log('📝 Implementar cálculo automático de nómina')
    
  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

verifyPayrollIntegration() 