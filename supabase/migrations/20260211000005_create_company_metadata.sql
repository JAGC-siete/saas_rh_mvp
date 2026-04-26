-- Migration: Create company_metadata table (Capa 2 - Solo módulos sin tabla dedicada)
-- Date: 2026-02-11
-- Description: Metadata for modules without dedicated tables.
-- Rule: If data is vital for calculation or filters, use real column - NOT JSONB.
-- custom_holidays allows company to override labor_laws.holidays.

CREATE TABLE IF NOT EXISTS company_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Only metadata NOT used for filters/reports (preferences, UI flags)
  employees_metadata JSONB DEFAULT '{}',
  attendance_metadata JSONB DEFAULT '{}',
  schedules_metadata JSONB DEFAULT '{}',
  -- NO payroll_metadata (use company_payroll_configs)
  
  -- Feriados personalizados por empresa (sobrescribe labor_laws)
  -- Format: [{"date": "2026-01-01", "name": "Año Nuevo", "is_working": false, "pay_double": true}]
  custom_holidays JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_metadata_company 
  ON company_metadata(company_id);

ALTER TABLE company_metadata ENABLE ROW LEVEL SECURITY;

-- Policy: Users see their company's metadata
CREATE POLICY company_metadata_select_by_company
  ON company_metadata
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Policy: Company admins and super_admin can manage (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY company_metadata_manage_by_admin
  ON company_metadata
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager')
    )
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager')
    )
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE TRIGGER company_metadata_updated_at
  BEFORE UPDATE ON company_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE company_metadata IS 'Capa 2: Metadata for modules without dedicated tables. NO payroll_metadata.';
COMMENT ON COLUMN company_metadata.custom_holidays IS 'Overrides labor_laws.holidays. Companies can work holidays, pay double, etc.';
