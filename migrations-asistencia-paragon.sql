-- =====================================================
-- MIGRACIONES SISTEMA ASISTENCIA PARAGON
-- =====================================================
-- Ejecutar en orden secuencial
-- =====================================================

-- 1.1 work_schedules — política por horario
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

-- 1.2 companies — geofence global
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS geofence_center_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS geofence_center_lon DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS geofence_radius_m INT;

-- 1.3 attendance_records — TZ, reglas, flags
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS tz TEXT DEFAULT 'America/Tegucigalpa',
ADD COLUMN IF NOT EXISTS tz_offset_minutes INT,
ADD COLUMN IF NOT EXISTS local_date DATE,
ADD COLUMN IF NOT EXISTS rule_applied_in TEXT,
ADD COLUMN IF NOT EXISTS rule_applied_out TEXT,
ADD COLUMN IF NOT EXISTS justification_category TEXT,
ADD COLUMN IF NOT EXISTS flags JSONB DEFAULT '{}'::jsonb;

-- 1.4 Bitácora de eventos (append-only)
CREATE TABLE IF NOT EXISTS public.attendance_events (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('check_in','check_out','approve')),
  ts_utc timestamptz NOT NULL DEFAULT now(),
  tz TEXT NOT NULL DEFAULT 'America/Tegucigalpa',
  tz_offset_minutes INT NOT NULL DEFAULT -360,
  ts_local timestamp without time zone GENERATED ALWAYS AS ((ts_utc AT TIME ZONE tz)) STORED,
  rule_applied TEXT,            -- 'early','normal','late','oor','rejected'
  justification TEXT,
  source TEXT,                  -- 'web','kiosk','admin','api'
  ip INET,
  device_id TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  geofence_ok BOOLEAN,
  flags JSONB DEFAULT '{}'::jsonb,
  ref_record_id uuid REFERENCES attendance_records(id)
);

CREATE INDEX IF NOT EXISTS idx_att_events_emp_ts ON public.attendance_events (employee_id, ts_utc DESC);

-- 1.5 employee_scores — contadores semanales
ALTER TABLE public.employee_scores
ADD COLUMN IF NOT EXISTS late_count_week INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_week_start DATE,
ADD COLUMN IF NOT EXISTS last_event_local_date DATE;

-- 1.6 Trigger para local_date/offset
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
  NEW.tz_offset_minutes := -360; -- HN fijo (sin DST)
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_local_fields ON public.attendance_records;
CREATE TRIGGER trg_set_local_fields
BEFORE INSERT OR UPDATE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION set_local_fields();

-- =====================================================
-- 2) VISTAS MATERIALIZADAS (REPORTES)
-- =====================================================

-- Diario
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_attendance_daily AS
SELECT
  local_date,
  employee_id,
  status,
  rule_applied_in,
  rule_applied_out,
  late_minutes,
  early_departure_minutes,
  (check_in  AT TIME ZONE 'UTC') AT TIME ZONE tz AS check_in_local,
  (check_out AT TIME ZONE 'UTC') AT TIME ZONE tz AS check_out_local
FROM public.attendance_records;

CREATE UNIQUE INDEX IF NOT EXISTS mv_attendance_daily_ux ON mv_attendance_daily (employee_id, local_date);

-- Semanal
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_attendance_weekly AS
SELECT
  employee_id,
  date_trunc('week', local_date)::date AS week_start,
  COUNT(*) FILTER (WHERE status IN ('present','late_in','oor_in')) AS days_with_checkin,
  SUM(CASE WHEN rule_applied_in='late' THEN 1 ELSE 0 END) AS lates,
  SUM(early_departure_minutes) AS early_minutes,
  SUM(late_minutes) AS late_total_minutes
FROM public.attendance_records
GROUP BY employee_id, date_trunc('week', local_date);

-- Quincenal (1–15, 16–fin)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_attendance_quincenal AS
SELECT
  employee_id,
  date_part('year', local_date)::int AS year,
  date_part('month', local_date)::int AS month,
  CASE WHEN extract(day from local_date) <= 15 THEN 1 ELSE 2 END AS quincena,
  COUNT(*) FILTER (WHERE status IN ('present','late_in','oor_in')) AS days_with_checkin,
  SUM(CASE WHEN rule_applied_in='late' THEN 1 ELSE 0 END) AS lates
FROM public.attendance_records
GROUP BY employee_id, year, month, quincena;

-- Mensual
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_attendance_mensual AS
SELECT
  employee_id,
  date_trunc('month', local_date)::date AS month_start,
  COUNT(*) FILTER (WHERE status IN ('present','late_in','oor_in')) AS days_with_checkin,
  SUM(CASE WHEN rule_applied_in='late' THEN 1 ELSE 0 END) AS lates
FROM public.attendance_records
GROUP BY employee_id, month_start;

-- Ranking (ya existe tabla scores)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_punctuality_ranking AS
SELECT employee_id, weekly_points, monthly_points, punctuality_streak, early_arrival_count, perfect_week_count
FROM employee_scores;

-- =====================================================
-- 3) ÍNDICES RECOMENDADOS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_attendance_local_date ON public.attendance_records (employee_id, local_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_records (status);
CREATE INDEX IF NOT EXISTS idx_events_emp_time ON public.attendance_events (employee_id, ts_utc DESC);

-- =====================================================
-- 4) DATOS INICIALES PARA WORK_SCHEDULES
-- =====================================================

-- Actualizar horarios existentes con ventanas duras
UPDATE public.work_schedules 
SET 
  checkin_open = '07:00',
  checkin_close = '11:00',
  checkout_open = '16:30',
  checkout_close = '21:00',
  grace_minutes = 5,
  late_to_inclusive = 20,
  oor_from_minutes = 21
WHERE checkin_open IS NULL;

-- =====================================================
-- 5) VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que las columnas se crearon correctamente
SELECT 
  'work_schedules' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'work_schedules' 
  AND column_name IN ('checkin_open', 'checkin_close', 'checkout_open', 'checkout_close')
ORDER BY column_name;

SELECT 
  'attendance_records' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'attendance_records' 
  AND column_name IN ('tz', 'local_date', 'rule_applied_in', 'rule_applied_out')
ORDER BY column_name;

SELECT 
  'attendance_events' as table_name,
  COUNT(*) as total_events
FROM public.attendance_events;

SELECT 
  'Materialized Views' as type,
  schemaname,
  matviewname,
  matviewowner
FROM pg_matviews 
WHERE schemaname = 'public' 
  AND matviewname LIKE 'mv_attendance_%';
