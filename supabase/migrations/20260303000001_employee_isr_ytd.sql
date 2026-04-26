-- Migration: Create employee_isr_ytd for ISR annual projection
-- Date: 2026-03-03
-- Description: Stores YTD income and withholdings per employee/year for projected ISR calculation

CREATE TABLE IF NOT EXISTS employee_isr_ytd (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  cumulative_income NUMERIC(14,2) NOT NULL DEFAULT 0,
  cumulative_withheld NUMERIC(14,2) NOT NULL DEFAULT 0,
  medical_expenses_used NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, company_id, year)
);

CREATE INDEX idx_employee_isr_ytd_employee ON employee_isr_ytd(employee_id);
CREATE INDEX idx_employee_isr_ytd_company_year ON employee_isr_ytd(company_id, year);

ALTER TABLE employee_isr_ytd ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_isr_ytd_select
  ON employee_isr_ytd FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY employee_isr_ytd_all
  ON employee_isr_ytd FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

COMMENT ON TABLE employee_isr_ytd IS 'YTD income and ISR withholdings per employee/year for projected annual ISR calculation';
