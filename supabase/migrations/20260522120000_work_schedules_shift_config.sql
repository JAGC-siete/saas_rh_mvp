-- Flexible schedule topology: day off, continuous, split shift per weekday.
-- Maintains legacy monday_start/monday_end columns for backward compatibility.

ALTER TABLE public.work_schedules
  ADD COLUMN IF NOT EXISTS shift_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS day_off_mask SMALLINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.work_schedules.shift_config IS
  'Per-weekday topology: off | continuous {start,end,break} | split {m_start,m_end,a_start,a_end}';

COMMENT ON COLUMN public.work_schedules.day_off_mask IS
  'Bitmask of days off: bit 0=Sunday … bit 6=Saturday';

-- Backfill shift_config from legacy columns for existing rows
UPDATE public.work_schedules ws
SET
  shift_config = jsonb_build_object(
    'monday', CASE WHEN ws.monday_start IS NULL AND ws.monday_end IS NULL
      THEN jsonb_build_object('type', 'off')
      ELSE jsonb_build_object(
        'type', 'continuous',
        'start', to_char(COALESCE(ws.monday_start, '08:00'::time), 'HH24:MI'),
        'end', to_char(COALESCE(ws.monday_end, '17:00'::time), 'HH24:MI'),
        'break', COALESCE(ws.break_duration, 60)
      ) END,
    'tuesday', CASE WHEN ws.tuesday_start IS NULL AND ws.tuesday_end IS NULL
      THEN jsonb_build_object('type', 'off')
      ELSE jsonb_build_object(
        'type', 'continuous',
        'start', to_char(COALESCE(ws.tuesday_start, '08:00'::time), 'HH24:MI'),
        'end', to_char(COALESCE(ws.tuesday_end, '17:00'::time), 'HH24:MI'),
        'break', COALESCE(ws.break_duration, 60)
      ) END,
    'wednesday', CASE WHEN ws.wednesday_start IS NULL AND ws.wednesday_end IS NULL
      THEN jsonb_build_object('type', 'off')
      ELSE jsonb_build_object(
        'type', 'continuous',
        'start', to_char(COALESCE(ws.wednesday_start, '08:00'::time), 'HH24:MI'),
        'end', to_char(COALESCE(ws.wednesday_end, '17:00'::time), 'HH24:MI'),
        'break', COALESCE(ws.break_duration, 60)
      ) END,
    'thursday', CASE WHEN ws.thursday_start IS NULL AND ws.thursday_end IS NULL
      THEN jsonb_build_object('type', 'off')
      ELSE jsonb_build_object(
        'type', 'continuous',
        'start', to_char(COALESCE(ws.thursday_start, '08:00'::time), 'HH24:MI'),
        'end', to_char(COALESCE(ws.thursday_end, '17:00'::time), 'HH24:MI'),
        'break', COALESCE(ws.break_duration, 60)
      ) END,
    'friday', CASE WHEN ws.friday_start IS NULL AND ws.friday_end IS NULL
      THEN jsonb_build_object('type', 'off')
      ELSE jsonb_build_object(
        'type', 'continuous',
        'start', to_char(COALESCE(ws.friday_start, '08:00'::time), 'HH24:MI'),
        'end', to_char(COALESCE(ws.friday_end, '17:00'::time), 'HH24:MI'),
        'break', COALESCE(ws.break_duration, 60)
      ) END,
    'saturday', CASE WHEN ws.saturday_start IS NULL AND ws.saturday_end IS NULL
      THEN jsonb_build_object('type', 'off')
      ELSE jsonb_build_object(
        'type', 'continuous',
        'start', to_char(COALESCE(ws.saturday_start, '08:00'::time), 'HH24:MI'),
        'end', to_char(COALESCE(ws.saturday_end, '17:00'::time), 'HH24:MI'),
        'break', COALESCE(ws.break_duration, 60)
      ) END,
    'sunday', CASE WHEN ws.sunday_start IS NULL AND ws.sunday_end IS NULL
      THEN jsonb_build_object('type', 'off')
      ELSE jsonb_build_object(
        'type', 'continuous',
        'start', to_char(COALESCE(ws.sunday_start, '08:00'::time), 'HH24:MI'),
        'end', to_char(COALESCE(ws.sunday_end, '17:00'::time), 'HH24:MI'),
        'break', COALESCE(ws.break_duration, 60)
      ) END
  ),
  day_off_mask = (
    (CASE WHEN ws.sunday_start IS NULL AND ws.sunday_end IS NULL THEN 1 ELSE 0 END) |
    (CASE WHEN ws.monday_start IS NULL AND ws.monday_end IS NULL THEN 2 ELSE 0 END) |
    (CASE WHEN ws.tuesday_start IS NULL AND ws.tuesday_end IS NULL THEN 4 ELSE 0 END) |
    (CASE WHEN ws.wednesday_start IS NULL AND ws.wednesday_end IS NULL THEN 8 ELSE 0 END) |
    (CASE WHEN ws.thursday_start IS NULL AND ws.thursday_end IS NULL THEN 16 ELSE 0 END) |
    (CASE WHEN ws.friday_start IS NULL AND ws.friday_end IS NULL THEN 32 ELSE 0 END) |
    (CASE WHEN ws.saturday_start IS NULL AND ws.saturday_end IS NULL THEN 64 ELSE 0 END)
  )::SMALLINT
WHERE ws.shift_config = '{}'::jsonb OR ws.shift_config IS NULL;

-- Resolve weekday config with legacy fallback
CREATE OR REPLACE FUNCTION public.resolve_shift_day_config(
  p_shift_config JSONB,
  p_day_key TEXT,
  p_legacy_start TIME,
  p_legacy_end TIME,
  p_global_break INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_day JSONB;
BEGIN
  IF p_shift_config IS NOT NULL AND p_shift_config ? p_day_key THEN
    v_day := p_shift_config -> p_day_key;
    IF v_day IS NOT NULL AND v_day ? 'type' THEN
      RETURN v_day;
    END IF;
  END IF;

  IF p_legacy_start IS NULL AND p_legacy_end IS NULL THEN
    RETURN jsonb_build_object('type', 'off');
  END IF;

  RETURN jsonb_build_object(
    'type', 'continuous',
    'start', to_char(COALESCE(p_legacy_start, '08:00'::time), 'HH24:MI'),
    'end', to_char(COALESCE(p_legacy_end, '17:00'::time), 'HH24:MI'),
    'break', COALESCE(p_global_break, 60)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.time_span_minutes(p_start TEXT, p_end TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s INTEGER;
  e INTEGER;
  sh INTEGER;
  sm INTEGER;
  eh INTEGER;
  em INTEGER;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR length(trim(p_start)) = 0 OR length(trim(p_end)) = 0 THEN
    RETURN 0;
  END IF;

  sh := split_part(p_start, ':', 1)::INTEGER;
  sm := split_part(p_start, ':', 2)::INTEGER;
  eh := split_part(p_end, ':', 1)::INTEGER;
  em := split_part(p_end, ':', 2)::INTEGER;
  s := sh * 60 + sm;
  e := eh * 60 + em;

  IF e >= s THEN
    RETURN e - s;
  END IF;
  RETURN (24 * 60 - s) + e;
END;
$$;

CREATE OR REPLACE FUNCTION public.work_schedule_expected_minutes(
  p_shift_config JSONB,
  p_day_key TEXT,
  p_legacy_start TIME,
  p_legacy_end TIME,
  p_global_break INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_day JSONB;
  v_type TEXT;
BEGIN
  v_day := public.resolve_shift_day_config(
    p_shift_config, p_day_key, p_legacy_start, p_legacy_end, p_global_break
  );
  v_type := v_day->>'type';

  IF v_type = 'off' THEN
    RETURN 0;
  ELSIF v_type = 'split' THEN
    RETURN public.time_span_minutes(v_day->>'m_start', v_day->>'m_end')
         + public.time_span_minutes(v_day->>'a_start', v_day->>'a_end');
  ELSE
    RETURN GREATEST(
      0,
      public.time_span_minutes(v_day->>'start', v_day->>'end')
        - COALESCE((v_day->>'break')::INTEGER, p_global_break, 60)
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.work_schedule_implicit_break_minutes(
  p_shift_config JSONB,
  p_day_key TEXT,
  p_legacy_start TIME,
  p_legacy_end TIME,
  p_global_break INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_day JSONB;
  v_type TEXT;
  v_gap INTEGER;
BEGIN
  v_day := public.resolve_shift_day_config(
    p_shift_config, p_day_key, p_legacy_start, p_legacy_end, p_global_break
  );
  v_type := v_day->>'type';

  IF v_type = 'off' THEN
    RETURN 0;
  ELSIF v_type = 'split' THEN
    v_gap := public.time_span_minutes(v_day->>'m_end', v_day->>'a_start');
    RETURN GREATEST(0, v_gap);
  ELSE
    RETURN COALESCE((v_day->>'break')::INTEGER, p_global_break, 60);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.date_to_day_key(p_date DATE)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (ARRAY['sunday','monday','tuesday','wednesday','thursday','friday','saturday'])[EXTRACT(DOW FROM p_date)::INTEGER + 1];
$$;

COMMENT ON FUNCTION public.work_schedule_expected_minutes(JSONB, TEXT, TIME, TIME, INTEGER) IS
  'Expected paid minutes for a weekday: off=0, continuous=(end-start)-break, split=sum of blocks.';

COMMENT ON FUNCTION public.work_schedule_implicit_break_minutes(JSONB, TEXT, TIME, TIME, INTEGER) IS
  'Break to subtract when lunch punches missing: split uses gap between blocks, continuous uses break minutes.';
