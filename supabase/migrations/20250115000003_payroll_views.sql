-- Migration: Payroll Views and Helper Functions
-- Date: 2025-01-15
-- Description: Creates views and helper functions for payroll system

-- Vista de "líneas efectivas" (para PDF y vouchers)
-- Garantiza que lo que imprimes use los valores efectivos, no los calculados
CREATE OR REPLACE VIEW v_payroll_lines_effective AS
SELECT
  l.id as run_line_id,
  l.run_id,
  l.company_uuid,
  l.employee_id,
  l.calc_hours,
  l.calc_bruto,
  l.calc_ihss,
  l.calc_rap,
  l.calc_isr,
  l.calc_neto,
  l.eff_hours,
  l.eff_bruto,
  l.eff_ihss,
  l.eff_rap,
  l.eff_isr,
  l.eff_neto,
  l.edited,
  l.created_at,
  l.updated_at,
  -- Información del empleado (para facilitar queries)
  e.name as employee_name,
  e.employee_code,
  e.department_id,
  -- Información de la corrida
  r.year,
  r.month,
  r.quincena,
  r.tipo,
  r.status as run_status
FROM payroll_run_lines l
JOIN employees e ON l.employee_id = e.id
JOIN payroll_runs r ON l.run_id = r.id;

-- Función helper para crear/actualizar corrida de planilla
CREATE OR REPLACE FUNCTION create_or_update_payroll_run(
  p_company_uuid UUID,
  p_year INT,
  p_month INT,
  p_quincena INT,
  p_tipo TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_run_id UUID;
BEGIN
  -- Buscar corrida existente o crear nueva
  INSERT INTO payroll_runs (company_uuid, year, month, quincena, tipo, status, created_by)
  VALUES (p_company_uuid, p_year, p_month, p_quincena, p_tipo, 'draft', p_user_id)
  ON CONFLICT (company_uuid, year, month, quincena, tipo)
  DO UPDATE SET 
    updated_at = now(),
    status = CASE 
      WHEN payroll_runs.status IN ('draft', 'edited') THEN 'edited'
      ELSE payroll_runs.status
    END
  RETURNING id INTO v_run_id;
  
  RETURN v_run_id;
END;
$$ LANGUAGE plpgsql;

-- Función helper para insertar línea de planilla
CREATE OR REPLACE FUNCTION insert_payroll_line(
  p_run_id UUID,
  p_company_uuid UUID,
  p_employee_id UUID,
  p_calc_hours NUMERIC,
  p_calc_bruto NUMERIC,
  p_calc_ihss NUMERIC,
  p_calc_rap NUMERIC,
  p_calc_isr NUMERIC,
  p_calc_neto NUMERIC
)
RETURNS UUID AS $$
DECLARE
  v_line_id UUID;
BEGIN
  INSERT INTO payroll_run_lines (
    run_id, company_uuid, employee_id,
    calc_hours, calc_bruto, calc_ihss, calc_rap, calc_isr, calc_neto,
    eff_hours, eff_bruto, eff_ihss, eff_rap, eff_isr, eff_neto
  )
  VALUES (
    p_run_id, p_company_uuid, p_employee_id,
    p_calc_hours, p_calc_bruto, p_calc_ihss, p_calc_rap, p_calc_isr, p_calc_neto,
    p_calc_hours, p_calc_bruto, p_calc_ihss, p_calc_rap, p_calc_isr, p_calc_neto
  )
  ON CONFLICT (run_id, employee_id)
  DO UPDATE SET
    calc_hours = EXCLUDED.calc_hours,
    calc_bruto = EXCLUDED.calc_bruto,
    calc_ihss = EXCLUDED.calc_ihss,
    calc_rap = EXCLUDED.calc_rap,
    calc_isr = EXCLUDED.calc_isr,
    calc_neto = EXCLUDED.calc_neto,
    eff_hours = EXCLUDED.calc_hours,
    eff_bruto = EXCLUDED.calc_bruto,
    eff_ihss = EXCLUDED.calc_ihss,
    eff_rap = EXCLUDED.calc_rap,
    eff_isr = EXCLUDED.calc_isr,
    eff_neto = EXCLUDED.calc_neto,
    edited = FALSE,
    updated_at = now()
  RETURNING id INTO v_line_id;
  
  RETURN v_line_id;
END;
$$ LANGUAGE plpgsql;

-- Función helper para aplicar ajuste
CREATE OR REPLACE FUNCTION apply_payroll_adjustment(
  p_run_line_id UUID,
  p_company_uuid UUID,
  p_field TEXT,
  p_new_value NUMERIC,
  p_reason TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_value NUMERIC;
  v_line payroll_run_lines;
BEGIN
  -- Obtener línea actual
  SELECT * INTO v_line FROM payroll_run_lines WHERE id = p_run_line_id AND company_uuid = p_company_uuid;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Obtener valor actual del campo
  CASE p_field
    WHEN 'hours' THEN v_old_value := v_line.eff_hours;
    WHEN 'bruto' THEN v_old_value := v_line.eff_bruto;
    WHEN 'ihss' THEN v_old_value := v_line.eff_ihss;
    WHEN 'rap' THEN v_old_value := v_line.eff_rap;
    WHEN 'isr' THEN v_old_value := v_line.eff_isr;
    WHEN 'neto' THEN v_old_value := v_line.eff_neto;
    ELSE RETURN FALSE;
  END CASE;
  
  -- Insertar ajuste (el trigger se encargará de actualizar eff_*)
  INSERT INTO payroll_adjustments (
    run_line_id, company_uuid, field, old_value, new_value, reason, user_id
  )
  VALUES (
    p_run_line_id, p_company_uuid, p_field, v_old_value, p_new_value, p_reason, p_user_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
