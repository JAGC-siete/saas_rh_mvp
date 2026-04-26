-- Migration: Extend payroll_adjustments to support custom field keys
-- Date: 2026-02-28
-- Description: Relax field CHECK to allow custom deduction keys (e.g. cxc_optica, plan_dental)
--              for historial and automatic snapshots when metadata changes via update-custom-fields

DO $$
DECLARE
  conname text;
BEGIN
  FOR conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'payroll_adjustments'
      AND c.contype = 'c'
      AND c.conname LIKE '%field%'
  LOOP
    EXECUTE format('ALTER TABLE payroll_adjustments DROP CONSTRAINT IF EXISTS %I', conname);
  END LOOP;
END $$;

ALTER TABLE payroll_adjustments
  ADD CONSTRAINT payroll_adjustments_field_check
  CHECK (field ~ '^[a-z0-9_]+$' AND length(field) <= 64);

COMMENT ON CONSTRAINT payroll_adjustments_field_check ON payroll_adjustments IS
  'Allows standard fields (hours, bruto, ihss, rap, isr, neto) and custom field keys (e.g. cxc_optica)';
