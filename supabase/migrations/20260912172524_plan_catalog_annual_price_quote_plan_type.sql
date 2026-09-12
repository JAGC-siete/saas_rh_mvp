-- Add-on cost for Enterprise (plan_catalog.annual_price) and quote-driven plan_type helper.

ALTER TABLE public.plan_catalog
  ADD COLUMN IF NOT EXISTS annual_price numeric(12,2);

COMMENT ON COLUMN public.plan_catalog.annual_price IS
  'Costo anual del SKU/add-on (HNL lista). Enterprise usa este valor en cotización.';

CREATE OR REPLACE FUNCTION public.ventas_quote_to_plan_type(p_meta jsonb, p_employees int)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(coalesce(p_meta->>'commercial_plan_type', '')) IN ('enterprise', 'premium', 'basic')
      THEN lower(p_meta->>'commercial_plan_type')
    WHEN coalesce(p_meta->>'include_enterprise', 'false') IN ('true', 't', '1') THEN 'enterprise'
    WHEN coalesce(p_meta->>'include_terminals', 'false') IN ('true', 't', '1') THEN 'premium'
    WHEN coalesce(p_meta->>'complement_biometric', 'false') IN ('true', 't', '1') THEN 'premium'
    WHEN lower(coalesce(p_meta->>'product_kind', '')) = 'regular' THEN 'premium'
    WHEN lower(coalesce(p_meta->>'product_kind', '')) = 'basic' THEN 'basic'
    ELSE public.ventas_employees_to_plan_type(COALESCE(p_employees, 0))
  END;
$$;

COMMENT ON FUNCTION public.ventas_quote_to_plan_type(jsonb, int) IS
  'Resuelve companies.plan_type desde meta de cotización; fallback legado por headcount.';
