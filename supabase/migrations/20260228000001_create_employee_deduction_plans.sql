-- Migration: Create employee_deduction_plans table for tracking installment deductions
-- Date: 2026-02-28
-- Description: Supports custom deduction fields with plazos (installments) tracking.
--              Used for CXC Óptica, Plan Dental, Uniformes, etc.

CREATE TABLE IF NOT EXISTS employee_deduction_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  monto_total DECIMAL(12,2) NOT NULL,
  plazos_totales INTEGER NOT NULL CHECK (plazos_totales > 0),
  plazos_aplicados INTEGER NOT NULL DEFAULT 0 CHECK (plazos_aplicados >= 0),
  monto_por_plazo DECIMAL(12,2) GENERATED ALWAYS AS (monto_total / plazos_totales) STORED,
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique index: only one active plan per employee+company+field
CREATE UNIQUE INDEX unique_active_plan
  ON employee_deduction_plans (employee_id, company_id, field_key)
  WHERE activo = true;

CREATE INDEX idx_edp_employee_company ON employee_deduction_plans(employee_id, company_id);
CREATE INDEX idx_edp_active ON employee_deduction_plans(activo) WHERE activo = true;

-- Enable RLS
ALTER TABLE employee_deduction_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies (pattern from company_payroll_configs - super_admin bypass)
CREATE POLICY edp_select ON employee_deduction_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin')
    OR company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
  );

CREATE POLICY edp_insert ON employee_deduction_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin')
    OR company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
  );

CREATE POLICY edp_update ON employee_deduction_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin')
    OR company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
  );

CREATE POLICY edp_delete ON employee_deduction_plans
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin')
    OR company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
  );

COMMENT ON TABLE employee_deduction_plans IS 'Tracks installment-based deductions (e.g. CXC Óptica, Plan Dental). plazos_aplicados increments on payroll authorize.';
