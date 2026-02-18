-- Migration: Capa Base - Jornada regular tope 8h universal (agnóstico de horario)
-- Date: 2026-02-18
-- Description: El cálculo de horas SIEMPRE usa 8h como tope de jornada regular.
-- Horas extra = cualquier exceso sobre 8h de labor efectiva, con o sin horario asignado.
-- Los horarios rotativos o fuera de rango no generan conflictos: siempre caen en cálculo base.

CREATE OR REPLACE FUNCTION calculate_attendance_hours_batch(
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
  v_law labor_laws%ROWTYPE;
  v_record RECORD;
  v_break_minutes INTEGER;
  v_lunch_minutes NUMERIC;
  v_regular_cap_hours DECIMAL(5,2);  -- CAPA BASE: siempre 8h (legal_daily_hours)
  v_total_minutes NUMERIC;
  v_normal_hours DECIMAL(5,2);
  v_overtime_hours DECIMAL(5,2);
  v_shift_type TEXT;
  v_is_holiday BOOLEAN;
  v_calc_id UUID;
  v_emp_record RECORD;
  v_time_segments JSONB;
BEGIN
  SELECT * INTO v_law FROM labor_laws 
  WHERE country_code = 'HND' 
    AND year = COALESCE(p_law_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
    AND is_active = TRUE
  ORDER BY year DESC LIMIT 1;
  
  IF v_law IS NULL THEN
    RAISE EXCEPTION 'No labor_laws found for year %', COALESCE(p_law_year, EXTRACT(YEAR FROM CURRENT_DATE));
  END IF;
  
  -- CAPA BASE: Tope de jornada regular = legal_daily_hours (8h). Agnóstico de horario.
  v_regular_cap_hours := COALESCE(v_law.legal_daily_hours, 8.00);
  
  FOR v_record IN 
    SELECT ar.id, ar.employee_id, ar.date, ar.check_in, ar.check_out, ar.lunch_start, ar.lunch_end, ar.flags,
           e.work_schedule_id, e.company_id
    FROM attendance_records ar
    JOIN employees e ON e.id = ar.employee_id
    WHERE ar.id = ANY(p_record_ids)
      AND ar.check_in IS NOT NULL 
      AND ar.check_out IS NOT NULL
  LOOP
    SELECT * INTO v_emp_record FROM employees WHERE id = v_record.employee_id;

    -- Lunch: use actual lunch_start/lunch_end when present (4-marks flow), else schedule/law default
    IF v_record.lunch_start IS NOT NULL AND v_record.lunch_end IS NOT NULL THEN
      v_lunch_minutes := EXTRACT(EPOCH FROM (v_record.lunch_end - v_record.lunch_start)) / 60.0;
      v_break_minutes := GREATEST(0, v_lunch_minutes)::INTEGER;
    ELSE
      v_break_minutes := COALESCE(
        (SELECT break_duration FROM work_schedules WHERE id = v_record.work_schedule_id),
        v_law.mandatory_break_minutes,
        60
      );
    END IF;
    
    -- Total effective minutes (check_out - check_in - break)
    v_total_minutes := EXTRACT(EPOCH FROM (v_record.check_out - v_record.check_in)) / 60.0;
    v_total_minutes := v_total_minutes - v_break_minutes;
    
    -- CAPA BASE: Siempre 8h como tope de jornada regular. Overtime = exceso sobre 8h.
    -- No usamos get_expected_hours_for_date para el cálculo de horas (solo para Capa 2 cumplimiento).
    IF v_total_minutes / 60.0 <= v_regular_cap_hours THEN
      v_normal_hours := v_total_minutes / 60.0;
      v_overtime_hours := 0;
    ELSE
      v_normal_hours := v_regular_cap_hours;
      v_overtime_hours := (v_total_minutes / 60.0) - v_regular_cap_hours;
    END IF;
    
    v_is_holiday := is_holiday_date(v_record.date, v_record.company_id);
    v_shift_type := determine_shift_type(v_record.check_in, v_record.check_out, 'America/Tegucigalpa');
    
    -- Capa 1 sobre error: si horario_no_detectado o sin work_schedule, proceder con 8h base (ya aplicado)
    -- time_segments guarda metadata para UI/alertas del administrador
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
    
    INSERT INTO attendance_hours_calculation (
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
      v_record.work_schedule_id,
      GREATEST(0, v_total_minutes / 60.0),
      v_normal_hours,
      CASE WHEN v_is_holiday THEN 0 WHEN v_shift_type = 'diurno' THEN v_overtime_hours ELSE 0 END,
      CASE WHEN v_is_holiday THEN 0 WHEN v_shift_type = 'nocturno' THEN v_overtime_hours ELSE 0 END,
      CASE WHEN v_is_holiday THEN v_overtime_hours WHEN v_shift_type = 'mixto' THEN v_overtime_hours ELSE 0 END,
      v_break_minutes,
      v_time_segments,
      'automatic'
    )
    ON CONFLICT (attendance_record_id) DO UPDATE SET
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
      UPDATE attendance_hours_calculation
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

COMMENT ON FUNCTION calculate_attendance_hours_batch(UUID[], INTEGER) IS 
  'Capa Base: Jornada regular tope 8h (legal_daily_hours). Overtime = exceso sobre 8h. Agnóstico de horario. Rotativos caen en cálculo base.';
