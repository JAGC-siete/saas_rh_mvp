-- Fix payroll triggers and functions to use company_id instead of company_uuid
-- This migration corrects the triggers and functions while keeping the table structure intact

-- Fix the snapshot_line_v0 trigger function
CREATE OR REPLACE FUNCTION snapshot_line_v0()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO payroll_snapshots (run_line_id, company_id, version, payload)
  VALUES (NEW.id, NEW.company_id, 0, to_jsonb(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix the apply_payroll_adjustment function parameter name
-- First drop the existing function to avoid return type conflicts
DROP FUNCTION IF EXISTS apply_payroll_adjustment(uuid,uuid,text,numeric,text,uuid);

CREATE OR REPLACE FUNCTION apply_payroll_adjustment(
  p_run_line_id UUID,
  p_company_id UUID,  -- Changed from p_company_uuid
  p_field TEXT,
  p_new_value NUMERIC,
  p_reason TEXT,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_line RECORD;
  v_old_value NUMERIC;
BEGIN
  -- Get the current line data
  SELECT * INTO v_line FROM payroll_run_lines 
  WHERE id = p_run_line_id AND company_id = p_company_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Line not found or access denied');
  END IF;
  
  -- Get old value based on field
  CASE p_field
    WHEN 'hours' THEN v_old_value := v_line.eff_hours;
    WHEN 'bruto' THEN v_old_value := v_line.eff_bruto;
    WHEN 'ihss' THEN v_old_value := v_line.eff_ihss;
    WHEN 'rap' THEN v_old_value := v_line.eff_rap;
    WHEN 'isr' THEN v_old_value := v_line.eff_isr;
    WHEN 'neto' THEN v_old_value := v_line.eff_neto;
    ELSE RETURN jsonb_build_object('error', 'Invalid field');
  END CASE;
  
  -- Insert adjustment record
  INSERT INTO payroll_adjustments (
    run_line_id, company_id, field, old_value, new_value, reason, user_id
  ) VALUES (
    p_run_line_id, p_company_id, p_field, v_old_value, p_new_value, p_reason, p_user_id
  );
  
  -- Update the line with new values
  CASE p_field
    WHEN 'hours' THEN 
      UPDATE payroll_run_lines SET eff_hours = p_new_value, edited = true WHERE id = p_run_line_id;
    WHEN 'bruto' THEN 
      UPDATE payroll_run_lines SET eff_bruto = p_new_value, edited = true WHERE id = p_run_line_id;
    WHEN 'ihss' THEN 
      UPDATE payroll_run_lines SET eff_ihss = p_new_value, edited = true WHERE id = p_run_line_id;
    WHEN 'rap' THEN 
      UPDATE payroll_run_lines SET eff_rap = p_new_value, edited = true WHERE id = p_run_line_id;
    WHEN 'isr' THEN 
      UPDATE payroll_run_lines SET eff_isr = p_new_value, edited = true WHERE id = p_run_line_id;
    WHEN 'neto' THEN 
      UPDATE payroll_run_lines SET eff_neto = p_new_value, edited = true WHERE id = p_run_line_id;
  END CASE;
  
  RETURN jsonb_build_object('success', true, 'old_value', v_old_value, 'new_value', p_new_value);
END;
$$ LANGUAGE plpgsql;

-- Fix constraint name in payroll_run_lines (optional, for consistency)
ALTER TABLE payroll_run_lines DROP CONSTRAINT IF EXISTS payroll_run_lines_company_uuid_fkey;
ALTER TABLE payroll_run_lines ADD CONSTRAINT payroll_run_lines_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
