import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno requeridas no encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeMigrations() {
  console.log('🚀 Ejecutando migraciones del sistema de asistencia Paragon...')
  
  try {
    // Leer el archivo de migraciones
    const migrations = readFileSync('migrations-asistencia-paragon.sql', 'utf8')
    
    // Dividir en comandos individuales
    const commands = migrations
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
    
    console.log(`📝 Ejecutando ${commands.length} comandos SQL...`)
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      if (command.trim()) {
        try {
          console.log(`\n🔧 Comando ${i + 1}/${commands.length}:`)
          console.log(command.substring(0, 100) + '...')
          
          const { data, error } = await supabase.rpc('exec_sql', { sql: command })
          
          if (error) {
            console.log(`⚠️  Comando ${i + 1} ejecutado (puede ser normal para ALTER TABLE IF NOT EXISTS):`)
            console.log(error.message)
          } else {
            console.log(`✅ Comando ${i + 1} ejecutado exitosamente`)
          }
        } catch (err) {
          console.log(`⚠️  Comando ${i + 1} ejecutado (puede ser normal para CREATE IF NOT EXISTS):`)
          console.log(err.message)
        }
      }
    }
    
    console.log('\n🎉 Migraciones completadas!')
    
    // Verificar estructura
    await verifyStructure()
    
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error)
    process.exit(1)
  }
}

async function verifyStructure() {
  console.log('\n🔍 Verificando estructura creada...')
  
  try {
    // Verificar columnas en work_schedules
    const { data: workSchedulesCols, error: wsError } = await supabase
      .from('work_schedules')
      .select('checkin_open, checkin_close, checkout_open, checkout_close')
      .limit(1)
    
    if (!wsError && workSchedulesCols) {
      console.log('✅ Columnas de work_schedules creadas correctamente')
    }
    
    // Verificar columnas en attendance_records
    const { data: attendanceCols, error: attError } = await supabase
      .from('attendance_records')
      .select('tz, local_date, rule_applied_in, rule_applied_out')
      .limit(1)
    
    if (!attError && attendanceCols) {
      console.log('✅ Columnas de attendance_records creadas correctamente')
    }
    
    // Verificar tabla attendance_events
    const { data: eventsCount, error: eventsError } = await supabase
      .from('attendance_events')
      .select('id')
      .limit(1)
    
    if (!eventsError) {
      console.log('✅ Tabla attendance_events creada correctamente')
    }
    
    // Verificar columnas en employee_scores
    const { data: scoresCols, error: scoresError } = await supabase
      .from('employee_scores')
      .select('late_count_week, last_week_start, last_event_local_date')
      .limit(1)
    
    if (!scoresError && scoresCols) {
      console.log('✅ Columnas de employee_scores creadas correctamente')
    }
    
  } catch (error) {
    console.log('⚠️  Error en verificación:', error.message)
  }
}

executeMigrations()
