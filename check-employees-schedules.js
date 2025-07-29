const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkEmployeesSchedules() {
  console.log('🔍 Verificando empleados y horarios...')
  
  try {
    // 1. Verificar empleados
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, dni, work_schedule_id, status')
    
    if (empError) {
      console.error('❌ Error consultando empleados:', empError)
      return
    }

    console.log(`📋 Encontrados ${employees.length} empleados:`)
    employees.forEach(emp => {
      console.log(`- ${emp.name} (DNI: ${emp.dni}) - Status: ${emp.status} - Work Schedule: ${emp.work_schedule_id ? '✅' : '❌'}`)
    })

    // 2. Verificar horarios disponibles
    const { data: schedules, error: schedError } = await supabase
      .from('work_schedules')
      .select('id, name, company_id')
    
    if (schedError) {
      console.error('❌ Error consultando horarios:', schedError)
      return
    }

    console.log(`\n⏰ Encontrados ${schedules.length} horarios:`)
    schedules.forEach(sched => {
      console.log(`- ${sched.name} (ID: ${sched.id}) - Company: ${sched.company_id}`)
    })

    // 3. Asignar horarios a empleados que no los tienen
    const employeesWithoutSchedule = employees.filter(emp => !emp.work_schedule_id && emp.status === 'active')
    
    if (employeesWithoutSchedule.length > 0) {
      console.log(`\n⚠️  ${employeesWithoutSchedule.length} empleados sin horario asignado:`)
      employeesWithoutSchedule.forEach(emp => {
        console.log(`- ${emp.name} (${emp.dni})`)
      })

      // Asignar el primer horario disponible
      if (schedules.length > 0) {
        const defaultSchedule = schedules[0]
        console.log(`\n🔧 Asignando horario por defecto (${defaultSchedule.name})...`)
        
        for (const emp of employeesWithoutSchedule) {
          const { error: updateError } = await supabase
            .from('employees')
            .update({ work_schedule_id: defaultSchedule.id })
            .eq('id', emp.id)
          
          if (updateError) {
            console.error(`❌ Error actualizando ${emp.name}:`, updateError)
          } else {
            console.log(`✅ ${emp.name} actualizado`)
          }
        }
      }
    } else {
      console.log('\n✅ Todos los empleados tienen horario asignado')
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

checkEmployeesSchedules() 