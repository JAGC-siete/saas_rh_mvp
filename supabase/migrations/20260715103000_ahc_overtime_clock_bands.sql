-- AHC: clasificar HE por franjas de reloj (25/50/75/100%) en lugar de diurno/nocturno/feriado por turno.

ALTER TABLE public.attendance_hours_calculation
  ADD COLUMN IF NOT EXISTS overtime_evening_25_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_night_50_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_late_75_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_morning_25_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_holiday_100_hours DECIMAL(5,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.attendance_hours_calculation.overtime_evening_25_hours IS
  'HE 17:00–18:59 (y diurna residual) @ 25%';
COMMENT ON COLUMN public.attendance_hours_calculation.overtime_night_50_hours IS
  'HE 19:00–21:59 @ 50%';
COMMENT ON COLUMN public.attendance_hours_calculation.overtime_late_75_hours IS
  'HE 22:00–04:59 @ 75%';
COMMENT ON COLUMN public.attendance_hours_calculation.overtime_morning_25_hours IS
  'HE 05:00–07:59 @ 25%';
COMMENT ON COLUMN public.attendance_hours_calculation.overtime_holiday_100_hours IS
  'HE en día feriado @ 100%';

-- Clasifica minuto-del-día local (0–1439) → banda (no feriado).
CREATE OR REPLACE FUNCTION public.classify_overtime_minute_band(p_minute_of_day INTEGER)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_minute_of_day >= 17 * 60 AND p_minute_of_day < 19 * 60 THEN 'evening_25'
    WHEN p_minute_of_day >= 19 * 60 AND p_minute_of_day < 22 * 60 THEN 'night_50'
    WHEN p_minute_of_day >= 22 * 60 OR p_minute_of_day < 5 * 60 THEN 'late_75'
    WHEN p_minute_of_day >= 5 * 60 AND p_minute_of_day < 8 * 60 THEN 'morning_25'
    ELSE 'evening_25'
  END;
$$;

/**
 * Reparte minutos de HE (después del tope ordinario) en franjas de reloj.
 * Camina el timeline trabajado (excluye almuerzo) minuto a minuto.
 */
CREATE OR REPLACE FUNCTION public.allocate_overtime_by_clock_bands(
  p_check_in TIMESTAMPTZ,
  p_check_out TIMESTAMPTZ,
  p_lunch_start TIMESTAMPTZ,
  p_lunch_end TIMESTAMPTZ,
  p_ordinary_cap_hours NUMERIC,
  p_is_holiday BOOLEAN,
  p_tz TEXT
)
RETURNS TABLE (
  evening_25 NUMERIC,
  night_50 NUMERIC,
  late_75 NUMERIC,
  morning_25 NUMERIC,
  holiday_100 NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_cap_minutes INTEGER;
  v_ordinary_left INTEGER;
  v_minute TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_local_min INTEGER;
  v_band TEXT;
  v_e NUMERIC := 0;
  v_n NUMERIC := 0;
  v_l NUMERIC := 0;
  v_m NUMERIC := 0;
  v_h NUMERIC := 0;
  v_seg_starts TIMESTAMPTZ[];
  v_seg_ends TIMESTAMPTZ[];
  v_i INTEGER;
BEGIN
  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_out <= p_check_in THEN
    evening_25 := 0; night_50 := 0; late_75 := 0; morning_25 := 0; holiday_100 := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  v_cap_minutes := GREATEST(0, ROUND(COALESCE(p_ordinary_cap_hours, 8) * 60)::INTEGER);
  v_ordinary_left := v_cap_minutes;

  IF p_lunch_start IS NOT NULL AND p_lunch_end IS NOT NULL
     AND p_lunch_start > p_check_in AND p_lunch_end < p_check_out AND p_lunch_end > p_lunch_start THEN
    v_seg_starts := ARRAY[p_check_in, p_lunch_end];
    v_seg_ends := ARRAY[p_lunch_start, p_check_out];
  ELSE
    v_seg_starts := ARRAY[p_check_in];
    v_seg_ends := ARRAY[p_check_out];
  END IF;

  FOR v_i IN 1 .. COALESCE(array_length(v_seg_starts, 1), 0) LOOP
    v_minute := date_trunc('minute', v_seg_starts[v_i]);
    IF v_minute < v_seg_starts[v_i] THEN
      v_minute := v_minute + INTERVAL '1 minute';
    END IF;
    v_end := v_seg_ends[v_i];

    WHILE v_minute < v_end LOOP
      IF v_ordinary_left > 0 THEN
        v_ordinary_left := v_ordinary_left - 1;
      ELSIF COALESCE(p_is_holiday, FALSE) THEN
        v_h := v_h + (1.0 / 60.0);
      ELSE
        v_local_min := (
          EXTRACT(HOUR FROM (v_minute AT TIME ZONE p_tz))::INTEGER * 60
          + EXTRACT(MINUTE FROM (v_minute AT TIME ZONE p_tz))::INTEGER
        );
        v_band := public.classify_overtime_minute_band(v_local_min);
        IF v_band = 'evening_25' THEN v_e := v_e + (1.0 / 60.0);
        ELSIF v_band = 'night_50' THEN v_n := v_n + (1.0 / 60.0);
        ELSIF v_band = 'late_75' THEN v_l := v_l + (1.0 / 60.0);
        ELSIF v_band = 'morning_25' THEN v_m := v_m + (1.0 / 60.0);
        ELSE v_e := v_e + (1.0 / 60.0);
        END IF;
      END IF;
      v_minute := v_minute + INTERVAL '1 minute';
    END LOOP;
  END LOOP;

  evening_25 := ROUND(v_e::NUMERIC, 2);
  night_50 := ROUND(v_n::NUMERIC, 2);
  late_75 := ROUND(v_l::NUMERIC, 2);
  morning_25 := ROUND(v_m::NUMERIC, 2);
  holiday_100 := ROUND(v_h::NUMERIC, 2);
  RETURN NEXT;
END;
$$;

DROP FUNCTION IF EXISTS public.calculate_attendance_hours_batch(UUID[], INTEGER);

CREATE OR REPLACE FUNCTION public.calculate_attendance_hours_batch(
  p_record_ids UUID[],
  p_law_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
  attendance_record_id UUID,
  calculation_id UUID,
  total_hours DECIMAL(5,2),
  normal_hours DECIMAL(5,2),
  overtime_diurno_hours DECIMAL(5,2),
  overtime_nocturno_hours DECIMAL(5,2),
  overtime_feriado_hours DECIMAL(5,2),
  overtime_evening_25_hours DECIMAL(5,2),
  overtime_night_50_hours DECIMAL(5,2),
  overtime_late_75_hours DECIMAL(5,2),
  overtime_morning_25_hours DECIMAL(5,2),
  overtime_holiday_100_hours DECIMAL(5,2)
) AS $$
DECLARE
  v_law public.labor_laws%ROWTYPE;
  v_record RECORD;
  v_break_minutes INTEGER;
  v_lunch_minutes NUMERIC;
  v_regular_cap_hours DECIMAL(5,2);
  v_total_minutes NUMERIC;
  v_normal_hours DECIMAL(5,2);
  v_overtime_hours DECIMAL(5,2);
  v_is_holiday BOOLEAN;
  v_calc_id UUID;
  v_time_segments JSONB;
  v_country TEXT;
  v_company_tz TEXT;
  v_tz TEXT;
  v_ordinary_override NUMERIC;
  v_ws RECORD;
  v_day_key TEXT;
  v_bands RECORD;
BEGIN
  IF p_record_ids IS NULL OR array_length(p_record_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  FOR v_record IN
    SELECT ar.id, ar.employee_id, ar.date, ar.check_in, ar.check_out, ar.lunch_start, ar.lunch_end, ar.flags,
           e.work_schedule_id, e.company_id
    FROM public.attendance_records ar
    JOIN public.employees e ON e.id = ar.employee_id
    WHERE ar.id = ANY(p_record_ids)
      AND ar.check_in IS NOT NULL
      AND ar.check_out IS NOT NULL
  LOOP
    SELECT
      COALESCE(c.country_code, 'HND'),
      NULLIF(TRIM(COALESCE(c.timezone, c.settings->>'timezone', '')), '')
    INTO v_country, v_company_tz
    FROM public.companies c
    WHERE c.id = v_record.company_id;

    IF v_country IS NULL THEN
      v_country := 'HND';
    END IF;

    v_tz := COALESCE(
      v_company_tz,
      CASE COALESCE(v_country, 'HND')
        WHEN 'SLV' THEN 'America/El_Salvador'
        WHEN 'GTM' THEN 'America/Guatemala'
        ELSE 'America/Tegucigalpa'
      END
    );

    SELECT * INTO v_law
    FROM public.labor_laws ll
    WHERE ll.country_code = v_country
      AND ll.year = COALESCE(p_law_year, EXTRACT(YEAR FROM v_record.date)::INTEGER)
      AND ll.is_active = TRUE
    ORDER BY ll.year DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No labor_laws for country % year %', v_country,
        COALESCE(p_law_year, EXTRACT(YEAR FROM v_record.date)::INTEGER);
    END IF;

    v_ordinary_override := NULL;
    SELECT
      CASE
        WHEN NULLIF(TRIM(cpc.metadata->>'ordinary_hours_override'), '') IS NULL THEN NULL
        WHEN TRIM(cpc.metadata->>'ordinary_hours_override') !~ '^[0-9]{1,2}([.][0-9]{1,4})?$' THEN NULL
        ELSE TRIM(cpc.metadata->>'ordinary_hours_override')::NUMERIC
      END
    INTO v_ordinary_override
    FROM public.company_payroll_configs cpc
    WHERE cpc.company_id = v_record.company_id
      AND cpc.is_active = TRUE
    LIMIT 1;

    IF v_ordinary_override IS NOT NULL AND (v_ordinary_override < 1 OR v_ordinary_override > 16) THEN
      v_ordinary_override := NULL;
    END IF;

    v_regular_cap_hours := COALESCE(v_ordinary_override, v_law.legal_daily_hours, 8.00);

    v_ws := NULL;
    IF v_record.work_schedule_id IS NOT NULL THEN
      SELECT * INTO v_ws FROM public.work_schedules WHERE id = v_record.work_schedule_id;
    END IF;

    v_day_key := public.date_to_day_key(v_record.date);

    IF v_record.lunch_start IS NOT NULL AND v_record.lunch_end IS NOT NULL THEN
      v_lunch_minutes := EXTRACT(EPOCH FROM (v_record.lunch_end - v_record.lunch_start)) / 60.0;
      v_break_minutes := GREATEST(0, v_lunch_minutes)::INTEGER;
    ELSIF v_ws IS NOT NULL THEN
      v_break_minutes := public.work_schedule_implicit_break_minutes(
        COALESCE(v_ws.shift_config, '{}'::jsonb),
        v_day_key,
        CASE v_day_key
          WHEN 'monday' THEN v_ws.monday_start
          WHEN 'tuesday' THEN v_ws.tuesday_start
          WHEN 'wednesday' THEN v_ws.wednesday_start
          WHEN 'thursday' THEN v_ws.thursday_start
          WHEN 'friday' THEN v_ws.friday_start
          WHEN 'saturday' THEN v_ws.saturday_start
          WHEN 'sunday' THEN v_ws.sunday_start
          ELSE NULL
        END,
        CASE v_day_key
          WHEN 'monday' THEN v_ws.monday_end
          WHEN 'tuesday' THEN v_ws.tuesday_end
          WHEN 'wednesday' THEN v_ws.wednesday_end
          WHEN 'thursday' THEN v_ws.thursday_end
          WHEN 'friday' THEN v_ws.friday_end
          WHEN 'saturday' THEN v_ws.saturday_end
          WHEN 'sunday' THEN v_ws.sunday_end
          ELSE NULL
        END,
        COALESCE(v_ws.break_duration, v_law.mandatory_break_minutes, 60)
      );
    ELSE
      v_break_minutes := COALESCE(v_law.mandatory_break_minutes, 60);
    END IF;

    v_total_minutes := EXTRACT(EPOCH FROM (v_record.check_out - v_record.check_in)) / 60.0;
    v_total_minutes := v_total_minutes - v_break_minutes;

    IF v_total_minutes / 60.0 <= v_regular_cap_hours THEN
      v_normal_hours := v_total_minutes / 60.0;
      v_overtime_hours := 0;
    ELSE
      v_normal_hours := v_regular_cap_hours;
      v_overtime_hours := (v_total_minutes / 60.0) - v_regular_cap_hours;
    END IF;

    v_is_holiday := public.is_holiday_date(v_record.date, v_record.company_id);

    SELECT * INTO v_bands
    FROM public.allocate_overtime_by_clock_bands(
      v_record.check_in,
      v_record.check_out,
      v_record.lunch_start,
      v_record.lunch_end,
      v_regular_cap_hours,
      v_is_holiday,
      v_tz
    );

    -- Si no hubo HE por timeline (edge), forzar total OT en evening_25 / holiday
    IF v_overtime_hours > 0
       AND COALESCE(v_bands.evening_25, 0) + COALESCE(v_bands.night_50, 0)
         + COALESCE(v_bands.late_75, 0) + COALESCE(v_bands.morning_25, 0)
         + COALESCE(v_bands.holiday_100, 0) = 0 THEN
      IF v_is_holiday THEN
        v_bands.holiday_100 := ROUND(v_overtime_hours::NUMERIC, 2);
      ELSE
        v_bands.evening_25 := ROUND(v_overtime_hours::NUMERIC, 2);
      END IF;
    END IF;

    v_time_segments := '[]'::jsonb;
    IF v_record.work_schedule_id IS NULL THEN
      v_time_segments := jsonb_build_object(
        'horario_no_detectado', true,
        'razon', 'sin_horario_asignado'
      );
    ELSIF v_record.flags IS NOT NULL AND (v_record.flags->>'horario_no_detectado') = 'true' THEN
      v_time_segments := jsonb_build_object(
        'horario_no_detectado', true,
        'razon', COALESCE(v_record.flags->>'razon', 'distancia_horario_excedida'),
        'gap_minutos', (v_record.flags->>'gap_minutos')::INTEGER
      );
    END IF;

    INSERT INTO public.attendance_hours_calculation (
      attendance_record_id,
      employee_id,
      work_schedule_id,
      total_hours,
      normal_hours,
      overtime_diurno_hours,
      overtime_nocturno_hours,
      overtime_feriado_hours,
      overtime_evening_25_hours,
      overtime_night_50_hours,
      overtime_late_75_hours,
      overtime_morning_25_hours,
      overtime_holiday_100_hours,
      lunch_minutes,
      time_segments,
      calculation_method
    ) VALUES (
      v_record.id,
      v_record.employee_id,
      v_record.work_schedule_id,
      GREATEST(0, v_total_minutes / 60.0),
      v_normal_hours,
      -- legacy mirrors (approx; late_75 solo en columnas nuevas)
      ROUND((COALESCE(v_bands.evening_25, 0) + COALESCE(v_bands.morning_25, 0))::NUMERIC, 2),
      ROUND((COALESCE(v_bands.night_50, 0) + COALESCE(v_bands.late_75, 0))::NUMERIC, 2),
      ROUND(COALESCE(v_bands.holiday_100, 0)::NUMERIC, 2),
      ROUND(COALESCE(v_bands.evening_25, 0)::NUMERIC, 2),
      ROUND(COALESCE(v_bands.night_50, 0)::NUMERIC, 2),
      ROUND(COALESCE(v_bands.late_75, 0)::NUMERIC, 2),
      ROUND(COALESCE(v_bands.morning_25, 0)::NUMERIC, 2),
      ROUND(COALESCE(v_bands.holiday_100, 0)::NUMERIC, 2),
      v_break_minutes,
      v_time_segments,
      'automatic'
    )
    ON CONFLICT ON CONSTRAINT attendance_hours_calculation_attendance_record_id_key DO UPDATE SET
      total_hours = EXCLUDED.total_hours,
      normal_hours = EXCLUDED.normal_hours,
      overtime_diurno_hours = EXCLUDED.overtime_diurno_hours,
      overtime_nocturno_hours = EXCLUDED.overtime_nocturno_hours,
      overtime_feriado_hours = EXCLUDED.overtime_feriado_hours,
      overtime_evening_25_hours = EXCLUDED.overtime_evening_25_hours,
      overtime_night_50_hours = EXCLUDED.overtime_night_50_hours,
      overtime_late_75_hours = EXCLUDED.overtime_late_75_hours,
      overtime_morning_25_hours = EXCLUDED.overtime_morning_25_hours,
      overtime_holiday_100_hours = EXCLUDED.overtime_holiday_100_hours,
      lunch_minutes = EXCLUDED.lunch_minutes,
      time_segments = EXCLUDED.time_segments,
      calculated_at = NOW(),
      updated_at = NOW()
    RETURNING id INTO v_calc_id;

    attendance_record_id := v_record.id;
    calculation_id := v_calc_id;
    total_hours := GREATEST(0, v_total_minutes / 60.0);
    normal_hours := v_normal_hours;
    overtime_evening_25_hours := ROUND(COALESCE(v_bands.evening_25, 0)::NUMERIC, 2);
    overtime_night_50_hours := ROUND(COALESCE(v_bands.night_50, 0)::NUMERIC, 2);
    overtime_late_75_hours := ROUND(COALESCE(v_bands.late_75, 0)::NUMERIC, 2);
    overtime_morning_25_hours := ROUND(COALESCE(v_bands.morning_25, 0)::NUMERIC, 2);
    overtime_holiday_100_hours := ROUND(COALESCE(v_bands.holiday_100, 0)::NUMERIC, 2);
    overtime_diurno_hours := ROUND((overtime_evening_25_hours + overtime_morning_25_hours)::NUMERIC, 2);
    overtime_nocturno_hours := ROUND((overtime_night_50_hours + overtime_late_75_hours)::NUMERIC, 2);
    overtime_feriado_hours := overtime_holiday_100_hours;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculate_attendance_hours_batch(UUID[], INTEGER) IS
  'Batch hours: HE clasificada por franjas de reloj 25/50/75/100% (+ columnas legacy).';
