const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAttendanceRecords() {
  console.log('🔍 Verificando registros de asistencia...')
  
  try {
    // 1. Verificar estructura de la tabla
    console.log('\n📋 Verificando estructura de attendance_records...')
    const { data: structure, error: structError } = await supabase
      .from('attendance_records')
      .select('*')
      .limit(1)
    
    if (structError) {
      console.error('❌ Error accediendo a attendance_records:', structError)
      return
    }
    
    console.log('✅ Tabla attendance_records accesible')

    // 2. Contar total de registros
    const { count, error: countError } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('❌ Error contando registros:', countError)
      return
    }
    
    console.log(`📊 Total de registros en attendance_records: ${count}`)

    // 3. Verificar registros de hoy (2025-07-28)
    console.log('\n📅 Verificando registros de hoy (2025-07-28)...')
    const { data: todayRecords, error: todayError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('date', '2025-07-28')
    
    if (todayError) {
      console.error('❌ Error consultando registros de hoy:', todayError)
      return
    }
    
    console.log(`📈 Registros de hoy: ${todayRecords.length}`)
    if (todayRecords.length > 0) {
      todayRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. Empleado ID: ${record.employee_id}, Entrada: ${record.check_in}, Salida: ${record.check_out || 'Pendiente'}`)
      })
    }

    // 4. Verificar registros de ayer (2025-07-27)
    console.log('\n📅 Verificando registros de ayer (2025-07-27)...')
    const { data: yesterdayRecords, error: yesterdayError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('date', '2025-07-27')
    
    if (yesterdayError) {
      console.error('❌ Error consultando registros de ayer:', yesterdayError)
      return
    }
    
    console.log(`📈 Registros de ayer: ${yesterdayRecords.length}`)

    // 5. Verificar últimos 10 registros
    console.log('\n📋 Últimos 10 registros:')
    const { data: recentRecords, error: recentError } = await supabase
      .from('attendance_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (recentError) {
      console.error('❌ Error consultando registros recientes:', recentError)
      return
    }
    
    if (recentRecords.length > 0) {
      recentRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. Fecha: ${record.date}, Empleado: ${record.employee_id}, Entrada: ${record.check_in}, Salida: ${record.check_out || 'Pendiente'}`)
      })
    } else {
      console.log('  ❌ No hay registros recientes')
    }

    // 6. Verificar empleados disponibles
    console.log('\n👥 Verificando empleados disponibles...')
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, dni, status')
      .eq('status', 'active')
    
    if (empError) {
      console.error('❌ Error consultando empleados:', empError)
      return
    }
    
    console.log(`👥 Empleados activos: ${employees.length}`)
    employees.forEach(emp => {
      console.log(`  - ${emp.name} (${emp.dni}) - Status: ${emp.status}`)
    })

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

checkAttendanceRecords() 