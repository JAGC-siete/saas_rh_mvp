import { supabase } from './lib/supabase.ts'

// Script para consultar el estado de las tablas
async function checkDatabaseTables() {
  console.log('🔍 ESTADO DE LA BASE DE DATOS')
  console.log('============================')
  
  const tables = [
    'companies',
    'employees', 
    'departments',
    'work_schedules',
    'attendance_records',
    'leave_types',
    'leave_requests',
    'payroll_records',
    'user_profiles'
  ]
  
  for (const tableName of tables) {
    try {
      console.log(`\n📋 Tabla: ${tableName.toUpperCase()}`)
      console.log('-'.repeat(40))
      
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(3)
      
      if (error) {
        console.log(`❌ Error: ${error.message}`)
        continue
      }
      
      console.log(`📊 Total de registros: ${count || 0}`)
      
      if (data && data.length > 0) {
        console.log('📝 Primeros registros:')
        data.forEach((row, index) => {
          console.log(`   ${index + 1}. ${JSON.stringify(row, null, 2)}`)
        })
      } else {
        console.log('📭 Tabla vacía')
      }
      
    } catch (err) {
      console.log(`❌ Error inesperado en ${tableName}: ${err.message}`)
    }
  }
}

checkDatabaseTables().catch(console.error)
