-- Migration: Add payment_frequency to employees (Capa 2 - Configuración Contractual)
-- Date: 2026-02-11
-- Description: payment_frequency is contractual/administrative, NOT physical.
-- Goes in employees (not work_schedules) - employee can change schedule but keep payment frequency.

ALTER TABLE employees ADD COLUMN IF NOT EXISTS
  payment_frequency TEXT CHECK (payment_frequency IN ('quincenal', 'mensual'));

ALTER TABLE employees ADD COLUMN IF NOT EXISTS
  payment_day INTEGER CHECK (payment_day IS NULL OR (payment_day BETWEEN 1 AND 31));

ALTER TABLE employees ADD COLUMN IF NOT EXISTS
  quincena_config JSONB DEFAULT '{
    "first_start": 1,
    "first_end": 15,
    "second_start": 16,
    "second_end": 30
  }'::jsonb;

COMMENT ON COLUMN employees.payment_frequency IS 'Contractual: quincenal o mensual. NO va en work_schedules (físico).';
COMMENT ON COLUMN employees.quincena_config IS 'Días de corte para pago quincenal. Default: 1-15, 16-30.';
