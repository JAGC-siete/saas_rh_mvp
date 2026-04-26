-- Migration: Seed tax brackets for year 2025
-- Date: 2026-01-17
-- Description: Inserts the current 2025 tax brackets as initial data

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
  2025,
  'HND',
  true,
  11903.13,
  11903.13,
  0.05,
  0.015,
  '[
    {"limit": 21457.76, "rate": 0.00, "base": 0, "lower": 0},
    {"limit": 30969.88, "rate": 0.15, "base": 0, "lower": 21457.76},
    {"limit": 67604.36, "rate": 0.20, "base": 1428.32, "lower": 30969.88},
    {"limit": 999999999, "rate": 0.25, "base": 8734.32, "lower": 67604.36}
  ]'::jsonb,
  'official',
  'Tabla ISR 2025 Honduras - Valores mensuales derivados de tabla anual SAR'
)
ON CONFLICT (year) DO NOTHING;

