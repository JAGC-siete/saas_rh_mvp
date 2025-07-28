// Script para probar la conexión con Supabase
import { createClient } from '@supabase/supabase-js'

const testSupabaseConnection = async () => {
  console.log('🔍 Probando conexión con Supabase...\n')
  
  // Claves de Railway (copiadas de railway variables)
  const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.pXArDqHGA4yjprTqJfsNQXwzS-WLz6NCK5QRbLAyYmA'
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I'
  
  try {
    // Crear cliente de Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('✅ Cliente de Supabase creado correctamente')
    
    // Probar conexión básica
    console.log('\n📋 Probando conexión básica...')
    const { data: healthData, error: healthError } = await supabase.from('companies').select('count').limit(1)
    
    if (healthError) {
      console.log('❌ Error de conexión:', healthError.message)
    } else {
      console.log('✅ Conexión básica exitosa')
    }
    
    // Probar autenticación
    console.log('\n📋 Probando autenticación...')
    const { data: authData, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.log('❌ Error de autenticación:', authError.message)
    } else {
      console.log('✅ Autenticación configurada correctamente')
      console.log('   Session:', authData.session ? 'Activa' : 'No hay sesión')
    }
    
    // Probar consulta de empleados
    console.log('\n📋 Probando consulta de empleados...')
    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, name, dni')
      .limit(5)
    
    if (empError) {
      console.log('❌ Error consultando empleados:', empError.message)
    } else {
      console.log('✅ Consulta de empleados exitosa')
      console.log(`   Empleados encontrados: ${employees?.length || 0}`)
      if (employees && employees.length > 0) {
        console.log('   Primer empleado:', employees[0])
      }
    }
    
    // Probar consulta de horarios
    console.log('\n📋 Probando consulta de horarios...')
    const { data: schedules, error: schedError } = await supabaseAdmin
      .from('work_schedules')
      .select('id, name')
      .limit(5)
    
    if (schedError) {
      console.log('❌ Error consultando horarios:', schedError.message)
    } else {
      console.log('✅ Consulta de horarios exitosa')
      console.log(`   Horarios encontrados: ${schedules?.length || 0}`)
    }
    
    console.log('\n✅ Todas las pruebas completadas')
    
  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

// Ejecutar pruebas
testSupabaseConnection() 