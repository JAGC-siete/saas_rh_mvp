-- Migration: Create tax_brackets table for annual ISR table management
-- Date: 2026-01-17
-- Description: Creates table to store progressive tax brackets by year for Honduras

CREATE TABLE IF NOT EXISTS tax_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL UNIQUE,
  country_code TEXT DEFAULT 'HND' NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Constantes fiscales
  minimum_wage DECIMAL(10,2) NOT NULL,
  ihss_ceiling DECIMAL(10,2) NOT NULL,
  ihss_employee_rate DECIMAL(5,4) NOT NULL, -- 0.05 = 5%
  rap_rate DECIMAL(5,4) NOT NULL, -- 0.015 = 1.5%
  
  -- Tabla progresiva ISR (JSONB array)
  -- Structure: [{limit: number, rate: number, base: number, lower: number}]
  isr_brackets JSONB NOT NULL,
  
  -- Metadata
  source TEXT DEFAULT 'official', -- 'official', 'manual', etc.
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_year CHECK (year >= 2000 AND year <= 2100),
  CONSTRAINT valid_ihss_rate CHECK (ihss_employee_rate >= 0 AND ihss_employee_rate <= 1),
  CONSTRAINT valid_rap_rate CHECK (rap_rate >= 0 AND rap_rate <= 1),
  CONSTRAINT valid_brackets CHECK (jsonb_typeof(isr_brackets) = 'array')
);

-- Indexes
CREATE INDEX idx_tax_brackets_year ON tax_brackets(year);
CREATE INDEX idx_tax_brackets_active ON tax_brackets(is_active) WHERE is_active = true;
CREATE INDEX idx_tax_brackets_country ON tax_brackets(country_code);

-- Enable RLS
ALTER TABLE tax_brackets ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read, only super_admin can modify
CREATE POLICY tax_brackets_select_all
  ON tax_brackets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY tax_brackets_insert_super_admin
  ON tax_brackets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY tax_brackets_update_super_admin
  ON tax_brackets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY tax_brackets_delete_super_admin
  ON tax_brackets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_tax_brackets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tax_brackets_updated_at
  BEFORE UPDATE ON tax_brackets
  FOR EACH ROW
  EXECUTE FUNCTION update_tax_brackets_updated_at();

COMMENT ON TABLE tax_brackets IS 'Stores progressive tax brackets (ISR) and fiscal constants by year for Honduras';
COMMENT ON COLUMN tax_brackets.isr_brackets IS 'JSONB array of tax brackets: [{limit, rate, base, lower}]';

