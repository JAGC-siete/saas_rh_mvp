-- Migration: Create helper functions for 3-layer config resolution
-- Date: 2026-02-11
-- Description: get_labor_law_value, resolve_payment_frequency

-- Function: Get a single labor law value for a year
CREATE OR REPLACE FUNCTION get_labor_law_value(
  p_year INTEGER,
  p_field_name TEXT,
  p_country_code TEXT DEFAULT 'HND'
)
RETURNS NUMERIC AS $$
DECLARE
  v_row labor_laws%ROWTYPE;
  v_value NUMERIC;
BEGIN
  SELECT * INTO v_row FROM labor_laws 
  WHERE country_code = p_country_code 
    AND year = p_year 
    AND is_active = TRUE
  ORDER BY year DESC LIMIT 1;
  
  IF v_row IS NULL THEN
    -- Fallback to most recent year
    SELECT * INTO v_row FROM labor_laws 
    WHERE country_code = p_country_code 
      AND is_active = TRUE
    ORDER BY year DESC LIMIT 1;
  END IF;
  
  IF v_row IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_value := CASE p_field_name
    WHEN 'legal_daily_hours' THEN v_row.legal_daily_hours
    WHEN 'legal_weekly_hours' THEN v_row.legal_weekly_hours
    WHEN 'overtime_threshold_hours' THEN v_row.overtime_threshold_hours
    WHEN 'overtime_diurno_rate' THEN v_row.overtime_diurno_rate
    WHEN 'overtime_nocturno_rate' THEN v_row.overtime_nocturno_rate
    WHEN 'overtime_feriado_rate' THEN v_row.overtime_feriado_rate
    WHEN 'mandatory_break_minutes' THEN v_row.mandatory_break_minutes
    WHEN 'minimum_wage' THEN v_row.minimum_wage
    WHEN 'ihss_ceiling' THEN v_row.ihss_ceiling
    WHEN 'ihss_employee_rate' THEN v_row.ihss_employee_rate
    WHEN 'rap_rate' THEN v_row.rap_rate
    ELSE NULL
  END;
  
  RETURN v_value;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Resolve payment frequency for employee (Capa 2 -> Capa 1)
-- Order: employees.payment_frequency > company_payroll_configs.payment_frequency > 'mensual'
-- Supported values: 'quincenal', 'mensual', 'semanal'
CREATE OR REPLACE FUNCTION resolve_payment_frequency(
  p_employee_id UUID,
  p_company_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_emp_freq TEXT;
  v_company_freq TEXT;
BEGIN
  SELECT payment_frequency INTO v_emp_freq
  FROM employees
  WHERE id = p_employee_id;
  
  IF v_emp_freq IS NOT NULL AND v_emp_freq != '' THEN
    RETURN v_emp_freq;
  END IF;
  
  SELECT payment_frequency INTO v_company_freq
  FROM company_payroll_configs
  WHERE company_id = p_company_id AND is_active = TRUE;
  
  IF v_company_freq IS NOT NULL AND v_company_freq != '' THEN
    RETURN v_company_freq;
  END IF;
  
  RETURN 'mensual'; -- Capa 1 default
END;
$$ LANGUAGE plpgsql STABLE;
