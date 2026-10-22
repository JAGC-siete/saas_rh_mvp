-- New pricing ladder, step 1: data only (no visible change in the quote form).
--
-- Plans (internal key -> public name), unlimited employees:
--   basic      -> Esencial      $49/mo   L 1,300/mo   L 15,600/yr
--   pro        -> Profesional   $129/mo  L 3,500/mo   L 42,000/yr
--   enterprise -> Empresarial   $249/mo  L 6,700/mo   L 80,400/yr
-- Lempira prices include ISV and are rounded; the annual plan is 12 months
-- and includes 1 biometric clock. USD prices are the fixed list for El Salvador.
--
-- plan_catalog.annual_price is NOT touched: the live quote engine still reads it
-- as the Enterprise add-on price (null -> fallback 0). The new columns are only
-- read once the quote engine switches to the ladder (step 2).
--
-- plan_features: Esencial gains 13.º/14.º salary; Profesional gains severance
-- (cesantías) and accounting. Existing basic/premium customers get these
-- modules right away, with no price change.

ALTER TABLE public.plan_catalog
  ADD COLUMN IF NOT EXISTS monthly_price_hnl numeric(12, 2),
  ADD COLUMN IF NOT EXISTS annual_price_hnl numeric(12, 2),
  ADD COLUMN IF NOT EXISTS monthly_price_usd numeric(12, 2),
  ADD COLUMN IF NOT EXISTS annual_price_usd numeric(12, 2),
  ADD COLUMN IF NOT EXISTS included_terminals_annual integer NOT NULL DEFAULT 0;

ALTER TABLE public.plan_catalog
  ADD CONSTRAINT plan_catalog_ladder_prices_non_negative CHECK (
    coalesce(monthly_price_hnl, 0) >= 0
    AND coalesce(annual_price_hnl, 0) >= 0
    AND coalesce(monthly_price_usd, 0) >= 0
    AND coalesce(annual_price_usd, 0) >= 0
    AND included_terminals_annual >= 0
  );

COMMENT ON COLUMN public.plan_catalog.monthly_price_hnl IS 'Ladder price per month in HNL, ISV included.';
COMMENT ON COLUMN public.plan_catalog.annual_price_hnl IS 'Ladder price per year in HNL, ISV included (12 months, no free months).';
COMMENT ON COLUMN public.plan_catalog.monthly_price_usd IS 'Fixed USD list price per month (El Salvador).';
COMMENT ON COLUMN public.plan_catalog.annual_price_usd IS 'Fixed USD list price per year (El Salvador).';
COMMENT ON COLUMN public.plan_catalog.included_terminals_annual IS 'Biometric clocks included in the annual plan; monthly plans include none.';

UPDATE public.plan_catalog AS pc
SET
  name = v.name,
  description = v.description,
  monthly_price_hnl = v.monthly_hnl,
  annual_price_hnl = v.annual_hnl,
  monthly_price_usd = v.monthly_usd,
  annual_price_usd = v.annual_usd,
  included_terminals_annual = 1,
  updated_at = now()
FROM (VALUES
  ('basic', 'Esencial',
   'Planilla, deducciones de ley, 13.º y 14.º salario, asistencia, departamentos y reportes',
   1300.00, 15600.00, 49.00, 588.00),
  ('pro', 'Profesional',
   'Esencial + cesantías y liquidaciones + contabilidad de planilla',
   3500.00, 42000.00, 129.00, 1548.00),
  ('enterprise', 'Empresarial',
   'Profesional + portal de empleados, evaluaciones de desempeño y descriptores de puesto',
   6700.00, 80400.00, 249.00, 2988.00)
) AS v(plan_key, name, description, monthly_hnl, annual_hnl, monthly_usd, annual_usd)
WHERE pc.plan_key = v.plan_key;

INSERT INTO public.plan_features (plan_key, feature_key)
VALUES
  ('basic', 'decimo_13_14'),
  ('pro', 'cesantias'),
  ('pro', 'contabilidad')
ON CONFLICT (plan_key, feature_key) DO NOTHING;
