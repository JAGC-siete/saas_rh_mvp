-- Backfill late_minutes / expected_check_in for biometric records materialized by
-- daily-close without tardiness fields (default late_minutes = 0).
-- Business threshold unchanged: KPI/list treat late as late_minutes > 5.
-- Skips finalized/admin_override rows and rows that already have non-zero late_minutes.

WITH resolved AS (
  SELECT
    ar.id AS record_id,
    ar.date AS record_date,
    ar.check_in,
    COALESCE(ar.tz, 'America/Tegucigalpa') AS tz,
    resolve_effective_work_schedule_id(
      e.company_id,
      e.id,
      ar.date,
      e.work_schedule_id
    ) AS ws_id
  FROM public.attendance_records ar
  JOIN public.employees e ON e.id = ar.employee_id
  WHERE ar.check_in IS NOT NULL
    AND ar.date >= (CURRENT_DATE - INTERVAL '90 days')
    AND COALESCE(ar.late_minutes, 0) = 0
    AND ar.expected_check_in IS NULL
    AND COALESCE(ar.flags->>'close_state', '') IS DISTINCT FROM 'finalized'
    AND COALESCE((ar.flags->>'admin_override')::boolean, false) IS NOT TRUE
),
with_schedule AS (
  SELECT
    r.record_id,
    r.check_in,
    r.tz,
    CASE public.date_to_day_key(r.record_date)
      WHEN 'monday' THEN ws.monday_start
      WHEN 'tuesday' THEN ws.tuesday_start
      WHEN 'wednesday' THEN ws.wednesday_start
      WHEN 'thursday' THEN ws.thursday_start
      WHEN 'friday' THEN ws.friday_start
      WHEN 'saturday' THEN ws.saturday_start
      WHEN 'sunday' THEN ws.sunday_start
    END AS expected_start
  FROM resolved r
  JOIN public.work_schedules ws ON ws.id = r.ws_id
  WHERE COALESCE(ws.shift_type, 'normal') <> 'flex'
),
calc AS (
  SELECT
    record_id,
    expected_start,
    (
      EXTRACT(HOUR FROM (check_in AT TIME ZONE tz)) * 60
      + EXTRACT(MINUTE FROM (check_in AT TIME ZONE tz))
      - EXTRACT(HOUR FROM expected_start) * 60
      - EXTRACT(MINUTE FROM expected_start)
    )::int AS raw_delta
  FROM with_schedule
  WHERE expected_start IS NOT NULL
),
bounded AS (
  SELECT
    record_id,
    expected_start,
    -- Match lib/attendance/compute-late-minutes LATE_MINUTES_MAX_ABS_MINUTES (240):
    -- punches outside the start window are not KPI tarde/temprano.
    CASE
      WHEN ABS(raw_delta) > 240 THEN 0
      ELSE raw_delta
    END AS late_minutes_calc
  FROM calc
)
UPDATE public.attendance_records ar
SET
  expected_check_in = b.expected_start,
  late_minutes = b.late_minutes_calc,
  updated_at = NOW()
FROM bounded b
WHERE ar.id = b.record_id;

COMMENT ON COLUMN public.attendance_records.late_minutes IS
  'Signed minutes vs expected start (positive=late). KPI tarde uses > 5. Filled by register and daily-close; historical biometric rows backfilled 2026-08-07.';
