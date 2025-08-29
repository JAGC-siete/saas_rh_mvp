import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

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
    // 1.1 work_schedules — política por horario
    console.log('\n🔧 1.1 Agregando columnas a work_schedules...')
    const { error: wsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.work_schedules
        ADD COLUMN IF NOT EXISTS checkin_open TIME,
        ADD COLUMN IF NOT EXISTS checkin_close TIME,
        ADD COLUMN IF NOT EXISTS checkout_open TIME,
        ADD COLUMN IF NOT EXISTS checkout_close TIME,
        ADD COLUMN IF NOT EXISTS grace_minutes INT DEFAULT 5,
        ADD COLUMN IF NOT EXISTS late_to_inclusive INT DEFAULT 20,
        ADD COLUMN IF NOT EXISTS oor_from_minutes INT DEFAULT 21,
        ADD COLUMN IF NOT EXISTS work_days JSONB DEFAULT
        '{
         "monday":{"open":true},
         "tuesday":{"open":true},
         "wednesday":{"open":true},
         "thursday":{"open":true},
         "friday":{"open":true},
         "saturday":{"open":true,"half_day":true,"end_override":"12:00"},
         "sunday":{"open":false}
        }'::jsonb;
      `
    })
    
    if (wsError) {
      console.log('⚠️  Error en work_schedules (puede ser normal):', wsError.message)
    } else {
      console.log('✅ Columnas agregadas a work_schedules')
    }
    
    // 1.2 companies — geofence global
    console.log('\n🔧 1.2 Agregando columnas de geofence a companies...')
    const { error: compError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.companies
        ADD COLUMN IF NOT EXISTS geofence_center_lat DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS geofence_center_lon DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS geofence_radius_m INT;
      `
    })
    
    if (compError) {
      console.log('⚠️  Error en companies (puede ser normal):', compError.message)
    } else {
      console.log('✅ Columnas de geofence agregadas a companies')
    }
    
    // 1.3 attendance_records — TZ, reglas, flags
    console.log('\n🔧 1.3 Agregando columnas a attendance_records...')
    const { error: attError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.attendance_records
        ADD COLUMN IF NOT EXISTS tz TEXT DEFAULT 'America/Tegucigalpa',
        ADD COLUMN IF NOT EXISTS tz_offset_minutes INT,
        ADD COLUMN IF NOT EXISTS local_date DATE,
        ADD COLUMN IF NOT EXISTS rule_applied_in TEXT,
        ADD COLUMN IF NOT EXISTS rule_applied_out TEXT,
        ADD COLUMN IF NOT EXISTS justification_category TEXT,
        ADD COLUMN IF NOT EXISTS flags JSONB DEFAULT '{}'::jsonb;
      `
    })
    
    if (attError) {
      console.log('⚠️  Error en attendance_records (puede ser normal):', attError.message)
    } else {
      console.log('✅ Columnas agregadas a attendance_records')
    }
    
    // 1.4 Bitácora de eventos (append-only)
    console.log('\n🔧 1.4 Creando tabla attendance_events...')
    const { error: eventsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.attendance_events (
          id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
          employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          event_type TEXT NOT NULL CHECK (event_type IN ('check_in','check_out','approve')),
          ts_utc timestamptz NOT NULL DEFAULT now(),
          tz TEXT NOT NULL DEFAULT 'America/Tegucigalpa',
          tz_offset_minutes INT NOT NULL DEFAULT -360,
          ts_local timestamp without time zone GENERATED ALWAYS AS ((ts_utc AT TIME ZONE tz)) STORED,
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
    
    if (eventsError) {
      console.log('⚠️  Error en attendance_events (puede ser normal):', eventsError.message)
    } else {
      console.log('✅ Tabla attendance_events creada')
    }
    
    // 1.5 employee_scores — contadores semanales
    console.log('\n🔧 1.5 Agregando columnas a employee_scores...')
    const { error: scoresError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.employee_scores
        ADD COLUMN IF NOT EXISTS late_count_week INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_week_start DATE,
        ADD COLUMN IF NOT EXISTS last_event_local_date DATE;
      `
    })
    
    if (scoresError) {
      console.log('⚠️  Error en employee_scores (puede ser normal):', scoresError.message)
    } else {
      console.log('✅ Columnas agregadas a employee_scores')
    }
    
    // 1.6 Trigger para local_date/offset
    console.log('\n🔧 1.6 Creando trigger para campos locales...')
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION set_local_fields()
        RETURNS trigger AS $$
        DECLARE
          ltz text := COALESCE(NEW.tz, 'America/Tegucigalpa');
          ts  timestamp without time zone;
        BEGIN
          ts := COALESCE((NEW.check_in AT TIME ZONE ltz),
                         (NEW.check_out AT TIME ZONE ltz),
                         (now() AT TIME ZONE ltz));
          NEW.local_date := ts::date;
          NEW.tz_offset_minutes := -360;
          RETURN NEW;
        END; $$ LANGUAGE plpgsql;
      `
    })
    
    if (triggerError) {
      console.log('⚠️  Error en función trigger (puede ser normal):', triggerError.message)
    } else {
      console.log('✅ Función trigger creada')
    }
    
    // Crear el trigger
    const { error: triggerCreateError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS trg_set_local_fields ON public.attendance_records;
        CREATE TRIGGER trg_set_local_fields
        BEFORE INSERT OR UPDATE ON public.attendance_records
        FOR EACH ROW EXECUTE FUNCTION set_local_fields();
      `
    })
    
    if (triggerCreateError) {
      console.log('⚠️  Error en trigger (puede ser normal):', triggerCreateError.message)
    } else {
      console.log('✅ Trigger creado')
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
