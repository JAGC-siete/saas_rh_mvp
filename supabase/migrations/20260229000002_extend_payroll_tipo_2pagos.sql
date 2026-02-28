-- Migration: Extend payroll_runs.tipo to allow '2PAGOS' (Deducción en dos pagos)
-- Deducción en dos pagos: IHSS, RAP, ISR calculados sobre salario mensual, divididos por 2

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE conrelid = 'payroll_runs'::regclass AND contype = 'c'
  AND pg_get_constraintdef(oid) LIKE '%tipo%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE payroll_runs DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE payroll_runs ADD CONSTRAINT payroll_runs_tipo_check
  CHECK (tipo = ANY (ARRAY['CON'::text, 'SIN'::text, '2PAGOS'::text]));

COMMENT ON COLUMN payroll_runs.tipo IS 'CON=con deducciones, SIN=sin deducciones, 2PAGOS=mitad deducciones (repartidas en 2 pagos)';
