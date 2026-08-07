-- Widen late_minutes acceptance window from 90m to 240m.
-- Records that were zeroed by the prior backfill (e.g. +110m late) get recalculated.
-- Night punches vs morning start (typically >4h) remain late_minutes = 0.

WITH candidates AS (
  SELECT
    ar.id AS record_id,
    ar.expected_check_in,
    (
      EXTRACT(HOUR FROM (ar.check_in AT TIME ZONE COALESCE(ar.tz, 'America/Tegucigalpa'))) * 60
      + EXTRACT(MINUTE FROM (ar.check_in AT TIME ZONE COALESCE(ar.tz, 'America/Tegucigalpa')))
      - EXTRACT(HOUR FROM ar.expected_check_in) * 60
      - EXTRACT(MINUTE FROM ar.expected_check_in)
    )::int AS raw_delta
  FROM public.attendance_records ar
  WHERE ar.check_in IS NOT NULL
    AND ar.expected_check_in IS NOT NULL
    AND COALESCE(ar.late_minutes, 0) = 0
    AND ar.date >= (CURRENT_DATE - INTERVAL '90 days')
    AND COALESCE(ar.flags->>'close_state', '') IS DISTINCT FROM 'finalized'
    AND COALESCE((ar.flags->>'admin_override')::boolean, false) IS NOT TRUE
),
fixed AS (
  SELECT record_id, raw_delta
  FROM candidates
  WHERE ABS(raw_delta) > 90
    AND ABS(raw_delta) <= 240
)
UPDATE public.attendance_records ar
SET
  late_minutes = f.raw_delta,
  updated_at = NOW()
FROM fixed f
WHERE ar.id = f.record_id;
