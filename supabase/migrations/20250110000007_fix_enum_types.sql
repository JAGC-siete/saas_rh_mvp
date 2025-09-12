-- Fix ENUM types for payroll status and other constraints
-- Replace CHECK constraints with proper ENUM types

-- Create proper ENUM types
CREATE TYPE payroll_status AS ENUM ('draft', 'edited', 'authorized', 'distributed');
CREATE TYPE payroll_type AS ENUM ('CON', 'SIN');
CREATE TYPE pay_cycle AS ENUM ('quincena');
CREATE TYPE ihss_regime AS ENUM ('EM', 'IVM', 'COMBINED');

-- Update payroll_runs table to use ENUM
ALTER TABLE payroll_runs 
  ALTER COLUMN status TYPE payroll_status USING status::payroll_status,
  ALTER COLUMN tipo TYPE payroll_type USING tipo::payroll_type;

-- Add constraints to ensure NOT NULL
ALTER TABLE payroll_runs 
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN tipo SET NOT NULL;

-- Update ihss_rules table to use ENUM
ALTER TABLE ihss_rules 
  ALTER COLUMN regime TYPE ihss_regime USING regime::ihss_regime;

-- Add proper constraints
ALTER TABLE ihss_rules 
  ALTER COLUMN regime SET NOT NULL;

-- Create indexes on ENUM columns for performance
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tipo ON payroll_runs(tipo);
CREATE INDEX IF NOT EXISTS idx_ihss_rules_regime ON ihss_rules(regime);

-- Update functions to use ENUM types
CREATE OR REPLACE FUNCTION get_payroll_run_status(p_run_id UUID) 
RETURNS payroll_status AS $$
BEGIN
  RETURN (SELECT status FROM payroll_runs WHERE id = p_run_id);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON TYPE payroll_status TO authenticated;
GRANT USAGE ON TYPE payroll_type TO authenticated;
GRANT USAGE ON TYPE pay_cycle TO authenticated;
GRANT USAGE ON TYPE ihss_regime TO authenticated;

-- Add comments for documentation
COMMENT ON TYPE payroll_status IS 'Valid payroll run statuses: draft -> edited -> authorized -> distributed';
COMMENT ON TYPE payroll_type IS 'Payroll calculation type: CON (with deductions) or SIN (without deductions)';
COMMENT ON TYPE pay_cycle IS 'Payment cycle type: quincena (biweekly)';
COMMENT ON TYPE ihss_regime IS 'IHSS regime types: EM (Enfermedad y Maternidad), IVM (Invalidez, Vejez y Muerte), COMBINED';
