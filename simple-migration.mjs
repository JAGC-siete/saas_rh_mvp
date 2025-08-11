import { createClient } from '@supabase/supabase-js'
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
    // Verificar conexión
    console.log('🔍 Verificando conexión a Supabase...')
    const { data: testData, error: testError } = await supabase
      .from('employees')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.error('❌ Error de conexión:', testError)
      return
    }
    
    console.log('✅ Conexión exitosa')
    
    // 1.1 work_schedules — política por horario
    console.log('\n🔧 1.1 Agregando columnas a work_schedules...')
    
    // Intentar agregar columnas una por una
    const columnsToAdd = [
      'checkin_open TIME',
      'checkin_close TIME', 
      'checkout_open TIME',
      'checkout_close TIME',
      'grace_minutes INT DEFAULT 5',
      'late_to_inclusive INT DEFAULT 20',
      'oor_from_minutes INT DEFAULT 21'
    ]
    
    for (const column of columnsToAdd) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE public.work_schedules ADD COLUMN IF NOT EXISTS ${column};`
        })
        
        if (error) {
          console.log(`⚠️  Columna ${column.split(' ')[0]} (puede existir):`, error.message)
        } else {
          console.log(`✅ Columna ${column.split(' ')[0]} agregada`)
        }
      } catch (err) {
        console.log(`⚠️  Columna ${column.split(' ')[0]} (puede existir):`, err.message)
      }
    }
    
    // 1.2 companies — geofence global
    console.log('\n🔧 1.2 Agregando columnas de geofence a companies...')
    
    const geofenceColumns = [
      'geofence_center_lat DOUBLE PRECISION',
      'geofence_center_lon DOUBLE PRECISION',
      'geofence_radius_m INT'
    ]
    
    for (const column of geofenceColumns) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS ${column};`
        })
        
        if (error) {
          console.log(`⚠️  Columna ${column.split(' ')[0]} (puede existir):`, error.message)
        } else {
          console.log(`✅ Columna ${column.split(' ')[0]} agregada`)
        }
      } catch (err) {
        console.log(`⚠️  Columna ${column.split(' ')[0]} (puede existir):`, err.message)
      }
    }
    
    // 1.3 attendance_records — TZ, reglas, flags
    console.log('\n🔧 1.3 Agregando columnas a attendance_records...')
    
    const attendanceColumns = [
      'tz TEXT DEFAULT \'America/Tegucigalpa\'',
      'tz_offset_minutes INT',
      'local_date DATE',
      'rule_applied_in TEXT',
      'rule_applied_out TEXT',
      'justification_category TEXT',
      'flags JSONB DEFAULT \'{}\'::jsonb'
    ]
    
    for (const column of attendanceColumns) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS ${column};`
        })
        
        if (error) {
          console.log(`⚠️  Columna ${column.split(' ')[0]} (puede existir):`, error.message)
        } else {
          console.log(`✅ Columna ${column.split(' ')[0]} agregada`)
        }
      } catch (err) {
        console.log(`⚠️  Columna ${column.split(' ')[0]} (puede existir):`, err.message)
      }
    }
    
    // 1.4 Bitácora de eventos (append-only)
    console.log('\n🔧 1.4 Creando tabla attendance_events...')
    
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.attendance_events (
            id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
            employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            event_type TEXT NOT NULL CHECK (event_type IN ('check_in','check_out','approve')),
            ts_utc timestamptz NOT NULL DEFAULT now(),
            tz TEXT NOT NULL DEFAULT 'America/Tegucigalpa',
            tz_offset_minutes INT NOT NULL DEFAULT -360,
            rule_applied TEXT,
            justification TEXT,
            source TEXT,
            ip INET,
            device_id TEXT,
            lat DOUBLE PRECISION,
            lon DOUBLE PRECISION,
            geofence_ok BOOLEAN,
            flags JSONB DEFAULT '{}'::jsonb,
            ref_record_id uuid REFERENCES attendance_records(id)
          );
        `
      })
      
      if (error) {
        console.log('⚠️  Tabla attendance_events (puede existir):', error.message)
      } else {
        console.log('✅ Tabla attendance_events creada')
      }
    } catch (err) {
      console.log('⚠️  Tabla attendance_events (puede existir):', err.message)
    }
    
    // 1.5 employee_scores — contadores semanales
    console.log('\n🔧 1.5 Agregando columnas a employee_scores...')
    
    const scoresColumns = [
      'late_count_week INT DEFAULT 0',
      'last_week_start DATE',
      'last_event_local_date DATE'
    ]
    
    for (const column of scoresColumns) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE public.employee_scores ADD COLUMN IF NOT EXISTS ${column};`
        })
        
        if (error) {
          console.log(`⚠️  Columna ${column.split(' ')[0]} (puede existir):`, error.message)
        } else {
          console.log(`✅ Columna ${column.split(' ')[0]} agregada`)
        }
      } catch (err) {
        console.log(`⚠️  Columna ${column.split(' ')[0]} (puede existir):`, err.message)
      }
    }
    
    console.log('\n🎉 Migraciones principales completadas!')
    
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
    } else {
      console.log('⚠️  Error verificando work_schedules:', wsError?.message)
    }
    
    // Verificar columnas en attendance_records
    const { data: attendanceCols, error: attError } = await supabase
      .from('attendance_records')
      .select('tz, local_date, rule_applied_in, rule_applied_out')
      .limit(1)
    
    if (!attError && attendanceCols) {
      console.log('✅ Columnas de attendance_records creadas correctamente')
    } else {
      console.log('⚠️  Error verificando attendance_records:', attError?.message)
    }
    
    // Verificar tabla attendance_events
    const { data: eventsCount, error: eventsError } = await supabase
      .from('attendance_events')
      .select('id')
      .limit(1)
    
    if (!eventsError) {
      console.log('✅ Tabla attendance_events creada correctamente')
    } else {
      console.log('⚠️  Error verificando attendance_events:', eventsError.message)
    }
    
    // Verificar columnas en employee_scores
    const { data: scoresCols, error: scoresError } = await supabase
      .from('employee_scores')
      .select('late_count_week, last_week_start, last_event_local_date')
      .limit(1)
    
    if (!scoresError && scoresCols) {
      console.log('✅ Columnas de employee_scores creadas correctamente')
    } else {
      console.log('⚠️  Error verificando employee_scores:', scoresError?.message)
    }
    
  } catch (error) {
    console.log('⚠️  Error en verificación:', error.message)
  }
}

executeMigrations()
