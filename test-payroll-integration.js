const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPayrollIntegration() {
  console.log('🧪 Probando integración de nómina con Supabase...\n')
  
  try {
    // 1. Probar cálculo de nómina
    console.log('📊 1. Probando cálculo de nómina...')
    
    const testData = {
      periodo: '2025-07',
      quincena: 1
    }
    
    const response = await fetch('https://zesty-abundance-production.up.railway.app/api/payroll/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Cálculo de nómina exitoso')
      console.log(`📈 Empleados procesados: ${result.empleados}`)
      console.log(`💰 Total neto: L. ${result.totalNeto.toFixed(2)}`)
      
      if (result.planilla && result.planilla.length > 0) {
        console.log('\n📋 Detalles de la planilla:')
        result.planilla.forEach((emp, index) => {
          console.log(`  ${index + 1}. ${emp.nombre}: ${emp.dias} días, ${emp.horas.toFixed(2)} horas, L. ${emp.neto.toFixed(2)}`)
        })
      }
    } else {
      console.log('❌ Error en cálculo de nómina:', result.error)
    }
    
    // 2. Probar obtención de registros
    console.log('\n📋 2. Probando obtención de registros...')
    
    const recordsResponse = await fetch('https://zesty-abundance-production.up.railway.app/api/payroll/records?periodo=2025-07')
    const recordsResult = await recordsResponse.json()
    
    if (recordsResponse.ok) {
      console.log('✅ Obtención de registros exitosa')
      console.log(`📈 Registros encontrados: ${recordsResult.total}`)
      
      if (recordsResult.records && recordsResult.records.length > 0) {
        console.log('\n📋 Últimos registros:')
        recordsResult.records.slice(0, 3).forEach((record, index) => {
          console.log(`  ${index + 1}. ${record.employees?.name || 'N/A'}: ${record.period_start} a ${record.period_end}, L. ${record.net_salary}`)
        })
      }
    } else {
      console.log('❌ Error obteniendo registros:', recordsResult.error)
    }
    
    // 3. Verificar datos en Supabase
    console.log('\n🗄️ 3. Verificando datos en Supabase...')
    
    const { data: payrollRecords, error: payError } = await supabase
      .from('payroll_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (payError) {
      console.log(`❌ Error consultando payroll_records: ${payError.message}`)
    } else {
      console.log(`✅ Registros de nómina en Supabase: ${payrollRecords.length}`)
      if (payrollRecords.length > 0) {
        payrollRecords.forEach((record, index) => {
          console.log(`  ${index + 1}. ${record.period_start} a ${record.period_end}: L. ${record.net_salary}`)
        })
      }
    }
    
    // 4. Análisis de integración
    console.log('\n🔗 4. Análisis de integración:')
    
    const { data: attendanceRecords } = await supabase
      .from('attendance_records')
      .select('*')
      .gte('date', '2025-07-01')
      .lte('date', '2025-07-15')
    
    const { data: employees } = await supabase
      .from('employees')
      .select('id, name')
      .eq('status', 'active')
    
    if (attendanceRecords && employees) {
      const employeesWithAttendance = employees.filter(emp => 
        attendanceRecords.some(record => record.employee_id === emp.id)
      )
      
      console.log(`📈 Empleados con asistencia en período: ${employeesWithAttendance.length}/${employees.length}`)
      
      if (employeesWithAttendance.length > 0) {
        console.log('✅ Integración funcionando: Los empleados con asistencia pueden generar nómina')
      } else {
        console.log('⚠️ No hay empleados con asistencia en el período de prueba')
      }
    }
    
    console.log('\n✅ Prueba de integración completada')
    
  } catch (error) {
    console.error('❌ Error en prueba de integración:', error.message)
  }
}

testPayrollIntegration() 