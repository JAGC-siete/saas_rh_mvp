-- Migration: Create labor_laws table (Capa 1 - Valores Legales por Defecto)
-- Date: 2026-02-11
-- Description: Centralized table for legal default values per country/year.
-- Used when company has no custom configuration.

CREATE TABLE IF NOT EXISTS labor_laws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'HND',
  year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Jornada laboral
  legal_daily_hours DECIMAL(4,2) DEFAULT 8.00,
  legal_weekly_hours DECIMAL(4,2) DEFAULT 44.00,
  legal_weekly_days INTEGER DEFAULT 6,
  
  -- Horas extraordinarias (Honduras: 25% diurno, 50% nocturno, 75% mixto/feriado)
  overtime_threshold_hours DECIMAL(4,2) DEFAULT 8.00,
  overtime_diurno_rate DECIMAL(3,2) DEFAULT 1.25,   -- +25% diurna
  overtime_nocturno_rate DECIMAL(3,2) DEFAULT 1.50, -- +50% nocturna
  overtime_feriado_rate DECIMAL(3,2) DEFAULT 1.75,  -- +75% feriado/mixto
  
  -- Descansos
  mandatory_break_minutes INTEGER DEFAULT 30,
  break_required_after_hours DECIMAL(4,2) DEFAULT 5.00,
  minimum_rest_between_shifts_hours DECIMAL(4,2) DEFAULT 10.00,
  
  -- Valores fiscales (fallback si tax_brackets no tiene el año)
  minimum_wage DECIMAL(10,2) DEFAULT 11903.13,
  ihss_ceiling DECIMAL(10,2) DEFAULT 11903.13,
  ihss_employee_rate DECIMAL(5,4) DEFAULT 0.05,
  rap_rate DECIMAL(5,4) DEFAULT 0.015,
  
  -- Días festivos (JSONB array con metadata)
  -- Formato: [{"date": "2026-01-01", "name": "Año Nuevo", "movable": false}, ...]
  holidays JSONB DEFAULT '[]',
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(country_code, year)
);

-- Indices for lookups
CREATE INDEX IF NOT EXISTS idx_labor_laws_country_year 
  ON labor_laws(country_code, year);
CREATE INDEX IF NOT EXISTS idx_labor_laws_active 
  ON labor_laws(country_code, is_active) WHERE is_active = TRUE;

-- RLS
ALTER TABLE labor_laws ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read labor laws (public reference data)
CREATE POLICY labor_laws_select_all
  ON labor_laws
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Only super_admin can modify
CREATE POLICY labor_laws_admin_all
  ON labor_laws
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER labor_laws_updated_at
  BEFORE UPDATE ON labor_laws
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE labor_laws IS 'Capa 1: Valores legales por defecto. Usado cuando empresa no tiene configuracion.';
