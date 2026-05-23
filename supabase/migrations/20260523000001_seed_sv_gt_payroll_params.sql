-- SEED DATA FOR EL SALVADOR (SV) AND GUATEMALA (GT) 2026
-- This script ensures the statutory parameters are available for the public calculators.

BEGIN;

-- 1. Labor Laws (General constants and Social Security)
INSERT INTO labor_laws (country_code, year, is_active, minimum_wage, ihss_ceiling, ihss_employee_rate, rap_rate, notes)
VALUES 
('SV', 2026, true, 262.00, 1000.00, 0.0300, 0.0725, 'SV: ihss_employee_rate is ISSS, rap_rate is AFP'),
('GT', 2026, true, 3621.81, 5000.00, 0.0492, 0.0000, 'GT: ihss_employee_rate is IGSS, rap_rate not used');

-- 2. Tax Brackets (ISR Progressive Tables)
-- Structure: [{limit, rate, base, lower}] 
-- Note: Lower/Base are calculated based on the annual exemption

-- EL SALVADOR (SV)
-- Annual Exemption: 4,922.40
-- 0 - 4,922.40: 0%
-- 4,922.41 - 10,000: 10%
-- 10,000.01 - 20,000: 20%
-- 20,000.01+: 25%
INSERT INTO tax_brackets (year, country_code, is_active, minimum_wage, ihss_ceiling, ihss_employee_rate, rap_rate, isr_brackets)
VALUES (
  2026, 
  'SV', 
  true, 
  262.00, 
  1000.00, 
  0.0300, 
  0.0725, 
  '[
    {"limit": 4922.40, "rate": 0.00, "base": 0, "lower": 0},
    {"limit": 10000.00, "rate": 0.10, "base": 0.10, "lower": 4922.40},
    {"limit": 20000.00, "rate": 0.20, "base": 0.20, "lower": 10000.00},
    {"limit": 9999999.99, "rate": 0.25, "base": 0.25, "lower": 20000.00}
  ]'::jsonb
);

-- GUATEMALA (GT)
-- Annual Exemption: 48,000.00
-- 0 - 48,000: 0%
-- 48,000.01 - 150,000: 5%
-- 150,000.01+: 7%
INSERT INTO tax_brackets (year, country_code, is_active, minimum_wage, ihss_ceiling, ihss_employee_rate, rap_rate, isr_brackets)
VALUES (
  2026, 
  'GT', 
  true, 
  3621.81, 
  5000.00, 
  0.0492, 
  0.0000, 
  '[
    {"limit": 48000.00, "rate": 0.00, "base": 0, "lower": 0},
    {"limit": 150000.00, "rate": 0.05, "base": 0.05, "lower": 48000.00},
    {"limit": 9999999.99, "rate": 0.07, "base": 0.07, "lower": 150000.00}
  ]'::jsonb
);

COMMIT;
