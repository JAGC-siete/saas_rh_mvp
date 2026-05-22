-- Batch hours: use resolve_effective_work_schedule_id per attendance record date.

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
  overtime_feriado_hours DECIMAL(5,2)
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
  v_shift_type TEXT;
  v_is_holiday BOOLEAN;
  v_calc_id UUID;
  v_time_segments JSONB;
  v_country TEXT;
  v_company_tz TEXT;
  v_tz TEXT;
  v_ordinary_override NUMERIC;
  v_ws RECORD;
  v_day_key TEXT;
  v_effective_ws_id UUID;
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
    v_effective_ws_id := public.resolve_effective_work_schedule_id(
      v_record.company_id,
      v_record.employee_id,
      v_record.date,
      v_record.work_schedule_id
    );

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
        WHEN TRIM(cpc.metadata->>'ordinary_hours_override') !~ '^[0-9]{1,2}(\.[0-9]{1,4})?$' THEN NULL
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
    IF v_effective_ws_id IS NOT NULL THEN
      SELECT * INTO v_ws FROM public.work_schedules WHERE id = v_effective_ws_id;
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
    v_shift_type := public.determine_shift_type(v_record.check_in, v_record.check_out, v_tz);

    v_time_segments := '[]'::jsonb;
    IF v_effective_ws_id IS NULL THEN
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
      lunch_minutes,
      time_segments,
      calculation_method
    ) VALUES (
      v_record.id,
      v_record.employee_id,
      v_effective_ws_id,
      GREATEST(0, v_total_minutes / 60.0),
      v_normal_hours,
      CASE WHEN v_is_holiday THEN 0 WHEN v_shift_type = 'diurno' THEN v_overtime_hours ELSE 0 END,
      CASE WHEN v_is_holiday THEN 0 WHEN v_shift_type = 'nocturno' THEN v_overtime_hours ELSE 0 END,
      CASE WHEN v_is_holiday THEN v_overtime_hours WHEN v_shift_type = 'mixto' THEN v_overtime_hours ELSE 0 END,
      v_break_minutes,
      v_time_segments,
      'automatic'
    )
    ON CONFLICT ON CONSTRAINT attendance_hours_calculation_attendance_record_id_key DO UPDATE SET
      work_schedule_id = EXCLUDED.work_schedule_id,
      total_hours = EXCLUDED.total_hours,
      normal_hours = EXCLUDED.normal_hours,
      overtime_diurno_hours = EXCLUDED.overtime_diurno_hours,
      overtime_nocturno_hours = EXCLUDED.overtime_nocturno_hours,
      overtime_feriado_hours = EXCLUDED.overtime_feriado_hours,
      lunch_minutes = EXCLUDED.lunch_minutes,
      time_segments = EXCLUDED.time_segments,
      calculated_at = NOW(),
      updated_at = NOW()
    RETURNING id INTO v_calc_id;

    IF v_overtime_hours > 0 AND v_shift_type IS NULL THEN
      UPDATE public.attendance_hours_calculation
      SET overtime_diurno_hours = v_overtime_hours
      WHERE id = v_calc_id;
    END IF;

    attendance_record_id := v_record.id;
    calculation_id := v_calc_id;
    total_hours := GREATEST(0, v_total_minutes / 60.0);
    normal_hours := v_normal_hours;
    overtime_diurno_hours := CASE WHEN v_is_holiday THEN 0 WHEN v_shift_type = 'diurno' THEN v_overtime_hours ELSE 0 END;
    overtime_nocturno_hours := CASE WHEN v_is_holiday THEN 0 WHEN v_shift_type = 'nocturno' THEN v_overtime_hours ELSE 0 END;
    overtime_feriado_hours := CASE WHEN v_is_holiday THEN v_overtime_hours WHEN v_shift_type = 'mixto' THEN v_overtime_hours ELSE 0 END;
    IF v_overtime_hours > 0 AND v_shift_type IS NULL THEN
      overtime_diurno_hours := v_overtime_hours;
    END IF;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculate_attendance_hours_batch(UUID[], INTEGER) IS
  'Batch hours with effective schedule resolution + shift_config break inference.';
