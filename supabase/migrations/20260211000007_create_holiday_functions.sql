-- Migration: Create holiday helper functions
-- Date: 2026-02-11
-- Description: is_holiday_date checks custom_holidays first, then labor_laws.
-- determine_shift_type identifies diurno/nocturno/mixto for overtime calculation.

-- Function: Check if date is holiday (company custom override or labor_laws)
CREATE OR REPLACE FUNCTION is_holiday_date(
  p_date DATE,
  p_company_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_custom_holidays JSONB;
  v_law_holidays JSONB;
BEGIN
  -- First check company custom holidays (Capa 2)
  SELECT custom_holidays INTO v_custom_holidays
  FROM company_metadata
  WHERE company_id = p_company_id;
  
  IF v_custom_holidays IS NOT NULL AND jsonb_array_length(v_custom_holidays) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_custom_holidays) AS h
      WHERE (h->>'date')::DATE = p_date
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Fallback to labor_laws holidays (Capa 1)
  SELECT holidays INTO v_law_holidays
  FROM labor_laws
  WHERE country_code = 'HND'
    AND year = EXTRACT(YEAR FROM p_date)
    AND is_active = TRUE
  ORDER BY year DESC LIMIT 1;
  
  IF v_law_holidays IS NOT NULL AND jsonb_array_length(v_law_holidays) > 0 THEN
    RETURN EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_law_holidays) AS h
      WHERE (h->>'date')::DATE = p_date
    );
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get expected hours for a date from work_schedule
CREATE OR REPLACE FUNCTION get_expected_hours_for_date(
  p_work_schedule_id UUID,
  p_date DATE
) RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_dow INTEGER;
  v_start TIME;
  v_end TIME;
  v_hours DECIMAL(5,2);
BEGIN
  -- Day of week: 0=Sunday, 1=Monday, ..., 6=Saturday
  v_dow := EXTRACT(DOW FROM p_date)::INTEGER;
  
  SELECT 
    CASE v_dow
      WHEN 0 THEN sunday_start
      WHEN 1 THEN monday_start
      WHEN 2 THEN tuesday_start
      WHEN 3 THEN wednesday_start
      WHEN 4 THEN thursday_start
      WHEN 5 THEN friday_start
      WHEN 6 THEN saturday_start
      ELSE monday_start
    END,
    CASE v_dow
      WHEN 0 THEN sunday_end
      WHEN 1 THEN monday_end
      WHEN 2 THEN tuesday_end
      WHEN 3 THEN wednesday_end
      WHEN 4 THEN thursday_end
      WHEN 5 THEN friday_end
      WHEN 6 THEN saturday_end
      ELSE monday_end
    END
  INTO v_start, v_end
  FROM work_schedules
  WHERE id = p_work_schedule_id;
  
  IF v_start IS NULL OR v_end IS NULL THEN
    RETURN 8.00; -- Default legal daily hours
  END IF;
  
  v_hours := EXTRACT(EPOCH FROM (v_end - v_start)) / 3600.0;
  RETURN GREATEST(0, v_hours);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Determine shift type (diurno, nocturno, mixto) for overtime rate
-- Honduras: Diurno 6h-18h, Nocturno 18h-6h, Mixto crosses both
CREATE OR REPLACE FUNCTION determine_shift_type(
  p_check_in TIMESTAMPTZ,
  p_check_out TIMESTAMPTZ,
  p_tz TEXT DEFAULT 'America/Tegucigalpa'
) RETURNS TEXT AS $$
DECLARE
  v_in_hour INTEGER;
  v_out_hour INTEGER;
BEGIN
  -- Extract hour in Honduras timezone
  v_in_hour := EXTRACT(HOUR FROM p_check_in AT TIME ZONE COALESCE(p_tz, 'America/Tegucigalpa'))::INTEGER;
  v_out_hour := EXTRACT(HOUR FROM p_check_out AT TIME ZONE COALESCE(p_tz, 'America/Tegucigalpa'))::INTEGER;
  
  -- Diurno: 6:00 - 18:00
  -- Nocturno: 18:00 - 6:00
  -- Mixto: crosses both
  IF v_in_hour >= 6 AND v_in_hour < 18 AND v_out_hour >= 6 AND v_out_hour < 18 THEN
    RETURN 'diurno';
  ELSIF (v_in_hour >= 18 OR v_in_hour < 6) AND (v_out_hour >= 18 OR v_out_hour < 6) THEN
    RETURN 'nocturno';
  ELSE
    RETURN 'mixto';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
