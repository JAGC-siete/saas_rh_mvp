-- 1) employees.address: jsonb → text (UI "Dirección" is free-form, not JSON)
-- 2) Allow multiple active deduction plans per employee+field_key
-- Note: ALTER ... USING cannot contain subqueries; convert via temp column.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS address_text text;

UPDATE public.employees
SET address_text = NULLIF(btrim(address #>> '{}'), '')
WHERE address IS NOT NULL
  AND jsonb_typeof(address) = 'string'
  AND address_text IS NULL;

UPDATE public.employees e
SET address_text = NULLIF(
  (
    SELECT string_agg(btrim(kv.value), ', ' ORDER BY kv.key)
    FROM jsonb_each_text(e.address) AS kv
    WHERE btrim(kv.value) <> ''
  ),
  ''
)
WHERE e.address IS NOT NULL
  AND jsonb_typeof(e.address) = 'object'
  AND e.address_text IS NULL;

UPDATE public.employees
SET address_text = NULLIF(btrim(address::text), '')
WHERE address IS NOT NULL
  AND jsonb_typeof(address) NOT IN ('string', 'object')
  AND address_text IS NULL;

ALTER TABLE public.employees
  DROP COLUMN address;

ALTER TABLE public.employees
  RENAME COLUMN address_text TO address;

COMMENT ON COLUMN public.employees.address IS
  'Free-form employee address (plain text). Formerly jsonb; migrated 2026-08-07.';

-- Drop unique_active_plan so an employee can have several active plans on the same field_key.
DROP INDEX IF EXISTS public.unique_active_plan;

COMMENT ON TABLE public.employee_deduction_plans IS
  'Installment deductions. Multiple active plans per employee+field_key allowed; payroll metadata sums montos and stores _deduction_plan_breakdown.';
