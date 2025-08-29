-- Migration: Payroll Triggers Implementation
-- Date: 2025-01-15
-- Description: Implements essential triggers for payroll adjustments and snapshots

-- A) Mantener eff_* y flag edited cuando se inserta un ajuste
CREATE OR REPLACE FUNCTION apply_adjustment_update_eff()
RETURNS TRIGGER AS $$
DECLARE
  line payroll_run_lines;
  v_hours NUMERIC; v_bruto NUMERIC; v_ihss NUMERIC; v_rap NUMERIC; v_isr NUMERIC; v_neto NUMERIC;
BEGIN
  SELECT * INTO line FROM payroll_run_lines WHERE id = NEW.run_line_id FOR UPDATE;

  -- Leer último override por campo (si hay)
  SELECT COALESCE((
    SELECT new_value FROM payroll_adjustments 
    WHERE run_line_id = line.id AND field='hours' 
    ORDER BY created_at DESC LIMIT 1
  ), line.calc_hours) INTO v_hours;

  SELECT COALESCE((
    SELECT new_value FROM payroll_adjustments 
    WHERE run_line_id = line.id AND field='bruto' 
    ORDER BY created_at DESC LIMIT 1
  ), line.calc_bruto) INTO v_bruto;

  SELECT COALESCE((
    SELECT new_value FROM payroll_adjustments 
    WHERE run_line_id = line.id AND field='ihss' 
    ORDER BY created_at DESC LIMIT 1
  ), line.calc_ihss) INTO v_ihss;

  SELECT COALESCE((
    SELECT new_value FROM payroll_adjustments 
    WHERE run_line_id = line.id AND field='rap' 
    ORDER BY created_at DESC LIMIT 1
  ), line.calc_rap) INTO v_rap;

  SELECT COALESCE((
    SELECT new_value FROM payroll_adjustments 
    WHERE run_line_id = line.id AND field='isr' 
    ORDER BY created_at DESC LIMIT 1
  ), line.calc_isr) INTO v_isr;

  -- neto: si no se overridea explícito, re-calcula como bruto - deducciones
  SELECT COALESCE((
    SELECT new_value FROM payroll_adjustments 
    WHERE run_line_id = line.id AND field='neto' 
    ORDER BY created_at DESC LIMIT 1
  ), v_bruto - v_ihss - v_rap - v_isr) INTO v_neto;

  UPDATE payroll_run_lines
     SET eff_hours = v_hours,
         eff_bruto = v_bruto,
         eff_ihss  = v_ihss,
         eff_rap   = v_rap,
         eff_isr   = v_isr,
         eff_neto  = v_neto,
         edited    = TRUE,
         updated_at = now()
   WHERE id = line.id;

  -- Snapshot versión: incrementa versión
  INSERT INTO payroll_snapshots (run_line_id, company_uuid, version, payload)
  VALUES (
    line.id, line.company_uuid,
    COALESCE((SELECT MAX(version) FROM payroll_snapshots WHERE run_line_id = line.id), -1) + 1,
    to_jsonb(line) || jsonb_build_object(
      'eff_hours', v_hours, 'eff_bruto', v_bruto, 'eff_ihss', v_ihss, 
      'eff_rap', v_rap, 'eff_isr', v_isr, 'eff_neto', v_neto
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- B) Snapshot inicial (versión 0) al crear líneas
CREATE OR REPLACE FUNCTION snapshot_line_v0()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO payroll_snapshots (run_line_id, company_uuid, version, payload)
  VALUES (NEW.id, NEW.company_uuid, 0, to_jsonb(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- C) Auditoría genérica de updates en líneas
CREATE OR REPLACE FUNCTION audit_payroll_lines_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs(company_id, user_id, action, resource_type, resource_id, old_values, new_values)
  VALUES (
    NEW.company_uuid, 
    NULL, -- TODO: obtener user_id del contexto
    TG_OP,
    'payroll_run_lines', 
    NEW.id, 
    to_jsonb(OLD) - 'updated_at', 
    to_jsonb(NEW) - 'updated_at'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
DROP TRIGGER IF EXISTS trg_apply_adjustment_update_eff ON payroll_adjustments;
CREATE TRIGGER trg_apply_adjustment_update_eff
AFTER INSERT ON payroll_adjustments
FOR EACH ROW EXECUTE FUNCTION apply_adjustment_update_eff();

DROP TRIGGER IF EXISTS trg_snapshot_line_v0 ON payroll_run_lines;
CREATE TRIGGER trg_snapshot_line_v0
AFTER INSERT ON payroll_run_lines
FOR EACH ROW EXECUTE FUNCTION snapshot_line_v0();

DROP TRIGGER IF EXISTS trg_audit_prl_update ON payroll_run_lines;
CREATE TRIGGER trg_audit_prl_update
AFTER UPDATE ON payroll_run_lines
FOR EACH ROW EXECUTE FUNCTION audit_payroll_lines_update();
