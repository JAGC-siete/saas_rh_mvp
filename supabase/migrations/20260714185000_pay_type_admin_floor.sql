-- Third pay / calculation mode: Admin con piso horario (admin_floor).
-- Remote schema uses TEXT + CHECK (not pay_type_enum).

ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_pay_type_check;
ALTER TABLE public.employees
  ADD CONSTRAINT employees_pay_type_check
  CHECK (pay_type IS NULL OR pay_type = ANY (ARRAY['fixed'::text, 'hourly'::text, 'admin_floor'::text]));

ALTER TABLE public.company_payroll_configs
  DROP CONSTRAINT IF EXISTS company_payroll_configs_calculation_mode_check;
ALTER TABLE public.company_payroll_configs
  ADD CONSTRAINT company_payroll_configs_calculation_mode_check
  CHECK (calculation_mode IS NULL OR calculation_mode = ANY (ARRAY['daily'::text, 'hourly'::text, 'admin_floor'::text]));

COMMENT ON COLUMN public.employees.pay_type IS
  'fixed=admin por día; hourly=horas exactas; admin_floor=tarifa horaria con piso=tope ordinario/día; NULL=hereda calculation_mode.';

COMMENT ON COLUMN public.company_payroll_configs.calculation_mode IS
  'Default: daily→fixed, hourly→hourly, admin_floor→admin_floor. Override por employees.pay_type.';

-- If legacy enum still exists in some envs, add value (no-op when type missing).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pay_type_enum') THEN
    ALTER TYPE public.pay_type_enum ADD VALUE IF NOT EXISTS 'admin_floor';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
