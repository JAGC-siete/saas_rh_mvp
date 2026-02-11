-- Migration: Extend company_payroll_configs with payment frequency (Capa 2)
-- Date: 2026-02-11
-- Description: Add default payment frequency per company.
-- Resolution: employees.payment_frequency > company_payroll_configs.payment_frequency > labor_laws (mensual)

ALTER TABLE company_payroll_configs ADD COLUMN IF NOT EXISTS
  payment_frequency TEXT CHECK (payment_frequency IS NULL OR payment_frequency IN ('quincenal', 'mensual'));

ALTER TABLE company_payroll_configs ADD COLUMN IF NOT EXISTS
  payment_day INTEGER CHECK (payment_day IS NULL OR (payment_day BETWEEN 1 AND 31));

ALTER TABLE company_payroll_configs ADD COLUMN IF NOT EXISTS
  quincena_config JSONB DEFAULT '{
    "first_start": 1,
    "first_end": 15,
    "second_start": 16,
    "second_end": 30
  }'::jsonb;

COMMENT ON COLUMN company_payroll_configs.payment_frequency IS 'Default payment frequency for company. Overridden by employees.payment_frequency.';
COMMENT ON COLUMN company_payroll_configs.quincena_config IS 'Biweekly cut dates: first_start, first_end, second_start, second_end.';
