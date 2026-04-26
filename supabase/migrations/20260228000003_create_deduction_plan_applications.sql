-- Migration: Create deduction_plan_applications table for plan-run traceability
-- Date: 2026-02-28
-- Description: Records each application of a deduction plan installment to a payroll line.
--              Enables queries like "which payroll runs applied plan X?" or "which plans were applied in run Y?"

CREATE TABLE IF NOT EXISTS deduction_plan_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deduction_plan_id UUID NOT NULL REFERENCES employee_deduction_plans(id) ON DELETE CASCADE,
  run_line_id UUID NOT NULL REFERENCES payroll_run_lines(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plazo_numero INTEGER NOT NULL,
  monto_aplicado DECIMAL(12,2) NOT NULL,
  run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deduction_plan_id, plazo_numero)
);

CREATE INDEX idx_dpa_run_id ON deduction_plan_applications(run_id);
CREATE INDEX idx_dpa_deduction_plan ON deduction_plan_applications(deduction_plan_id);
CREATE INDEX idx_dpa_company_run ON deduction_plan_applications(company_id, run_id);

ALTER TABLE deduction_plan_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY dpa_select ON deduction_plan_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin')
    OR company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
  );

CREATE POLICY dpa_insert ON deduction_plan_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin')
    OR company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
  );

COMMENT ON TABLE deduction_plan_applications IS 'Tracks which payroll run_line applied each installment of a deduction plan.';
