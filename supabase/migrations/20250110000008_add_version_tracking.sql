-- Add version tracking for ETag/If-Match support
-- Enables proper concurrency control and optimistic locking

-- Add version column to payroll_runs
ALTER TABLE payroll_runs 
ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Add updated_by and updated_at tracking
ALTER TABLE payroll_runs 
ADD COLUMN updated_by UUID REFERENCES auth.users(id),
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- Create function to increment version on update
CREATE OR REPLACE FUNCTION increment_payroll_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for version increment
CREATE TRIGGER payroll_runs_version_trigger
  BEFORE UPDATE ON payroll_runs
  FOR EACH ROW
  EXECUTE FUNCTION increment_payroll_version();

-- Add function to get current ETag for a payroll run
CREATE OR REPLACE FUNCTION get_payroll_etag(p_run_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT '"' || encode(digest(id::text || version::text || updated_at::text, 'sha256'), 'hex') || '"'
    FROM payroll_runs 
    WHERE id = p_run_id
  );
END;
$$ LANGUAGE plpgsql;

-- Add function to validate ETag
CREATE OR REPLACE FUNCTION validate_payroll_etag(p_run_id UUID, p_etag TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT get_payroll_etag(p_run_id) = p_etag
  );
END;
$$ LANGUAGE plpgsql;

-- Create index on version for performance
CREATE INDEX IF NOT EXISTS idx_payroll_runs_version ON payroll_runs(version);

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_payroll_etag TO authenticated;
GRANT EXECUTE ON FUNCTION validate_payroll_etag TO authenticated;

-- Add comments
COMMENT ON COLUMN payroll_runs.version IS 'Version number for optimistic locking and ETag generation';
COMMENT ON FUNCTION get_payroll_etag IS 'Generates ETag based on run ID, version, and updated timestamp';
COMMENT ON FUNCTION validate_payroll_etag IS 'Validates ETag against current version to prevent lost updates';
