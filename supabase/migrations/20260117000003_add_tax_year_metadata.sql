-- Migration: Add tax_year tracking to payroll records
-- Date: 2026-01-17
-- Description: Adds tax_year to metadata fields for audit trail

-- Note: This migration doesn't modify schema, just documents the expected metadata structure
-- The metadata JSONB field already exists in payroll_records and payroll_run_lines

-- Add comment to document expected metadata structure
COMMENT ON COLUMN payroll_records.metadata IS 'JSONB metadata. Expected fields: tax_year (integer) - year of tax brackets used for calculation';

-- For payroll_run_lines, we'll add a direct column for better querying
-- But first check if it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payroll_run_lines' 
    AND column_name = 'tax_year'
  ) THEN
    ALTER TABLE payroll_run_lines ADD COLUMN tax_year INTEGER;
    
    -- Add index for tax_year
    CREATE INDEX idx_payroll_run_lines_tax_year ON payroll_run_lines(tax_year);
    
    -- Add comment
    COMMENT ON COLUMN payroll_run_lines.tax_year IS 'Year of tax brackets used for ISR calculation';
  END IF;
END $$;

