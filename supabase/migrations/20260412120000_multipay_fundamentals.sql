-- Multipay fundamentals: company country, tax_brackets uniqueness, statutory params,
-- is_holiday_date + calculate_attendance_hours_batch by company country,
-- placeholder labor_laws for SLV/GTM (verify legally before production).

-- 1) companies.country_code (ISO 3166-1 alpha-3)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'HND';

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_country_code_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_country_code_check
  CHECK (country_code IN ('HND', 'SLV', 'GTM'));

COMMENT ON COLUMN public.companies.country_code IS 'ISO 3166-1 alpha-3. Immutable in normal ops after onboarding.';

CREATE INDEX IF NOT EXISTS idx_companies_country_code ON public.companies(country_code);

-- 1b) companies.timezone (IANA) — determine_shift_type en batch usa esta columna con fallback por país
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS timezone TEXT;

COMMENT ON COLUMN public.companies.timezone IS
  'IANA timezone; NULL or empty = infer from country_code (backfilled below).';

UPDATE public.companies
SET timezone = CASE country_code
  WHEN 'SLV' THEN 'America/El_Salvador'
  WHEN 'GTM' THEN 'America/Guatemala'
  ELSE 'America/Tegucigalpa'
END
WHERE timezone IS NULL OR TRIM(COALESCE(timezone, '')) = '';

-- 2) tax_brackets: allow one row per (country, year)
ALTER TABLE public.tax_brackets DROP CONSTRAINT IF EXISTS tax_brackets_year_key;

CREATE UNIQUE INDEX IF NOT EXISTS tax_brackets_country_year_unique
  ON public.tax_brackets(country_code, year);

-- 3) payroll_statutory_params
CREATE TABLE IF NOT EXISTS public.payroll_statutory_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  year INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  statutory_config JSONB NOT NULL,
  source TEXT DEFAULT 'official',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payroll_statutory_params_country_check
    CHECK (country_code IN ('HND', 'SLV', 'GTM')),
  CONSTRAINT payroll_statutory_params_year_check
    CHECK (year >= 2000 AND year <= 2100),
  CONSTRAINT payroll_statutory_params_config_object
    CHECK (jsonb_typeof(statutory_config) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS payroll_statutory_params_country_year_unique
  ON public.payroll_statutory_params(country_code, year);

CREATE INDEX IF NOT EXISTS payroll_statutory_params_active_year
  ON public.payroll_statutory_params(country_code, year)
  WHERE is_active = true;

COMMENT ON TABLE public.payroll_statutory_params IS
  'Country/year statutory payroll parameters (JSON). tax_brackets remains for HND columnar compatibility.';

ALTER TABLE public.payroll_statutory_params ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payroll_statutory_params_select_authenticated ON public.payroll_statutory_params;
CREATE POLICY payroll_statutory_params_select_authenticated
  ON public.payroll_statutory_params
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS payroll_statutory_params_super_admin_all ON public.payroll_statutory_params;
CREATE POLICY payroll_statutory_params_super_admin_all
  ON public.payroll_statutory_params
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

DROP TRIGGER IF EXISTS payroll_statutory_params_updated_at ON public.payroll_statutory_params;
CREATE TRIGGER payroll_statutory_params_updated_at
  BEFORE UPDATE ON public.payroll_statutory_params
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill HND from tax_brackets
INSERT INTO public.payroll_statutory_params (
  country_code,
  year,
  is_active,
  statutory_config,
  source,
  notes
)
SELECT
  tb.country_code,
  tb.year,
  tb.is_active,
  jsonb_build_object(
    'schemaVersion', 1,
    'engine', 'HND',
    'minimum_wage', tb.minimum_wage,
    'ihss_ceiling', tb.ihss_ceiling,
    'ihss_employee_rate', tb.ihss_employee_rate,
    'rap_rate', tb.rap_rate,
    'isr_brackets', tb.isr_brackets,
    'medical_deduction_limit', COALESCE(tb.medical_deduction_limit, 40000)
  ),
  COALESCE(tb.source, 'backfill_tax_brackets'),
  'Backfilled from tax_brackets row'
FROM public.tax_brackets tb
WHERE NOT EXISTS (
  SELECT 1 FROM public.payroll_statutory_params p
  WHERE p.country_code = tb.country_code AND p.year = tb.year
);

-- Placeholder SLV / GTM statutory (compliance review required)
INSERT INTO public.payroll_statutory_params (country_code, year, is_active, statutory_config, source, notes)
SELECT v.country_code, v.year, v.is_active, v.statutory_config, v.source, v.notes
FROM (VALUES
  (
    'SLV'::text,
    2026,
    true,
    jsonb_build_object(
      'schemaVersion', 1,
      'engine', 'SLV',
      'currency', 'USD',
      'isss', jsonb_build_object('employeeRate', 0.03, 'monthlyCeiling', 1000),
      'afp', jsonb_build_object('employeeRate', 0.0725),
      'insafrop', jsonb_build_object('employerRate', 0.01, 'minEmployees', 10),
      'isr_brackets', '[]'::jsonb,
      'disclaimer', 'PLACEHOLDER — official MH retention tables required for production.'
    ),
    'placeholder',
    'Seeded placeholder. Validate with certified accountant.'
  ),
  (
    'GTM',
    2026,
    true,
    jsonb_build_object(
      'schemaVersion', 1,
      'engine', 'GTM',
      'currency', 'GTQ',
      'igss', jsonb_build_object('employeeRate', 0.0483),
      'intecap', jsonb_build_object('employerRate', 0.01),
      'irtra', jsonb_build_object('employerRate', 0.01),
      'minimum_incentive_bonus', 250,
      'isr_mode', 'annual_projection_placeholder',
      'disclaimer', 'PLACEHOLDER — full SAT-compliant ISR before production.'
    ),
    'placeholder',
    'Seeded placeholder. Validate CE and SAT with certified accountant.'
  )
) AS v(country_code, year, is_active, statutory_config, source, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.payroll_statutory_params p
  WHERE p.country_code = v.country_code AND p.year = v.year
);

-- 4) labor_laws placeholders (labor + empty holidays; fiscal columns unused — use payroll_statutory_params)
INSERT INTO public.labor_laws (
  country_code, year, is_active,
  legal_daily_hours, legal_weekly_hours, legal_weekly_days,
  overtime_threshold_hours, overtime_diurno_rate, overtime_nocturno_rate, overtime_feriado_rate,
  mandatory_break_minutes, break_required_after_hours, minimum_rest_between_shifts_hours,
  minimum_wage, ihss_ceiling, ihss_employee_rate, rap_rate,
  holidays, notes
)
SELECT * FROM (VALUES
  (
    'SLV'::text, 2026, true,
    8.00::numeric, 44.00::numeric, 6,
    8.00::numeric, 2.00::numeric, 2.00::numeric, 2.00::numeric,
    30, 5.00::numeric, 10.00::numeric,
    0::numeric, 0::numeric, 0::numeric, 0::numeric,
    '[]'::jsonb,
    'PLACEHOLDER labor rules. Overtime multipliers set to 2.0 (100% extra) approx.; verify MTPS. Fiscal columns deprecated — use payroll_statutory_params.'
  ),
  (
    'GTM', 2026, true,
    8.00::numeric, 44.00::numeric, 6,
    8.00::numeric, 1.50::numeric, 2.00::numeric, 2.00::numeric,
    30, 5.00::numeric, 10.00::numeric,
    0::numeric, 0::numeric, 0::numeric, 0::numeric,
    '[]'::jsonb,
    'PLACEHOLDER labor rules. Verify Mintrabajo. Fiscal columns deprecated.'
  )
) AS v(
  country_code, year, is_active,
  legal_daily_hours, legal_weekly_hours, legal_weekly_days,
  overtime_threshold_hours, overtime_diurno_rate, overtime_nocturno_rate, overtime_feriado_rate,
  mandatory_break_minutes, break_required_after_hours, minimum_rest_between_shifts_hours,
  minimum_wage, ihss_ceiling, ihss_employee_rate, rap_rate,
  holidays, notes
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.labor_laws l WHERE l.country_code = v.country_code AND l.year = v.year
);

-- 5) is_holiday_date: use company country_code
CREATE OR REPLACE FUNCTION public.is_holiday_date(
  p_date DATE,
  p_company_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_custom_holidays JSONB;
  v_law_holidays JSONB;
  v_country TEXT;
BEGIN
  SELECT custom_holidays INTO v_custom_holidays
  FROM public.company_metadata
  WHERE company_id = p_company_id;

  IF v_custom_holidays IS NOT NULL AND jsonb_array_length(v_custom_holidays) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_custom_holidays) AS h
      WHERE (h->>'date')::DATE = p_date
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  SELECT COALESCE(c.country_code, 'HND') INTO v_country
  FROM public.companies c
  WHERE c.id = p_company_id;

  IF v_country IS NULL THEN
    v_country := 'HND';
  END IF;

  SELECT holidays INTO v_law_holidays
  FROM public.labor_laws
  WHERE country_code = v_country
    AND year = EXTRACT(YEAR FROM p_date)::INTEGER
    AND is_active = TRUE
  ORDER BY year DESC
  LIMIT 1;

  IF v_law_holidays IS NOT NULL AND jsonb_array_length(v_law_holidays) > 0 THEN
    RETURN EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_law_holidays) AS h
      WHERE (h->>'date')::DATE = p_date
    );
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.is_holiday_date(DATE, UUID) IS
  'Holiday check: company_metadata.custom_holidays first, then labor_laws for companies.country_code.';

-- 6) calculate_attendance_hours_batch: labor_laws per record company country
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
  v_emp_record RECORD;
  v_time_segments JSONB;
  v_country TEXT;
  v_company_tz TEXT;
  v_tz TEXT;
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
    SELECT COALESCE(c.country_code, 'HND'), c.timezone
    INTO v_country, v_company_tz
    FROM public.companies c
    WHERE c.id = v_record.company_id;

    IF v_country IS NULL THEN
      v_country := 'HND';
    END IF;

    v_tz := COALESCE(
      NULLIF(TRIM(COALESCE(v_company_tz, '')), ''),
      CASE v_country
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

    v_regular_cap_hours := COALESCE(v_law.legal_daily_hours, 8.00);

    SELECT * INTO v_emp_record FROM public.employees WHERE id = v_record.employee_id;

    IF v_record.lunch_start IS NOT NULL AND v_record.lunch_end IS NOT NULL THEN
      v_lunch_minutes := EXTRACT(EPOCH FROM (v_record.lunch_end - v_record.lunch_start)) / 60.0;
      v_break_minutes := GREATEST(0, v_lunch_minutes)::INTEGER;
    ELSE
      v_break_minutes := COALESCE(
        (SELECT break_duration FROM public.work_schedules WHERE id = v_record.work_schedule_id),
        v_law.mandatory_break_minutes,
        60
      );
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
  'Batch hours: labor_laws por país; IANA desde companies.timezone o fallback por country_code.';

COMMENT ON COLUMN public.labor_laws.minimum_wage IS
  'Deprecated for fiscal authority: use payroll_statutory_params. Kept for legacy / display only.';
COMMENT ON COLUMN public.labor_laws.ihss_ceiling IS
  'Deprecated for fiscal authority: Honduras-only legacy; use payroll_statutory_params.';
COMMENT ON COLUMN public.labor_laws.ihss_employee_rate IS
  'Deprecated for fiscal authority: use payroll_statutory_params.';
COMMENT ON COLUMN public.labor_laws.rap_rate IS
  'Deprecated for fiscal authority: use payroll_statutory_params.';
