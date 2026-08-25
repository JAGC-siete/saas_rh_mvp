-- Keep attendance_records.date stable on UPDATE.
-- Deriving date from check_in moved correction rows to another year
-- (e.g. 2026-08-25 → 2025-08-25) and the employee vanished from the work day.

CREATE OR REPLACE FUNCTION public.set_local_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  ltz text := COALESCE(NEW.tz, 'America/Tegucigalpa');
BEGIN
  IF TG_OP = 'INSERT' AND NEW.date IS NULL THEN
    NEW.date := (
      COALESCE(NEW.check_in, NEW.check_out, now())
      AT TIME ZONE ltz
    )::date;
  END IF;

  NEW.local_date := NEW.date;
  NEW.tz_offset_minutes := -360; -- Honduras fijo
  RETURN NEW;
END;
$function$;
