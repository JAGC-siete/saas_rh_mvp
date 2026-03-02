-- Migration: Create report_configurations table for metadata-driven reports
-- Date: 2026-03-02
-- Description: Store per-company, per-report-type configuration (branding, columns, custom fields)

CREATE TYPE report_type_enum AS ENUM (
  'attendance', 'payroll', 'employees', 'work_certificate', 'severance'
);

CREATE TABLE report_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_type report_type_enum NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, report_type)
);

CREATE INDEX idx_report_configs_company ON report_configurations(company_id);

ALTER TABLE report_configurations ENABLE ROW LEVEL SECURITY;

-- SELECT: users see their company's configs, super_admin sees all
CREATE POLICY report_config_select_by_company
  ON report_configurations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
    OR company_id IN (
      SELECT up.company_id FROM user_profiles up
      WHERE up.id = auth.uid() AND up.company_id IS NOT NULL
    )
  );

-- INSERT: company_admin, hr_manager, super_admin
CREATE POLICY report_config_admin_insert
  ON report_configurations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role IN ('company_admin', 'hr_manager')
            AND up.company_id = report_configurations.company_id
          )
        )
    )
  );

-- UPDATE: same as insert
CREATE POLICY report_config_admin_update
  ON report_configurations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role IN ('company_admin', 'hr_manager')
            AND up.company_id = report_configurations.company_id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role IN ('company_admin', 'hr_manager')
            AND up.company_id = report_configurations.company_id
          )
        )
    )
  );

-- DELETE: super_admin only
CREATE POLICY report_config_admin_delete
  ON report_configurations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

CREATE TRIGGER report_configurations_updated_at
  BEFORE UPDATE ON report_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE report_configurations IS 'Metadata-driven report config: branding, visible columns, custom payroll fields per company and report type.';
