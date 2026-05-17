-- pay_type NULL = inherit company calculation_mode (daily→fixed, hourly→hourly)
-- pay_overtime in metadata defaults true for existing companies (no regression for hourly HE pay)

ALTER TABLE public.employees
  ALTER COLUMN pay_type DROP NOT NULL;

ALTER TABLE public.employees
  ALTER COLUMN pay_type DROP DEFAULT;

COMMENT ON COLUMN public.employees.pay_type IS
  'NULL = hereda calculation_mode de company_payroll_configs (daily→fixed, hourly→hourly).';

UPDATE public.company_payroll_configs
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"pay_overtime": true}'::jsonb
WHERE metadata->>'pay_overtime' IS NULL;
