-- Migration: Extend CHECK constraints for payment_frequency to include 'semanal'
-- Date: 2026-02-24
-- Description: For DBs that ran migrations before semanal was added, ADD COLUMN IF NOT EXISTS
--   skips and leaves the old CHECK. This migration explicitly drops and recreates constraints.
-- Note: pay_type uses ENUM pay_type_enum ('fixed','hourly') - hourly already valid.

-- employees.payment_frequency: allow 'semanal' and NULL (default empresa)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'employees' AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%payment_frequency%'
  LOOP
    EXECUTE format('ALTER TABLE employees DROP CONSTRAINT %I', r.conname);
  END LOOP;
  ALTER TABLE employees ADD CONSTRAINT employees_payment_frequency_check
    CHECK (payment_frequency IS NULL OR payment_frequency IN ('quincenal', 'mensual', 'semanal'));
EXCEPTION
  WHEN duplicate_object THEN NULL; -- Constraint ya existe (ej. migración re-ejecutada)
END $$;

-- company_payroll_configs.payment_frequency: allow 'semanal'
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'company_payroll_configs' AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%payment_frequency%'
  LOOP
    EXECUTE format('ALTER TABLE company_payroll_configs DROP CONSTRAINT %I', r.conname);
  END LOOP;
  ALTER TABLE company_payroll_configs ADD CONSTRAINT company_payroll_configs_payment_frequency_check
    CHECK (payment_frequency IS NULL OR payment_frequency IN ('quincenal', 'mensual', 'semanal'));
EXCEPTION
  WHEN duplicate_object THEN NULL; -- Constraint ya existe (ej. migración re-ejecutada)
END $$;
