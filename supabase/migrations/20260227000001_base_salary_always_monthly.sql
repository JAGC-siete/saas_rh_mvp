-- Migration: base_salary always monthly (factor 240)
-- Convierte empleados hourly con base_salary almacenado como tarifa horaria a salario mensual.
-- Factor 240 = mes comercial Honduras (30 días × 8h).

-- 1. Identificación previa (ejecutar manualmente antes del UPDATE para validación):
-- SELECT id, name, base_salary, pay_type FROM employees WHERE pay_type = 'hourly' AND base_salary < 2000;

-- 2. Conversión: tarifa horaria → salario mensual
UPDATE employees
SET
  base_salary = base_salary * 240,
  metadata = jsonb_set(COALESCE(metadata, '{}'), '{salary_migration_2026}', '"Converted hourly rate to monthly base (factor 240)"')
WHERE pay_type = 'hourly' AND base_salary < 2000;

-- 3. Columna generada para tarifa horaria de referencia
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS hourly_rate_reference numeric(10, 2)
GENERATED ALWAYS AS (base_salary / 240.0) STORED;

-- 4. Comentario en columna
COMMENT ON COLUMN public.employees.base_salary IS 'Salario base mensual (HNL). Siempre mensual para fixed y hourly. Para hourly, tarifa = base_salary/240.';
