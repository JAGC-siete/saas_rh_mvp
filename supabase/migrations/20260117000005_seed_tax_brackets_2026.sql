-- Migration: Seed tax brackets for year 2026
-- Date: 2026-01-17
-- Description: Inserts the official 2026 tax brackets from SAR/DGI Honduras
-- Source: Tabla Progresiva 2026 - Valores oficiales

INSERT INTO tax_brackets (
  year,
  country_code,
  is_active,
  minimum_wage,
  ihss_ceiling,
  ihss_employee_rate,
  rap_rate,
  isr_brackets,
  source,
  notes
) VALUES (
  2026,
  'HND',
  true,
  14917.20, -- Salario mínimo promedio 2026 (Acuerdo SETRASS-233-2026 / SAR-19-2026)
  11903.13, -- Techo IHSS 2025 vigente; sin ajuste oficial IHSS 2026 al cierre de fuentes
  0.05,     -- 5% IHSS empleado
  0.015,    -- 1.5% RAP
  '[
    {"limit": 22360.36, "rate": 0.00, "base": 0, "lower": 0},
    {"limit": 32346.18, "rate": 0.15, "base": 0, "lower": 22360.36},
    {"limit": 70805.06, "rate": 0.20, "base": 1497.87, "lower": 32346.18},
    {"limit": 999999999, "rate": 0.25, "base": 9189.65, "lower": 70805.06}
  ]'::jsonb,
  'official',
  'Tabla ISR 2026 Honduras - Valores oficiales mensuales derivados de tabla anual SAR. Exento hasta L. 22,360.36'
)
ON CONFLICT (year) DO UPDATE SET
  isr_brackets = EXCLUDED.isr_brackets,
  source = EXCLUDED.source,
  notes = EXCLUDED.notes,
  updated_at = NOW();

