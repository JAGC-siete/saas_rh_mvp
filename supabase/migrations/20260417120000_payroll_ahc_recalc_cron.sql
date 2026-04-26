CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.recalculate_missing_ahc_for_date(p_target_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  v_company RECORD;
  v_record_ids UUID[];
  v_missing_ids UUID[];
  v_existing_ids UUID[];
  v_complete_count INT;
  v_missing_count INT;
  v_calculated_count INT;
  v_total_missing INT := 0;
  v_total_calculated INT := 0;
  v_total_companies INT := 0;
BEGIN
  IF p_target_date IS NULL THEN
    RAISE EXCEPTION 'p_target_date is required';
  END IF;

  FOR v_company IN
    SELECT id
    FROM public.companies
    WHERE is_active IS TRUE
  LOOP
    v_total_companies := v_total_companies + 1;

    SELECT array_agg(ar.id)
    INTO v_record_ids
    FROM public.attendance_records ar
    JOIN public.employees e ON e.id = ar.employee_id
    WHERE e.company_id = v_company.id
      AND e.status = 'active'
      AND ar.date = p_target_date
      AND ar.check_in IS NOT NULL
      AND ar.check_out IS NOT NULL;

    v_complete_count := COALESCE(array_length(v_record_ids, 1), 0);
    IF v_complete_count = 0 THEN
      CONTINUE;
    END IF;

    SELECT array_agg(ahc.attendance_record_id)
    INTO v_existing_ids
    FROM public.attendance_hours_calculation ahc
    WHERE ahc.attendance_record_id = ANY(v_record_ids);

    SELECT array_agg(x)
    INTO v_missing_ids
    FROM (
      SELECT unnest(v_record_ids) AS x
      EXCEPT
      SELECT unnest(COALESCE(v_existing_ids, ARRAY[]::uuid[])) AS x
    ) t;

    v_missing_count := COALESCE(array_length(v_missing_ids, 1), 0);
    v_total_missing := v_total_missing + v_missing_count;

    IF v_missing_count = 0 THEN
      CONTINUE;
    END IF;

    SELECT COUNT(*) INTO v_calculated_count
    FROM public.calculate_attendance_hours_batch(v_missing_ids, EXTRACT(YEAR FROM p_target_date)::INT);

    v_total_calculated := v_total_calculated + COALESCE(v_calculated_count, 0);
  END LOOP;

  RETURN jsonb_build_object(
    'target_date', p_target_date,
    'companies', v_total_companies,
    'missing', v_total_missing,
    'calculated', v_total_calculated
  );
END;
$$;

REVOKE ALL ON FUNCTION app_private.recalculate_missing_ahc_for_date(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.recalculate_missing_ahc_for_date(DATE) TO service_role;

COMMENT ON FUNCTION app_private.recalculate_missing_ahc_for_date(DATE) IS
  'Backfills attendance_hours_calculation rows for complete records (check_in/out) of a given date across all active companies.';

CREATE OR REPLACE FUNCTION app_private.recalculate_missing_ahc_yesterday()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  v_date DATE;
BEGIN
  v_date := (now() AT TIME ZONE 'America/Tegucigalpa')::date - 1;
  RETURN app_private.recalculate_missing_ahc_for_date(v_date);
END;
$$;

REVOKE ALL ON FUNCTION app_private.recalculate_missing_ahc_yesterday() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.recalculate_missing_ahc_yesterday() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron' AND installed_version IS NOT NULL) THEN
    BEGIN
      PERFORM cron.unschedule('recalculate_missing_ahc_yesterday');
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;

    PERFORM cron.schedule(
      'recalculate_missing_ahc_yesterday',
      '30 2 * * *',
      $job$SELECT app_private.recalculate_missing_ahc_yesterday();$job$
    );
  END IF;
EXCEPTION
  WHEN undefined_function THEN
    NULL;
  WHEN insufficient_privilege THEN
    NULL;
END;
$$;